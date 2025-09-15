import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DepartmentColumn } from '../equipment/DepartmentColumn';
import { DestinationArea } from '../destination/DestinationArea';
import { ConstructionWarehouse } from '../warehouse/ConstructionWarehouse';
import { departments as initialDepartments, transport as initialTransport, destinations as initialDestinations } from '@/data/mockData';
import { Department, Transport, Destination, Equipment } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  projectId: string;
  reverseFlow?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ projectId, reverseFlow = false }) => {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [transport, setTransport] = useState<Transport>(initialTransport);
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  
  const { user } = useAuth();

  // Helper function to remove equipment from all possible locations
  const removeEquipmentFromAll = (equipmentId: string) => {
    // Remove from departments
    setDepartments(prev => prev.map(dept => ({
      ...dept,
      equipment: dept.equipment.filter(eq => eq.id !== equipmentId)
    })));

    // Remove from transport
    setTransport(prev => ({
      ...prev,
      equipment: prev.equipment.filter(eq => eq.id !== equipmentId)
    }));

    // Remove from destinations
    setDestinations(prev => prev.map(dest => ({
      ...dest,
      equipment: dest.equipment.filter(eq => eq.id !== equipmentId)
    })));
  };

  const handleAddToTransport = (equipment: Equipment) => {
    if (transport.equipment.length >= transport.capacity) {
      toast({
        title: "Błąd",
        description: "Transport jest pełny!",
        variant: "destructive"
      });
      return;
    }

    // Remove from all possible locations
    removeEquipmentFromAll(equipment.id);

    // Add to transport with loading status
    setTransport(prev => ({
      ...prev,
      equipment: [...prev.equipment, { ...equipment, status: 'loading' as const }]
    }));

    toast({
      title: "Sukces",
      description: `${equipment.name} dodano do transportu`,
    });
  };

  const handleMoveEquipment = (equipment: Equipment, from: string, to: string) => {
    if (from === 'construction-site' && to === 'transport') {
      handleAddToTransport(equipment);
    }
  };

  const handleAddToDestination = (equipment: Equipment, destinationId: string) => {
    // Remove from all possible locations
    removeEquipmentFromAll(equipment.id);

    // Add to destination with ready status
    setDestinations(prev => prev.map(dest => 
      dest.id === destinationId 
        ? { ...dest, equipment: [...dest.equipment, { ...equipment, status: 'ready' as const }] }
        : dest
    ));

    const destination = destinations.find(d => d.id === destinationId);
    toast({
      title: "Sukces",
      description: `${equipment.name} dostarczono do: ${destination?.name}`,
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="p-6 space-y-6">
        {/* Construction Site Warehouse - Only for reverse flow */}
        {reverseFlow && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              Magazyn Budowy (Sprzęt do Zwrotu)
            </h2>
            <ConstructionWarehouse 
              projectId={projectId}
              canMoveEquipment={!!user}
              onMoveEquipment={handleMoveEquipment}
            />
          </section>
        )}

        {/* Departments Section */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            {reverseFlow ? 'Działy Odbierające Sprzęt' : 'Działy Przygotowujące Sprzęt'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(reverseFlow ? [...departments].reverse() : departments).map((department) => (
              <DepartmentColumn 
                key={department.id} 
                department={department}
                canDragEquipment={!!user}
                reverseFlow={reverseFlow}
                onEquipmentMoved={undefined}
                canManage={!!user}
              />
            ))}
          </div>
        </section>

        {/* Destinations Section */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full" />
            {reverseFlow ? 'Transport do Działu' : 'Miejsca Docelowe'}
          </h2>
          <DestinationArea 
            destinations={destinations}
            onAddToDestination={handleAddToDestination}
            reverseFlow={reverseFlow}
          />
        </section>
      </main>
    </DndProvider>
  );
};