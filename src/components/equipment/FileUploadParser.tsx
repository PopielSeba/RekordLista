import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Upload, FileText, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import * as pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

interface ParsedEquipment {
  name: string;
  confidence: number;
  source: 'excel' | 'pdf-text' | 'pdf-ocr';
}

interface FileUploadParserProps {
  onEquipmentParsed: (equipment: ParsedEquipment[]) => void;
  onClose: () => void;
}

export const FileUploadParser: React.FC<FileUploadParserProps> = ({
  onEquipmentParsed,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedEquipment, setParsedEquipment] = useState<ParsedEquipment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParsedEquipment([]);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = await pdfParse(arrayBuffer);
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Nie udało się odczytać tekstu z PDF');
    }
  };

  const extractTextFromPDFWithOCR = async (file: File): Promise<string> => {
    try {
      setProcessingStep('Przygotowywanie OCR...');
      setProgress(10);

      const worker = await createWorker('pol', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(20 + (m.progress * 60));
          }
        }
      });

      setProcessingStep('Konwertowanie PDF na obrazy...');
      setProgress(30);

      // Convert PDF to images (simplified - in real implementation you'd use pdf2pic or similar)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // This is a simplified approach - for production, use a proper PDF to image converter
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            setProcessingStep('Rozpoznawanie tekstu...');
            setProgress(50);
            
            const { data: { text } } = await worker.recognize(canvas);
            await worker.terminate();
            URL.revokeObjectURL(url);
            resolve(text);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Nie udało się załadować obrazu'));
        img.src = url;
      });
    } catch (error) {
      console.error('Error with OCR:', error);
      throw new Error('Nie udało się rozpoznać tekstu z PDF');
    }
  };

  const parseExcelFile = async (file: File): Promise<ParsedEquipment[]> => {
    try {
      setProcessingStep('Odczytywanie pliku Excel...');
      setProgress(20);

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      setProcessingStep('Analizowanie danych...');
      setProgress(40);

      const equipment: ParsedEquipment[] = [];
      
      // Process all sheets
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Look for equipment names in the data
        jsonData.forEach((row: any[], rowIndex: number) => {
          row.forEach((cell: any, colIndex: number) => {
            if (typeof cell === 'string' && cell.trim()) {
              const trimmedCell = cell.trim();
              // Simple heuristic: look for strings that might be equipment names
              if (trimmedCell.length > 3 && 
                  !trimmedCell.match(/^\d+$/) && // Not just numbers
                  !trimmedCell.match(/^[A-Za-z]\d+$/) && // Not just codes
                  trimmedCell.length < 100) { // Not too long
                equipment.push({
                  name: trimmedCell,
                  confidence: 0.8,
                  source: 'excel'
                });
              }
            }
          });
        });
      });

      setProgress(80);
      return equipment;
    } catch (error) {
      console.error('Error parsing Excel:', error);
      throw new Error('Nie udało się odczytać pliku Excel');
    }
  };

  const extractEquipmentFromText = (text: string, source: 'pdf-text' | 'pdf-ocr'): ParsedEquipment[] => {
    const equipment: ParsedEquipment[] = [];
    
    // Split text into lines and look for potential equipment names
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    lines.forEach(line => {
      // Look for patterns that might indicate equipment names
      const words = line.split(/\s+/);
      
      // Check if line contains equipment-like patterns
      if (words.length >= 1 && words.length <= 5) {
        const potentialName = words.join(' ');
        
        // Filter out common non-equipment words
        const excludeWords = [
          'strona', 'page', 'data', 'date', 'nr', 'no', 'ilość', 'quantity',
          'cena', 'price', 'suma', 'total', 'razem', 'together', 'spis', 'list',
          'nazwa', 'name', 'opis', 'description', 'uwagi', 'notes', 'uwaga', 'note'
        ];
        
        const isExcluded = excludeWords.some(word => 
          potentialName.toLowerCase().includes(word.toLowerCase())
        );
        
        if (!isExcluded && 
            potentialName.length > 3 && 
            potentialName.length < 100 &&
            !potentialName.match(/^\d+$/) &&
            !potentialName.match(/^[A-Za-z]\d+$/) &&
            !potentialName.match(/^\d+[.,]\d+$/) // Not just numbers with decimals
        ) {
          equipment.push({
            name: potentialName,
            confidence: source === 'pdf-text' ? 0.9 : 0.7,
            source
          });
        }
      }
    });
    
    return equipment;
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setParsedEquipment([]);

    try {
      let equipment: ParsedEquipment[] = [];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        equipment = await parseExcelFile(selectedFile);
      } else if (fileExtension === 'pdf') {
        setProcessingStep('Próba odczytu tekstu z PDF...');
        setProgress(10);
        
        try {
          // First try to extract text directly
          const text = await extractTextFromPDF(selectedFile);
          if (text.trim().length > 50) {
            setProcessingStep('Analizowanie tekstu...');
            setProgress(60);
            equipment = extractEquipmentFromText(text, 'pdf-text');
          } else {
            // If no text found, try OCR
            setProcessingStep('Brak tekstu, próba OCR...');
            setProgress(20);
            const ocrText = await extractTextFromPDFWithOCR(selectedFile);
            setProcessingStep('Analizowanie rozpoznanego tekstu...');
            setProgress(70);
            equipment = extractEquipmentFromText(ocrText, 'pdf-ocr');
          }
        } catch (error) {
          // Fallback to OCR if direct text extraction fails
          setProcessingStep('Próba OCR...');
          setProgress(20);
          const ocrText = await extractTextFromPDFWithOCR(selectedFile);
          setProcessingStep('Analizowanie rozpoznanego tekstu...');
          setProgress(70);
          equipment = extractEquipmentFromText(ocrText, 'pdf-ocr');
        }
      } else {
        throw new Error('Nieobsługiwany format pliku. Obsługiwane formaty: Excel (.xlsx, .xls), PDF (.pdf)');
      }

      setProgress(90);
      setProcessingStep('Finalizowanie...');
      
      // Remove duplicates and sort by confidence
      const uniqueEquipment = equipment.reduce((acc, current) => {
        const existing = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
        if (!existing || current.confidence > existing.confidence) {
          return acc.filter(item => item.name.toLowerCase() !== current.name.toLowerCase()).concat(current);
        }
        return acc;
      }, [] as ParsedEquipment[]);

      setParsedEquipment(uniqueEquipment);
      setProgress(100);
      setProcessingStep('Zakończono');

      toast({
        title: "Sukces",
        description: `Znaleziono ${uniqueEquipment.length} potencjalnych artykułów`,
      });

    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się przetworzyć pliku",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (parsedEquipment.length > 0) {
      onEquipmentParsed(parsedEquipment);
      onClose();
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf-text': return <FileText className="h-4 w-4" />;
      case 'pdf-ocr': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'excel': return 'Excel';
      case 'pdf-text': return 'PDF (tekst)';
      case 'pdf-ocr': return 'PDF (OCR)';
      default: return 'Nieznane';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Dodaj sprzęt z pliku
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Wybierz plik</Label>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.pdf"
              onChange={handleFileSelect}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isProcessing}
            />
            <p className="text-sm text-gray-500">
              Obsługiwane formaty: Excel (.xlsx, .xls), PDF (.pdf)
            </p>
          </div>

          {selectedFile && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium">Wybrany plik: {selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                Rozmiar: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{processingStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={processFile}
              disabled={!selectedFile || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Przetwarzanie...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Przetwórz plik
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Anuluj
            </Button>
          </div>
        </CardContent>
      </Card>

      {parsedEquipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Znalezione artykuły ({parsedEquipment.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {parsedEquipment.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    {getSourceIcon(item.source)}
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {getSourceLabel(item.source)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.confidence > 0.8 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={handleConfirm} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Dodaj wybrane artykuły
              </Button>
              <Button variant="outline" onClick={() => setParsedEquipment([])}>
                <XCircle className="h-4 w-4 mr-2" />
                Wyczyść
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
