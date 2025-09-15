import { useState, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { Equipment } from '@/types';
import { EquipmentItem } from '../equipment/EquipmentItem';
import { Construction, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConstructionWarehouseProps {
  projectId: string;
  onMoveEquipment?: (equipment: Equipment, fromWarehouse: string, toWarehouse: string) => void;
  canMoveEquipment?: boolean;
}

export const ConstructionWarehouse = ({ projectId, onMoveEquipment, canMoveEquipment = true }: ConstructionWarehouseProps) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  // Mock data for construction warehouse equipment in reverse flow projects
  useEffect(() => {
    // In a real implementation, this would fetch from Supabase
    // For now, using mock data to show equipment that would be on construction site
    const mockConstructionEquipment: Equipment[] = [
      {
        id: 'construction-eq-1',
        name: 'Generator 100kW (Na budowie)',
        status: 'delivered',
        department_id: 'construction-site',
        accessories: [
          { id: 'construction-acc-1', name: 'Kable zasilające (zużyte)', status: 'delivered', department_id: 'construction-site' },
        ]
      },
      {
        id: 'construction-eq-2',
        name: 'Pompa hydrauliczna (Na budowie)',
        status: 'delivered',
        department_id: 'construction-site',
      },
      {
        id: 'construction-eq-3',
        name: 'Kompressor (Na budowie)',
        status: 'delivered',
        department_id: 'construction-site',
      }
    ];
    setEquipment(mockConstructionEquipment);
  }, [projectId]);

  const handleMoveEquipment = (equipment: Equipment, fromWarehouse: string) => {
    if (onMoveEquipment) {
      onMoveEquipment(equipment, fromWarehouse, 'transport');
      setEquipment(prev => prev.filter(eq => eq.id !== equipment.id));
    }
  };

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'equipment',
    drop: (item: { equipment: Equipment }) => {
      if (onMoveEquipment && item.equipment.status === 'loading') {
        // Equipment coming back from transport to construction site
        const newEquipment = { ...item.equipment, status: 'delivered' as const };
        setEquipment(prev => [...prev, newEquipment]);
        onMoveEquipment(item.equipment, 'transport', 'construction-site');
      }
    },
    canDrop: (item: { equipment: Equipment }) => {
      return canMoveEquipment && item.equipment.status === 'loading';
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
        'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed rounded-lg p-6 min-h-[200px] transition-all duration-200',
        isOver && canDrop && 'border-success bg-success/10',
        isOver && !canDrop && 'border-danger bg-danger/10',
        !isOver && 'border-orange-300'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Construction className="h-6 w-6 text-orange-600" />
          <div>
            <h3 className="text-lg font-semibold text-orange-800">Magazyn Budowy</h3>
            <p className="text-sm text-orange-700">
              Sprzęt znajdujący się na budowie - gotowy do zwrotu
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-orange-800">
            {equipment.length} elementów
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {equipment.map((eq) => (
          <EquipmentItem 
            key={`construction-${eq.id}`} 
            equipment={eq}
            isDraggable={canMoveEquipment}
            showAccessories={false}
          />
        ))}
      </div>

      {equipment.length === 0 && (
        <div className="text-center text-orange-600 py-12 border-2 border-dashed border-orange-300 rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-60" />
          <p>Brak sprzętu na budowie</p>
          <p className="text-sm mt-1">lub cały sprzęt został już zwrócony</p>
        </div>
      )}
    </div>
  );
};