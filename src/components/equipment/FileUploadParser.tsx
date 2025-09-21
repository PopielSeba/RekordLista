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
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText;
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

      // Convert PDF pages to canvas using pdfjs-dist
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        setProcessingStep(`Przetwarzanie strony ${i} z ${pdf.numPages}...`);
        setProgress(30 + (i / pdf.numPages) * 40);
        
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context!,
          viewport: viewport
        }).promise;
        
        setProcessingStep(`Rozpoznawanie tekstu ze strony ${i}...`);
        setProgress(50 + (i / pdf.numPages) * 30);
        
        const { data: { text } } = await worker.recognize(canvas);
        fullText += text + '\n';
      }
      
      await worker.terminate();
      return fullText;
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
        
        if (jsonData.length === 0) return;
        
        // Look for table headers to find the "Nazwa" column
        let nazwaColumnIndex = -1;
        let headerRowIndex = -1;
        
        // Check first few rows for headers
        for (let rowIndex = 0; rowIndex < Math.min(3, jsonData.length); rowIndex++) {
          const row = jsonData[rowIndex] as any[];
          if (!row) continue;
          
          for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cell = row[colIndex];
            if (typeof cell === 'string') {
              const lowerCell = cell.toLowerCase().trim();
              if (['nazwa', 'name', 'artykuł', 'article', 'sprzęt', 'equipment', 'produkt', 'product'].includes(lowerCell)) {
                nazwaColumnIndex = colIndex;
                headerRowIndex = rowIndex;
                break;
              }
            }
          }
          if (nazwaColumnIndex !== -1) break;
        }
        
        // If we found a header row, process data rows
        if (nazwaColumnIndex !== -1 && headerRowIndex !== -1) {
          for (let rowIndex = headerRowIndex + 1; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex] as any[];
            if (!row || row.length <= nazwaColumnIndex) continue;
            
            const cell = row[nazwaColumnIndex];
            if (typeof cell === 'string' && cell.trim()) {
              const trimmedCell = cell.trim();
              
              // Validate that this looks like an equipment name
              if (trimmedCell.length > 3 && 
                  trimmedCell.length < 100 &&
                  !trimmedCell.match(/^\d+$/) && // Not just numbers
                  !trimmedCell.match(/^\d+[.,]\d+$/) && // Not decimal numbers
                  !['lp', 'l.p', 'nazwa', 'name', 'kod', 'code', 'ilość', 'quantity', 'jm', 'jednostka', 'szt', 'sztuki'].includes(trimmedCell.toLowerCase())
              ) {
                // Check if we already have this equipment (avoid duplicates)
                const exists = equipment.some(eq => 
                  eq.name.toLowerCase() === trimmedCell.toLowerCase()
                );
                
                if (!exists) {
                  equipment.push({
                    name: trimmedCell,
                    confidence: 0.9,
                    source: 'excel'
                  });
                }
              }
            }
          }
        } else {
          // Fallback: look for equipment names in all cells
          jsonData.forEach((row: any[], rowIndex: number) => {
            row.forEach((cell: any, colIndex: number) => {
              if (typeof cell === 'string' && cell.trim()) {
                const trimmedCell = cell.trim();
                // Simple heuristic: look for strings that might be equipment names
                if (trimmedCell.length > 3 && 
                    !trimmedCell.match(/^\d+$/) && // Not just numbers
                    !trimmedCell.match(/^[A-Za-z]\d+$/) && // Not just codes
                    !trimmedCell.match(/^\d+[.,]\d+$/) && // Not decimal numbers
                    trimmedCell.length < 100 && // Not too long
                    !['lp', 'l.p', 'nazwa', 'name', 'kod', 'code', 'ilość', 'quantity', 'jm', 'jednostka', 'szt', 'sztuki'].includes(trimmedCell.toLowerCase())
                ) {
                  // Check if we already have this equipment (avoid duplicates)
                  const exists = equipment.some(eq => 
                    eq.name.toLowerCase() === trimmedCell.toLowerCase()
                  );
                  
                  if (!exists) {
                    equipment.push({
                      name: trimmedCell,
                      confidence: 0.7,
                      source: 'excel'
                    });
                  }
                }
              }
            });
          });
        }
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
    
    // Look for table structure patterns
    let inTable = false;
    let tableHeaderFound = false;
    let columnIndex = -1;
    
    // Common table headers in Polish
    const tableHeaders = ['nazwa', 'name', 'artykuł', 'article', 'sprzęt', 'equipment', 'produkt', 'product'];
    const quantityHeaders = ['ilość', 'quantity', 'qty', 'szt', 'sztuki', 'pieces'];
    const codeHeaders = ['kod', 'code', 'nr', 'number', 'id'];
    
    lines.forEach((line, lineIndex) => {
      const lowerLine = line.toLowerCase();
      
      // Check if this line contains table headers
      if (!tableHeaderFound && (
        tableHeaders.some(header => lowerLine.includes(header)) ||
        lowerLine.includes('lp.') || lowerLine.includes('l.p.') ||
        lowerLine.includes('jednostka') || lowerLine.includes('jm')
      )) {
        tableHeaderFound = true;
        inTable = true;
        
        // Try to find the "Nazwa" column index
        const words = line.split(/\s+/);
        const nazwaIndex = words.findIndex(word => 
          ['nazwa', 'name', 'artykuł', 'article', 'sprzęt', 'equipment'].includes(word.toLowerCase())
        );
        if (nazwaIndex !== -1) {
          columnIndex = nazwaIndex;
        }
        return;
      }
      
      // If we're in a table, look for data rows
      if (inTable && tableHeaderFound) {
        // Skip empty lines
        if (line.length < 3) return;
        
        // Check if this looks like a data row (contains numbers and text)
        const words = line.split(/\s+/);
        
        // Look for patterns that suggest this is a table row
        const hasNumber = words.some(word => /^\d+$/.test(word)); // Contains numbers
        const hasText = words.some(word => /[a-zA-Z]/.test(word)); // Contains letters
        const hasCodePattern = words.some(word => /^\d+\.\d+\.\d+\.\d+/.test(word)); // Contains code pattern like 03.07.01.00075
        
        if (hasNumber && hasText && words.length >= 3) {
          // This looks like a table row
          let equipmentName = '';
          
          if (columnIndex !== -1 && words[columnIndex]) {
            // Use the column index we found
            equipmentName = words[columnIndex];
          } else {
            // Try to find equipment name by looking for patterns
            // Equipment names often start with letters and contain numbers
            const potentialNames = words.filter(word => 
              /^[A-Za-z]/.test(word) && // Starts with letter
              word.length > 3 && // Not too short
              !/^\d+$/.test(word) && // Not just numbers
              !/^\d+[.,]\d+$/.test(word) && // Not decimal numbers
              !['szt', 'sztuki', 'pieces', 'ilość', 'quantity'].includes(word.toLowerCase()) // Not quantity units
            );
            
            if (potentialNames.length > 0) {
              // Take the first potential name, or join multiple if they seem related
              equipmentName = potentialNames[0];
              
              // If there are multiple potential names and they seem related, join them
              if (potentialNames.length > 1) {
                const joined = potentialNames.join(' ');
                if (joined.length < 50) { // Reasonable length
                  equipmentName = joined;
                }
              }
            }
          }
          
          // Additional validation for equipment names
          if (equipmentName && 
              equipmentName.length > 3 && 
              equipmentName.length < 100 &&
              !equipmentName.match(/^\d+$/) &&
              !equipmentName.match(/^\d+[.,]\d+$/) &&
              !['lp', 'l.p', 'nazwa', 'name', 'kod', 'code', 'ilość', 'quantity', 'jm', 'jednostka'].includes(equipmentName.toLowerCase())
          ) {
            // Clean up the name (remove extra spaces, etc.)
            const cleanName = equipmentName.trim().replace(/\s+/g, ' ');
            
            // Check if we already have this equipment (avoid duplicates)
            const exists = equipment.some(eq => 
              eq.name.toLowerCase() === cleanName.toLowerCase()
            );
            
            if (!exists) {
              equipment.push({
                name: cleanName,
                confidence: source === 'pdf-text' ? 0.9 : 0.7,
                source
              });
            }
          }
        }
      }
      
      // Reset table detection if we hit an empty line or non-table content
      if (inTable && line.length < 3) {
        inTable = false;
        tableHeaderFound = false;
        columnIndex = -1;
      }
    });
    
    // If we didn't find any equipment using table detection, fall back to the original method
    if (equipment.length === 0) {
      lines.forEach(line => {
        const words = line.split(/\s+/);
        
        if (words.length >= 1 && words.length <= 5) {
          const potentialName = words.join(' ');
          
          const excludeWords = [
            'strona', 'page', 'data', 'date', 'nr', 'no', 'ilość', 'quantity',
            'cena', 'price', 'suma', 'total', 'razem', 'together', 'spis', 'list',
            'nazwa', 'name', 'opis', 'description', 'uwagi', 'notes', 'uwaga', 'note',
            'lp', 'l.p', 'kod', 'code', 'jm', 'jednostka', 'szt', 'sztuki'
          ];
          
          const isExcluded = excludeWords.some(word => 
            potentialName.toLowerCase().includes(word.toLowerCase())
          );
          
          if (!isExcluded && 
              potentialName.length > 3 && 
              potentialName.length < 100 &&
              !potentialName.match(/^\d+$/) &&
              !potentialName.match(/^[A-Za-z]\d+$/) &&
              !potentialName.match(/^\d+[.,]\d+$/)
          ) {
            equipment.push({
              name: potentialName,
              confidence: source === 'pdf-text' ? 0.8 : 0.6,
              source
            });
          }
        }
      });
    }
    
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
