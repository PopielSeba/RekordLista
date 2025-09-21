import { useDrag } from 'react-dnd';
import { ChevronRight, ChevronDown, Package, Circle, Eye, Printer, FileText, Image, File } from 'lucide-react';
import { Equipment } from '@/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FilePreviewModal } from '@/components/ui/file-preview-modal';

interface EquipmentItemProps {
  equipment: Equipment;
  level?: number;
  isDraggable?: boolean;
  onStatusChange?: (equipmentId: string, newStatus: Equipment['status']) => void;
  canChangeStatus?: boolean;
  showAccessories?: boolean; // whether to render accessory list
}

export const EquipmentItem = ({ equipment, level = 0, isDraggable = true, onStatusChange, canChangeStatus = false, showAccessories = true }: EquipmentItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'equipment',
    item: { equipment },
    canDrag: isDraggable && (equipment.status === 'ready' || equipment.status === 'loading' || equipment.status === 'pending') && !equipment.parent_id,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getStatusColor = (status: Equipment['status']) => {
    switch (status) {
      case 'pending': return 'text-black bg-[hsl(var(--equipment-pending))] border-[hsl(var(--equipment-pending))]'; // ŻÓŁTY - w przygotowaniu
      case 'ready': return 'text-white bg-[hsl(var(--equipment-ready))] border-[hsl(var(--equipment-ready))]'; // ZIELONY - gotowy do wysyłki
      case 'loading': return 'text-white bg-[hsl(var(--equipment-coordinated))] border-[hsl(var(--equipment-coordinated))]'; // NIEBIESKI - po koordynacji
      case 'delivered': return 'text-white bg-[hsl(var(--equipment-delivered))] border-[hsl(var(--equipment-delivered))]'; // FIOLETOWY - dostarczony
      default: return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const handleStatusChange = () => {
    if (!onStatusChange) return;
    
    if (equipment.status === 'pending') {
      onStatusChange(equipment.id, 'ready');
    } else if (equipment.status === 'ready') {
      onStatusChange(equipment.id, 'pending');
    }
  };

  const getStatusLabel = (status: Equipment['status']) => {
    switch (status) {
      case 'pending': return 'W przygotowaniu';
      case 'ready': return 'Gotowy do wysyłki';
      case 'loading': return 'Po koordynacji';
      case 'delivered': return 'Dostarczony';
      default: return 'Nieznany';
    }
  };

  const hasAccessories = showAccessories && !equipment.is_custom && !!(equipment.accessories && equipment.accessories.length > 0);
  const hasDescription = !!equipment.custom_description?.trim();
  const hasChildren = hasAccessories || hasDescription;

  const getEquipmentDisplayName = () => {
    if (equipment.is_custom) {
      return equipment.custom_name || 'Nieznany sprzęt';
    }
    return equipment.name || 'Nieznany sprzęt';
  };

  const isFileProduct = () => {
    return equipment.is_custom && equipment.custom_description?.startsWith('data:');
  };

  const getFileIcon = () => {
    if (!isFileProduct()) return <Package className="h-4 w-4 shrink-0" />;
    
    const fileName = equipment.custom_name || '';
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (fileType === 'pdf') return <FileText className="h-4 w-4 shrink-0" />;
    if (['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff'].includes(fileType)) return <Image className="h-4 w-4 shrink-0" />;
    return <File className="h-4 w-4 shrink-0" />;
  };

  const handleViewFile = () => {
    setIsPreviewOpen(true);
  };

  const handlePrintFile = () => {
    setIsPreviewOpen(true);
  };

  const getFileType = () => {
    if (!equipment.custom_name) return 'unknown';
    const extension = equipment.custom_name.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const getFileUrl = () => {
    // Extract base64 data from custom_description if it contains file data
    const description = equipment.custom_description || '';
    if (description.startsWith('data:')) {
      return description;
    }
    // Fallback to placeholder
    return `#${equipment.custom_name}`;
  };

  const getFileData = () => {
    const description = equipment.custom_description || '';
    if (description.startsWith('data:')) {
      // Extract the base64 part after the comma
      const base64Data = description.split(',')[1];
      if (base64Data) {
        try {
          // Convert base64 to File object
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const mimeType = description.split(';')[0].split(':')[1];
          return new File([byteArray], equipment.custom_name || 'file', { type: mimeType });
        } catch (error) {
          console.error('Error converting base64 to file:', error);
        }
      }
    }
    return null;
  };

  return (
    <div className="w-full">
      <div
        ref={isDraggable ? drag : undefined}
        className={cn(
          'flex items-center gap-2 p-3 border-2 rounded-md transition-all duration-200',
          getStatusColor(equipment.status),
          isDragging && 'opacity-50 scale-95',
          (equipment.status === 'ready' || equipment.status === 'loading' || equipment.status === 'pending') && isDraggable && 'hover:scale-105 hover:shadow-lg cursor-move',
          level > 0 && 'ml-6'
        )}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-background/20 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          
          {!hasChildren && level > 0 && (
            <div className="w-5 flex justify-center">
              <div className="w-3 h-3 border-l border-b border-border" />
            </div>
          )}
          
          {getFileIcon()}
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{getEquipmentDisplayName()}</div>
            <div className="text-xs opacity-70 font-medium">{getStatusLabel(equipment.status)}</div>
          </div>

          <div className="flex items-center gap-1">
            {isFileProduct() && (
              <>
                <Button
                  onClick={handleViewFile}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-background/20"
                  title="Podgląd pliku"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handlePrintFile}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-background/20"
                  title="Wydrukuj plik"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </>
            )}

            {canChangeStatus && (equipment.status === 'pending' || equipment.status === 'ready') && (
              <Button
                onClick={handleStatusChange}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-background/20"
                title={equipment.status === 'pending' ? 'Oznacz jako gotowy' : 'Oznacz jako w przygotowaniu'}
              >
                <Circle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Show custom description */}
      {hasDescription && isExpanded && (
        <div className="mt-1 text-[13px] text-foreground/80" style={{ marginLeft: `${(level + 1) * 24 + 8}px` }}>
          • {equipment.custom_description}
        </div>
      )}

      {hasAccessories && isExpanded && (
        <div className="mt-1 space-y-1">
          {equipment.accessories.map((accessory) => (
            <EquipmentItem
              key={accessory.id}
              equipment={accessory}
              level={level + 1}
              isDraggable={isDraggable}
              onStatusChange={onStatusChange}
              canChangeStatus={canChangeStatus}
            />
          ))}
        </div>
      )}

      {/* File Preview Modal */}
      {isFileProduct() && (
        <FilePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          fileName={equipment.custom_name || 'Nieznany plik'}
          fileType={getFileType()}
          fileUrl={getFileUrl()}
          fileData={getFileData()}
        />
      )}
    </div>
  );
};