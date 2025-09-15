import { useDrop } from 'react-dnd';
import { Destination, Equipment } from '@/types';
import { EquipmentItem } from '../equipment/EquipmentItem';
import { MapPin, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DestinationAreaProps {
  destinations: Destination[];
  onAddToDestination: (equipment: Equipment, destinationId: string) => void;
  reverseFlow?: boolean;
}

export const DestinationArea = ({ destinations, onAddToDestination, reverseFlow = false }: DestinationAreaProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {destinations.map((destination) => (
        <DestinationBox 
          key={destination.id} 
          destination={destination}
          onAddEquipment={(equipment) => onAddToDestination(equipment, destination.id)}
        />
      ))}
    </div>
  );
};

interface DestinationBoxProps {
  destination: Destination;
  onAddEquipment: (equipment: Equipment) => void;
}

const DestinationBox = ({ destination, onAddEquipment }: DestinationBoxProps) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'equipment',
    drop: (item: { equipment: Equipment }) => {
      // Akceptuj sprzęt z transportu (status 'loading') lub gotowy sprzęt oraz z magazynu budowy ('delivered' w reverse flow)
      if (item.equipment.status === 'loading' || item.equipment.status === 'ready' || item.equipment.status === 'delivered') {
        onAddEquipment(item.equipment);
      }
    },
    canDrop: (item: { equipment: Equipment }) => {
      return item.equipment.status === 'loading' || item.equipment.status === 'ready' || item.equipment.status === 'delivered';
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
        'bg-card border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-all duration-200',
        isOver && canDrop && 'border-success bg-success/5',
        !isOver && 'border-border'
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-foreground">{destination.name}</h3>
          <p className="text-sm text-muted-foreground">
            {destination.equipment.length} elementów
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {destination.equipment.map((equipment) => (
          <EquipmentItem 
            key={`dest-${equipment.id}`} 
            equipment={equipment}
            isDraggable={true}
          />
        ))}
      </div>

      {destination.equipment.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Przeciągnij sprzęt z transportu</p>
        </div>
      )}
    </div>
  );
};