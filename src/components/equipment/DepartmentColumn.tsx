import { useDrop } from 'react-dnd';
import { Department, Equipment } from '@/types';
import { EquipmentItem } from './EquipmentItem';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentColumnProps {
  department: Department;
  onStatusChange?: (equipmentId: string, newStatus: Equipment['status']) => void;
  canChangeStatus?: boolean;
  canDragEquipment?: boolean;
  reverseFlow?: boolean;
  onEquipmentMoved?: (equipmentId: string, newStatus: string, warehouseId?: string | null, departmentId?: string) => void;
  canManage?: boolean;
}

export const DepartmentColumn = ({ 
  department, 
  onStatusChange, 
  canChangeStatus = false, 
  canDragEquipment = true, 
  reverseFlow = false,
  onEquipmentMoved,
  canManage = false
}: DepartmentColumnProps) => {
  const readyCount = department.equipment.filter(eq => eq.status === 'ready').length;
  const totalCount = department.equipment.length;

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['project_equipment'],
    drop: (item: any) => {
      if (item.projectEquipment && onEquipmentMoved) {
        // Return equipment to department - status becomes 'pending'
        onEquipmentMoved(item.projectEquipment.id, 'pending', null, department.id);
      }
    },
    canDrop: (item: any) => {
      if (!canManage || !onEquipmentMoved) return false;
      
      // Allow returning equipment from coordination (loading) or warehouses (ready/loading)
      if (item.projectEquipment) {
        const allowedStatuses = ['ready', 'loading'];
        return allowedStatuses.includes(item.projectEquipment.status) && 
               item.projectEquipment.department_id === department.id;
      }
      return false;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div 
      ref={drop}
      className={cn(
        "bg-card border border-border rounded-lg p-4 min-h-[400px] flex flex-col transition-all duration-200",
        isOver && canDrop && 'border-warning bg-warning/5',
        isOver && !canDrop && 'border-danger bg-danger/5'
      )}
    >
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
        <Building2 className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-foreground">{department.name}</h3>
          <p className="text-sm text-muted-foreground">
            {readyCount}/{totalCount} gotowe
          </p>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {department.equipment.map((equipment) => (
          <EquipmentItem 
            key={equipment.id} 
            equipment={equipment}
            isDraggable={canDragEquipment}
            onStatusChange={onStatusChange}
            canChangeStatus={canChangeStatus}
          />
        ))}
      </div>
      
      {department.equipment.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          Brak sprzętu w tym dziale
        </div>
      )}
    </div>
  );
};