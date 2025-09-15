import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Construction, Printer, Search as SearchIcon } from 'lucide-react';
import { Equipment, ProjectEquipment } from '@/types';
import { useDrop, useDrag } from 'react-dnd';

interface ConstructionSiteAreaProps {
  onEquipmentMoved: (equipmentId: string, newStatus: string, warehouseId?: string | null) => void;
  equipment: ProjectEquipment[];
  allProjectEquipment?: ProjectEquipment[];
  canManage: boolean;
  projectId: string;
}

const ITEM_TYPES = {
  PROJECT_EQUIPMENT: 'project_equipment',
};

interface DraggableEquipmentItemProps {
  item: ProjectEquipment;
  getEquipmentDisplayName: (eq: ProjectEquipment) => string;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
  updateEquipmentStatus: () => void;
  removeEquipment: () => void;
  allProjectEquipment?: ProjectEquipment[];
  expandedItems?: Set<string>;
  onToggleExpand?: (itemId: string) => void;
}

const DraggableEquipmentItem = ({ 
  item, 
  getEquipmentDisplayName, 
  getStatusLabel, 
  getStatusColor,
  allProjectEquipment = [],
  expandedItems = new Set(),
  onToggleExpand
}: DraggableEquipmentItemProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPES.PROJECT_EQUIPMENT,
    item: { projectEquipment: item },
    canDrag: () => {
      const canDragResult = item.status === 'delivered' && !item.project_parent_id && !item.equipment?.parent_id;
      console.log('DraggableEquipmentItem canDrag:', { item, canDragResult });
      return canDragResult;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Find child equipment (accessories) for this item - prefer project_parent_id link
  // Only derive by equipment hierarchy when the current item has a real equipment id
  const childEquipment = allProjectEquipment.filter(eq => (
    (eq as any).project_parent_id === item.id ||
    (!!item.equipment_id && !eq.project_parent_id && eq.equipment?.parent_id === item.equipment_id)
  ));
  const hasDescription = !!item.custom_description?.trim();
  const hasChildren = childEquipment.length > 0 || hasDescription;
  const isExpanded = expandedItems.has(item.id);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && onToggleExpand) {
      onToggleExpand(item.id);
    }
  };

  return (
    <>
      <div 
        ref={drag}
        className={`flex items-center justify-between px-2 py-1 rounded border-2 transition-all duration-200 cursor-move ${getStatusColor(item.status)} ${
          isDragging ? 'opacity-50 scale-95' : ''
        }`}
      >
        <div className="flex items-center flex-1 min-w-0">
          {hasChildren && (
            <button
              onClick={handleToggleExpand}
              className="p-1 hover:bg-background/20 rounded mr-1"
            >
              <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{getEquipmentDisplayName(item)}</div>
            <div className="text-xs opacity-75">{getStatusLabel(item.status)}</div>
          </div>
        </div>
      </div>
      
      {/* Custom description as simple text */}
      {hasDescription && isExpanded && (
        <div className="mt-1 text-[13px] text-foreground/80" style={{ marginLeft: '12px' }}>
          • {item.custom_description}
        </div>
      )}
      {/* Render child equipment (accessories) */}
      {isExpanded && childEquipment.map((childItem) => (
        <div key={childItem.id} style={{ marginLeft: '12px' }}>
          <DraggableEquipmentItem
            item={childItem}
            getEquipmentDisplayName={getEquipmentDisplayName}
            getStatusLabel={getStatusLabel}
            getStatusColor={getStatusColor}
            updateEquipmentStatus={() => {}}
            removeEquipment={() => {}}
            allProjectEquipment={allProjectEquipment}
            expandedItems={expandedItems}
            onToggleExpand={onToggleExpand}
          />
        </div>
      ))}
    </>
  );
};

export const ConstructionSiteArea = ({ onEquipmentMoved, equipment, allProjectEquipment = [], canManage, projectId }: ConstructionSiteAreaProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Filter equipment based on search query
  const filteredEquipment = equipment.filter(eq => {
    if (!searchQuery.trim()) return true;
    
    const displayName = eq.is_custom 
      ? (eq.custom_name || 'Nieznany sprzęt')
      : (eq.equipment?.name || 'Nieznany sprzęt');
    
    const description = eq.custom_description || '';
    
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           description.toLowerCase().includes(searchQuery.toLowerCase());
  });
  const printConstructionSiteList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getEquipmentDisplayName = (eq: ProjectEquipment) => {
      if (eq.is_custom) {
        return eq.custom_name || 'Nieznany sprzęt';
      }
      return eq.equipment?.name || 'Nieznany sprzęt';
    };

    // Collect main equipment only
    const mainEquipment = equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id);

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista sprzętu na budowie</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .equipment-item { margin: 10px 0; padding: 8px; border: 1px solid #ddd; }
          .accessory { margin-left: 20px; padding: 5px; border-left: 3px solid #ccc; background: #f9f9f9; }
          .status { padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; background: #e9d5ff; color: #6b21a8; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sprzęt na Budowie (Do Zwrotu)</h1>
          <p>Data wydruku: ${new Date().toLocaleString('pl-PL')}</p>
          <p>Liczba elementów: ${mainEquipment.length}</p>
        </div>
        <div class="equipment-list">
    `;

    mainEquipment.forEach(item => {
      htmlContent += `
        <div class="equipment-item">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${getEquipmentDisplayName(item)}</strong>
            <span class="status">Na budowie</span>
          </div>
      `;
      
      // Add description if available
      if (item.custom_description?.trim()) {
        htmlContent += `<div style="margin-left: 15px; margin-top: 5px; font-style: italic; color: #666;">• ${item.custom_description}</div>`;
      }
      
      // Add accessories for this equipment (prefer project_parent_id, fallback to model parent)
      const projectChildren = allProjectEquipment.filter(eq => (eq as any).project_parent_id === item.id);
      const itemAccessories = projectChildren.length > 0
        ? projectChildren
        : allProjectEquipment.filter(eq => !eq.project_parent_id && eq.equipment?.parent_id === item.equipment?.id);
      if (!item.is_custom && itemAccessories.length > 0) {
        htmlContent += `<div style="margin-top: 8px;">`;
        itemAccessories.forEach(accessory => {
          htmlContent += `
            <div class="accessory">
              └ ${getEquipmentDisplayName(accessory)}
              <span class="status">Na budowie</span>
            </div>
          `;
          // Add description for accessories too
          if (accessory.custom_description?.trim()) {
            htmlContent += `<div style="margin-left: 35px; margin-top: 3px; font-style: italic; color: #666; font-size: 11px;">• ${accessory.custom_description}</div>`;
          }
        });
        htmlContent += `</div>`;
      }
      
      htmlContent += `</div>`;
    });

    if (mainEquipment.length === 0) {
      htmlContent += `<div class="equipment-item">Brak sprzętu na budowie</div>`;
    }

    htmlContent += `
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPES.PROJECT_EQUIPMENT,
    drop: (item: any) => {
      console.log('ConstructionSiteArea drop event:', item);
      if (item.projectEquipment) {
        console.log('Moving equipment from ConstructionSiteArea:', { 
          equipmentId: item.projectEquipment.id, 
          currentStatus: item.projectEquipment.status,
          targetStatus: 'delivered'
        });
        // From coordination or warehouses back to construction site
        if (item.projectEquipment.status === 'loading' || item.projectEquipment.status === 'delivered') {
          onEquipmentMoved(item.projectEquipment.id, 'delivered', null);
        }
      }
    },
    canDrop: (item: any) => {
      const canDropResult = item.projectEquipment && (item.projectEquipment.status === 'loading' || item.projectEquipment.status === 'delivered');
      console.log('ConstructionSiteArea canDrop:', { item, canDropResult, canManage });
      // Accept equipment that's loading (from coordination) or delivered (from warehouses) in reverse flow
      return canDropResult;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver() && !!monitor.canDrop(),
    }),
  });

  const getEquipmentDisplayName = (eq: ProjectEquipment) => {
    if (eq.is_custom) {
      return eq.custom_name || 'Nieznany sprzęt';
    }
    return eq.equipment?.name || 'Nieznany sprzęt';
  };

  return (
    <Card 
      ref={drop}
      className={`w-full max-w-2xl mx-auto transition-all duration-200 ${
        isOver ? 'bg-primary/5 border-primary' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Construction className="h-5 w-5 text-orange-600" />
            Magazyn Budowy (Sprzęt do Zwrotu)
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={printConstructionSiteList}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            title="Drukuj listę sprzętu na budowie"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
        {equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            {equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length} elementów do zwrotu
          </div>
        )}
        {/* Search bar */}
        <div className="mt-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Szukaj sprzętu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>
        </div>
        {/* Equipment count */}
        {filteredEquipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length > 0 && (
          <div className="text-sm text-muted-foreground text-center mt-2">
            {searchQuery ? (
              <>
                {filteredEquipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length} z {equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length} elementów
                {searchQuery && <span className="ml-2 text-primary">"{searchQuery}"</span>}
              </>
            ) : (
              `${equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length} elementów do zwrotu`
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {filteredEquipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length > 0 ? (
          <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto">
            {filteredEquipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).slice(0, 15).map((item) => (
              <div key={item.id} className="space-y-1">
                <DraggableEquipmentItem
                  item={item}
                  getEquipmentDisplayName={getEquipmentDisplayName}
                  getStatusLabel={() => 'Na budowie - do zwrotu'}
                  getStatusColor={() => 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-600 shadow-purple-200/50 shadow-lg'}
                  updateEquipmentStatus={() => {}}
                  removeEquipment={() => {}}
                  allProjectEquipment={allProjectEquipment}
                  expandedItems={expandedItems}
                  onToggleExpand={toggleExpanded}
                />
              </div>
            ))}
            {filteredEquipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length > 15 && (
              <div className="text-xs text-muted-foreground text-center col-span-3">
                +{filteredEquipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length - 15} więcej
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            Magazyn sprzętu znajdującego się na budowie<br/>
            <span className="text-xs">Sprzęt gotowy do zwrotu przez Obsługę Budowy</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};