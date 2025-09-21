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
      <Card className="bg-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <Upload className="h-5 w-5 text-gray-300" />
            Dodaj sprzęt z pliku
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-gray-300">Wybierz plik</Label>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-gray-100 file:bg-gray-600 file:text-gray-100 file:border-gray-500"
              disabled={isProcessing}
            />
            <p className="text-sm text-gray-400">
              Obsługiwane formaty: Excel (.xlsx, .xls)
            </p>
          </div>

          {selectedFile && (
            <div className="p-3 bg-gray-700 rounded-md border border-gray-600">
              <p className="text-sm font-medium text-gray-100">Wybrany plik: {selectedFile.name}</p>
              <p className="text-xs text-gray-400">
                Rozmiar: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-300">
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
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-gray-100">Znalezione produkty ({parsedEquipment.length})</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} className="bg-gray-700 text-gray-200 border-gray-500 hover:bg-gray-600">
                  Zaznacz wszystkie
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone} className="bg-gray-700 text-gray-200 border-gray-500 hover:bg-gray-600">
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
                    item.selected ? 'bg-blue-900 border-blue-600' : 'bg-gray-800 border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleEquipmentSelection(index)}
                    className="h-4 w-4 text-blue-400 rounded bg-gray-700 border-gray-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-gray-300">
                        {getSourceIcon(item.source)}
                      </div>
                      <span className="font-medium text-gray-100">{item.name}</span>
                      <Badge variant="outline" className="text-xs bg-gray-700 text-gray-300 border-gray-500">
                        {getSourceLabel(item.source)}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-400">
                      {item.code && (
                        <span>Kod: <strong className="text-gray-200">{item.code}</strong></span>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <span>Ilość: <strong className="text-gray-200">{item.quantity}</strong></span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={item.confidence > 0.8 ? "default" : "secondary"}
                    className="text-xs bg-gray-700 text-gray-300"
                  >
                    {Math.round(item.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button 
                onClick={handleConfirm} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={parsedEquipment.filter(eq => eq.selected).length === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Dodaj wybrane produkty ({parsedEquipment.filter(eq => eq.selected).length})
              </Button>
              <Button variant="outline" onClick={() => setParsedEquipment([])} className="bg-gray-700 text-gray-200 border-gray-500 hover:bg-gray-600">
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
