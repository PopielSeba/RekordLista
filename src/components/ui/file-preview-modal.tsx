import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Printer, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileType: string;
  fileUrl?: string;
  fileData?: File | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileType,
  fileUrl,
  fileData
}) => {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Generate file URL
  const getFileUrl = () => {
    if (fileUrl) return fileUrl;
    if (fileData) return URL.createObjectURL(fileData);
    return '';
  };

  // Load PDF document
  const loadPdf = async (url: string, fileData?: File | null) => {
    try {
      setLoading(true);
      setError('');
      
      let pdfSource;
      if (fileData) {
        // Use File object for PDF.js
        const arrayBuffer = await fileData.arrayBuffer();
        pdfSource = { data: arrayBuffer };
      } else {
        // Use URL
        pdfSource = url;
      }
      
      const pdf = await pdfjsLib.getDocument(pdfSource).promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Nie udało się załadować pliku PDF');
    } finally {
      setLoading(false);
    }
  };

  // Load image
  const loadImage = (url: string) => {
    setImageUrl(url);
    setError('');
  };

  // Render PDF page
  const renderPdfPage = async (pageNum: number) => {
    if (!pdfDocument) return;

    try {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale, rotation });
      
      const canvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering PDF page:', err);
      setError('Nie udało się wyrenderować strony PDF');
    }
  };

  // Handle file loading
  useEffect(() => {
    if (!isOpen) return;

    const url = getFileUrl();
    if (!url) return;

    if (fileType === 'pdf') {
      loadPdf(url, fileData);
    } else if (['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff'].includes(fileType.toLowerCase())) {
      loadImage(url);
    }
  }, [isOpen, fileType, fileUrl, fileData]);

  // Render PDF page when page or scale changes
  useEffect(() => {
    if (pdfDocument && currentPage) {
      renderPdfPage(currentPage);
    }
  }, [pdfDocument, currentPage, scale, rotation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (fileData) {
        URL.revokeObjectURL(getFileUrl());
      }
    };
  }, [fileData]);

  const handlePrint = () => {
    if (fileType === 'pdf') {
      // For PDF, open in new window for printing
      const url = getFileUrl();
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      // For images, create a print-friendly page
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Wydruk: ${fileName}</title>
            <style>
              body { margin: 0; padding: 20px; text-align: center; }
              img { max-width: 100%; height: auto; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h1>${fileName}</h1>
            <img src="${imageUrl}" alt="${fileName}" />
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    const url = getFileUrl();
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Ładowanie pliku...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-red-500">
            <p className="text-lg font-semibold mb-2">Błąd</p>
            <p>{error}</p>
          </div>
        </div>
      );
    }

    if (fileType === 'pdf') {
      return (
        <div className="space-y-4">
          {/* PDF Controls */}
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
              >
                ←
              </Button>
              <span className="text-sm">
                Strona {currentPage} z {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                →
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* PDF Canvas */}
          <div className="flex justify-center">
            <canvas id="pdf-canvas" className="border border-gray-300 shadow-lg"></canvas>
          </div>
        </div>
      );
    }

    if (['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff'].includes(fileType.toLowerCase())) {
      return (
        <div className="space-y-4">
          {/* Image Controls */}
          <div className="flex items-center justify-center space-x-2 bg-gray-100 p-3 rounded-lg">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Image */}
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt={fileName}
              className="max-w-full h-auto border border-gray-300 shadow-lg"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out'
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold mb-2">Nieobsługiwany typ pliku</p>
          <p>Podgląd nie jest dostępny dla plików typu: {fileType}</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate">{fileName}</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Pobierz
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Drukuj
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="overflow-auto max-h-[70vh]">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
