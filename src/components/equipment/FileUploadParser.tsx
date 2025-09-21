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

interface ParsedEquipment {
  name: string;
  code?: string;
  quantity?: number;
  confidence: number;
  source: 'excel';
  selected: boolean;
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
        
        // Look for table headers to find columns
        let nazwaColumnIndex = -1;
        let kodColumnIndex = -1;
        let iloscColumnIndex = -1;
        let headerRowIndex = -1;
        
        // Check first few rows for headers
        for (let rowIndex = 0; rowIndex < Math.min(3, jsonData.length); rowIndex++) {
          const row = jsonData[rowIndex] as any[];
          if (!row) continue;
          
          for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cell = row[colIndex];
            if (typeof cell === 'string') {
              const lowerCell = cell.toLowerCase().trim();
              
              // Find Nazwa column
              if (['nazwa', 'name', 'artykuł', 'article', 'sprzęt', 'equipment', 'produkt', 'product'].includes(lowerCell)) {
                nazwaColumnIndex = colIndex;
                headerRowIndex = rowIndex;
              }
              
              // Find Kod column
              if (['kod', 'code', 'kod sage', 'sage code', 'nr', 'number', 'id'].includes(lowerCell)) {
                kodColumnIndex = colIndex;
                headerRowIndex = rowIndex;
              }
              
              // Find Ilość column
              if (['ilość', 'quantity', 'qty', 'szt', 'sztuki', 'pieces', 'ilość szt'].includes(lowerCell)) {
                iloscColumnIndex = colIndex;
                headerRowIndex = rowIndex;
              }
            }
          }
        }
        
        // If we found a header row, process data rows
        if (headerRowIndex !== -1) {
          for (let rowIndex = headerRowIndex + 1; rowIndex < jsonData.length; rowIndex++) {
            const row = jsonData[rowIndex] as any[];
            if (!row) continue;
            
            // Extract data from each column
            const nazwa = nazwaColumnIndex !== -1 && row[nazwaColumnIndex] ? String(row[nazwaColumnIndex]).trim() : '';
            const kod = kodColumnIndex !== -1 && row[kodColumnIndex] ? String(row[kodColumnIndex]).trim() : '';
            const ilosc = iloscColumnIndex !== -1 && row[iloscColumnIndex] ? 
              (typeof row[iloscColumnIndex] === 'number' ? row[iloscColumnIndex] : 
               parseFloat(String(row[iloscColumnIndex]).replace(',', '.'))) : 1;
            
            // Validate that we have at least a name
            if (nazwa && nazwa.length > 3 && nazwa.length < 100) {
              // Check if we already have this equipment (avoid duplicates)
              const exists = equipment.some(eq => 
                eq.name.toLowerCase() === nazwa.toLowerCase() && 
                (!kod || eq.code === kod)
              );
              
              if (!exists) {
                equipment.push({
                  name: nazwa,
                  code: kod || undefined,
                  quantity: isNaN(ilosc) ? 1 : ilosc,
                  confidence: 0.9,
                  source: 'excel',
                  selected: false
                });
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
                      source: 'excel',
                      selected: false
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


  const processFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);
    setParsedEquipment([]);

    try {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const equipment = await parseExcelFile(selectedFile);
        
        setProgress(90);
        setProcessingStep('Finalizowanie...');
        
        setParsedEquipment(equipment);
        setProgress(100);
        setProcessingStep('Zakończono');

        toast({
          title: "Sukces",
          description: `Znaleziono ${equipment.length} produktów`,
        });
      } else {
        throw new Error('Nieobsługiwany format pliku. Obsługiwane formaty: Excel (.xlsx, .xls)');
      }

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
    const selectedEquipment = parsedEquipment.filter(eq => eq.selected);
    if (selectedEquipment.length > 0) {
      onEquipmentParsed(selectedEquipment);
      onClose();
    } else {
      toast({
        title: "Błąd",
        description: "Wybierz przynajmniej jeden produkt",
        variant: "destructive",
      });
    }
  };

  const toggleEquipmentSelection = (index: number) => {
    setParsedEquipment(prev => 
      prev.map((eq, i) => 
        i === index ? { ...eq, selected: !eq.selected } : eq
      )
    );
  };

  const selectAll = () => {
    setParsedEquipment(prev => 
      prev.map(eq => ({ ...eq, selected: true }))
    );
  };

  const selectNone = () => {
    setParsedEquipment(prev => 
      prev.map(eq => ({ ...eq, selected: false }))
    );
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      default: return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'excel': return 'Excel';
      default: return 'Excel';
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
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isProcessing}
            />
            <p className="text-sm text-gray-500">
              Obsługiwane formaty: Excel (.xlsx, .xls)
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Znalezione produkty ({parsedEquipment.length})
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Zaznacz wszystkie
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Odznacz wszystkie
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {parsedEquipment.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 border rounded-md ${
                    item.selected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleEquipmentSelection(index)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSourceIcon(item.source)}
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {getSourceLabel(item.source)}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      {item.code && (
                        <span>Kod: <strong className="text-gray-800">{item.code}</strong></span>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <span>Ilość: <strong className="text-gray-800">{item.quantity}</strong></span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={item.confidence > 0.8 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {Math.round(item.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button 
                onClick={handleConfirm} 
                className="flex-1"
                disabled={parsedEquipment.filter(eq => eq.selected).length === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Dodaj wybrane produkty ({parsedEquipment.filter(eq => eq.selected).length})
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
