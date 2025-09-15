import { useDrop } from 'react-dnd';
import { Equipment, ProjectEquipment } from '@/types';
import { EquipmentItem } from '../equipment/EquipmentItem';
import { Truck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoordinationCenterProps {
  equipment: ProjectEquipment[];
  onEquipmentMoved: (equipmentId: string, newStatus: string, warehouseId?: string | null) => void;
  canManage: boolean;
  reverseFlow?: boolean;
}

export const CoordinationCenter = ({ equipment, onEquipmentMoved, canManage, reverseFlow = false }: CoordinationCenterProps) => {
  // Build equipment tree structure
  const buildEquipmentTree = (items: ProjectEquipment[]) => {
    // Filter main items: no project_parent_id (for custom) and no equipment parent_id (for standard)
    const mainItems = items.filter(item => 
      !item.project_parent_id && (!item.equipment?.parent_id)
    );
    
    return mainItems.map(mainItem => ({
      ...mainItem.equipment!,
      id: mainItem.id, // Use project_equipment id for dragging
      department_id: mainItem.department_id,
      status: mainItem.status,
      custom_description: mainItem.custom_description, // Preserve custom description
      custom_name: mainItem.custom_name, // Preserve custom name
      is_custom: mainItem.is_custom, // Preserve custom flag
      accessories: items
        .filter(item => {
          // Only include real accessories - items that have a parent relationship
          if (mainItem.is_custom) {
            // For custom equipment, check if project_parent_id matches this item's id
            return item.project_parent_id === mainItem.id;
          } else {
            // For standard equipment, check if equipment parent_id matches this equipment_id
            return item.equipment?.parent_id === mainItem.equipment_id && mainItem.equipment_id;
          }
        })
        .map(acc => ({
          ...acc.equipment!,
          id: acc.id,
          department_id: acc.department_id,
          status: acc.status,
          custom_description: acc.custom_description, // Preserve custom description for accessories
          custom_name: acc.custom_name, // Preserve custom name for accessories
          is_custom: acc.is_custom // Preserve custom flag for accessories
        }))
    }));
  };

  const equipmentTree = buildEquipmentTree(equipment);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['equipment', 'project_equipment'],
    drop: (item: any) => {
      if (item.equipment) {
        // From department equipment
        console.log('Drop from department not implemented for coordination');
      } else if (item.projectEquipment) {
        // From project equipment (warehouses, destination, etc.)
        if (item.projectEquipment.status === 'delivered') {
          // Equipment coming back from destination - set to loading status
          onEquipmentMoved(item.projectEquipment.id, 'loading', null);
        } else {
          onEquipmentMoved(item.projectEquipment.id, 'loading', null);
        }
      }
    },
      canDrop: (item: any) => {
        if (!canManage) return false;
        
        if (item.projectEquipment) {
          const allowedStatuses = reverseFlow ? ['delivered'] : ['ready', 'loading', 'delivered'];
          return allowedStatuses.includes(item.projectEquipment.status);
        }
        return false;
      },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const ITEM_TYPES = {
    PROJECT_EQUIPMENT: 'project_equipment'
  };

  return (
    <div
      ref={drop}
      className={cn(
        'bg-card border-2 border-dashed rounded-lg p-6 min-h-[300px] transition-all duration-200',
        isOver && canDrop && 'border-success bg-success/5',
        isOver && !canDrop && 'border-danger bg-danger/5',
        !isOver && 'border-border'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {reverseFlow ? 'Dział Koordynacji przesyłek' : 'Koordynacja Transportu'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {reverseFlow 
                ? 'Centrum koordynacji transportu i logistyki' 
                : 'Przeciągnij gotowy sprzęt tutaj'
              }
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">
            {equipmentTree.length} elementów
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {equipmentTree.map((eq) => (
          <div key={`coordination-${eq.id}`} className="relative">
            <EquipmentItem 
              equipment={eq}
              isDraggable={canManage}
              showAccessories={false}
            />
          </div>
        ))}
      </div>

      {equipmentTree.length === 0 && (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-muted rounded-lg">
          <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
          {canManage ? (
            <>
              <p>
                {reverseFlow 
                  ? 'Przeciągnij sprzęt z magazynu budowy lub magazynów' 
                  : 'Przeciągnij gotowy sprzęt z działów lub magazynów'
                }
              </p>
              <p className="text-sm mt-1">aby przekazać do koordynacji</p>
            </>
          ) : (
            <>
              <p>Brak uprawnień do zarządzania transportem</p>
              <p className="text-sm mt-1">Skontaktuj się z działem koordynacji przesyłek</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};