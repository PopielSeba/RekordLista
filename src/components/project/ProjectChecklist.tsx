import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, Building2, Truck, MapPin, Trash2, Settings, Circle, ChevronRight, Printer, Search as SearchIcon } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ConstructionSiteArea } from '../warehouse/ConstructionSiteArea';
import { EquipmentItem } from '../equipment/EquipmentItem';
import { Equipment, ProjectEquipment } from '@/types';

interface Department {
  id: string;
  name: string;
}

interface ProjectDepartment {
  id: string;
  department_id: string;
  position_order: number;
  department: Department;
}

interface IntermediateWarehouse {
  id: string;
  name: string;
  type: 'pre_coordination' | 'post_coordination';
  position_order: number;
}

interface ProjectChecklistProps {
  projectId: string;
  reverseFlow?: boolean;
}

const ITEM_TYPES = {
  EQUIPMENT: 'equipment',
  PROJECT_EQUIPMENT: 'project_equipment',
};

interface DepartmentTileProps {
  projectId: string;
  department: Department;
  projectDepartment: ProjectDepartment;
  projectEquipment: ProjectEquipment[];
  allEquipment: Equipment[];
  onRemoveDepartment: (id: string) => void;
  onEquipmentAdded: () => void;
  onEquipmentMoved: (equipmentId: string, newStatus: string, warehouseId?: string | null) => void;
  canManage: boolean;
  canDeleteEquipment?: boolean;
}

interface DraggableEquipmentItemProps {
  item: ProjectEquipment;
  getEquipmentDisplayName: (eq: ProjectEquipment) => string;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
  updateEquipmentStatus: (id: string, newStatus: string) => void;
  removeEquipment: (id: string) => void;
  allProjectEquipment?: ProjectEquipment[];
  level?: number;
  expandedItems?: Set<string>;
  onToggleExpand?: (itemId: string) => void;
  childRenderMode?: 'tiles' | 'none';
  canDeleteEquipment?: boolean;
}

const DraggableEquipmentItem = ({ 
  item, 
  getEquipmentDisplayName, 
  getStatusLabel, 
  getStatusColor, 
  updateEquipmentStatus, 
  removeEquipment, 
  allProjectEquipment = [],
  level = 0,
  expandedItems = new Set(),
  onToggleExpand,
  childRenderMode = 'tiles',
  canDeleteEquipment = false
}: DraggableEquipmentItemProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPES.PROJECT_EQUIPMENT,
    item: { projectEquipment: item },
    canDrag: (item.status === 'pending' || item.status === 'ready' || item.status === 'loading' || item.status === 'delivered') && !item.project_parent_id && !item.equipment?.parent_id,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Find child equipment (accessories) for this item - prefer project_parent_id link
  // Only derive by equipment hierarchy when the current item has a real equipment id
  const childEquipment = allProjectEquipment.filter(eq => (
    (eq as any).project_parent_id === item.id ||
    (!!item.equipment?.id && !eq.project_parent_id && eq.equipment?.parent_id === item.equipment?.id)
  ));
  // For items with description (custom or from list) support a simple textual description shown as a child line
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
        style={{ marginLeft: `${level * 12}px` }}
      >
        <div className="flex items-center flex-1 min-w-0">
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExpand}
              className="h-4 w-4 p-0 mr-1 text-current hover:bg-background/20"
            >
              <ChevronRight className={`h-2 w-2 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{getEquipmentDisplayName(item)}</div>
            <div className="text-xs opacity-75">{getStatusLabel(item.status)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {(item.status === 'pending' || item.status === 'ready' || item.status === 'assigned' || !item.status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateEquipmentStatus(item.id, item.status === 'ready' ? 'pending' : 'ready')}
              className="h-7 w-7 p-0 bg-background/30 hover:bg-background/50 border border-background/50 rounded-md"
              title={item.status === 'ready' ? 'Oznacz jako w przygotowaniu' : 'Oznacz jako gotowy'}
            >
              <Settings className="h-2.5 w-2.5" />
            </Button>
          )}
          {(item.status === 'pending' || item.status === 'ready' || item.status === 'assigned' || !item.status) && canDeleteEquipment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEquipment(item.id)}
              className="h-7 w-7 p-0 bg-background/30 hover:bg-background/50 border border-background/50 rounded-md hover:border-danger/50 transition-colors"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Render custom description as simple text */}
      {hasDescription && isExpanded && (
        <div className="mt-1 text-[13px] text-foreground/80" style={{ marginLeft: `${(level + 1) * 12}px` }}>
          • {item.custom_description}
        </div>
      )}
      {/* Render child equipment (accessories) */}
      {childRenderMode === 'tiles' && isExpanded && childEquipment.map((childItem) => (
        <DraggableEquipmentItem
          key={childItem.id}
          item={childItem}
          getEquipmentDisplayName={getEquipmentDisplayName}
          getStatusLabel={getStatusLabel}
          getStatusColor={getStatusColor}
          updateEquipmentStatus={updateEquipmentStatus}
          removeEquipment={removeEquipment}
          allProjectEquipment={allProjectEquipment}
          level={level + 1}
          expandedItems={expandedItems}
          onToggleExpand={onToggleExpand}
          childRenderMode={childRenderMode}
          canDeleteEquipment={canDeleteEquipment}
        />
      ))}
    </>
  );
};

const DepartmentTile = ({
  projectId,
  department, 
  projectDepartment, 
  projectEquipment,
  allEquipment,
  onRemoveDepartment,
  onEquipmentAdded,
  onEquipmentMoved,
  canManage,
  canDeleteEquipment = false
}: DepartmentTileProps) => {
  const { toast } = useToast();
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedEquipmentDescription, setSelectedEquipmentDescription] = useState('');
  const [customEquipmentName, setCustomEquipmentName] = useState('');
  const [customEquipmentDescription, setCustomEquipmentDescription] = useState('');
  const [equipmentMode, setEquipmentMode] = useState<'existing' | 'custom'>('existing');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [{ isOverDept }, dropDept] = useDrop({
    accept: [ITEM_TYPES.EQUIPMENT, ITEM_TYPES.PROJECT_EQUIPMENT],
    drop: (item: any) => {
      if (item.projectEquipment) {
        // Handle moving back to department area - clear intermediate location
        onEquipmentMoved(item.projectEquipment.id, 'pending', null);
      }
    },
    canDrop: (item: any) => {
      if (!canManage) return false;
      
      // Allow returning equipment from coordination/warehouses back to department
      if (item.projectEquipment) {
        const allowedStatuses = ['ready', 'loading'];
        return allowedStatuses.includes(item.projectEquipment.status) && 
               item.projectEquipment.department_id === department.id;
      }
      return false;
    },
    collect: (monitor) => ({
      isOverDept: !!monitor.isOver() && !!monitor.canDrop(),
    }),
  });

  const addEquipment = async () => {
    try {
      if (equipmentMode === 'existing' && !selectedEquipment) {
        toast({
          title: "Błąd",
          description: "Wybierz sprzęt z listy",
          variant: "destructive",
        });
        return;
      }

      if (equipmentMode === 'custom' && !customEquipmentName.trim()) {
        toast({
          title: "Błąd",
          description: "Podaj nazwę sprzętu",
          variant: "destructive",
        });
        return;
      }

      if (equipmentMode === 'existing') {
        // Add main equipment
        const mainEquipmentData = {
          project_id: projectId,
          department_id: department.id,
          equipment_id: selectedEquipment,
          custom_description: selectedEquipmentDescription.trim() || null,
          quantity: 1,
          is_custom: false,
          status: 'pending'
        };

        const { data: mainEquipmentResult, error: mainError } = await supabase
          .from('project_equipment')
          .insert(mainEquipmentData)
          .select()
          .single();

        if (mainError) {
          toast({
            title: "Błąd",
            description: "Nie udało się dodać sprzętu",
            variant: "destructive",
          });
          return;
        }

        // Log equipment addition
        const selectedEquipmentInfo = allEquipment.find(eq => eq.id === selectedEquipment);
        await supabase.rpc('log_equipment_action', {
          _project_id: projectId,
          _action_type: 'added',
          _equipment_id: selectedEquipment,
          _project_equipment_id: mainEquipmentResult.id,
          _new_value: selectedEquipmentInfo?.name || 'Nieznany sprzęt',
          _details: {
            department: department.name,
            department_id: department.id,
            status: 'pending',
            description: selectedEquipmentDescription.trim() || null
          }
        });

        // Find and add accessories
        const accessories = allEquipment.filter(eq => eq.parent_id === selectedEquipment);
        if (accessories.length > 0) {
          const accessoryData = accessories.map(accessory => ({
            project_id: projectId,
            department_id: department.id,
            equipment_id: accessory.id,
            quantity: 1,
            is_custom: false,
            status: 'pending',
            project_parent_id: mainEquipmentResult.id,
          }));

          const { data: accessoryResults, error: accessoryError } = await supabase
            .from('project_equipment')
            .insert(accessoryData)
            .select();

          if (accessoryError) {
            toast({
              title: "Ostrzeżenie",
              description: "Sprzęt został dodany, ale nie udało się dodać akcesoriów",
              variant: "destructive",
            });
          } else if (accessoryResults) {
            // Log accessory additions
            for (const accessoryResult of accessoryResults) {
              const accessory = accessories.find(acc => acc.id === accessoryResult.equipment_id);
              await supabase.rpc('log_equipment_action', {
                _project_id: projectId,
                _action_type: 'added',
                _equipment_id: accessory?.id,
                _project_equipment_id: accessoryResult.id,
                _new_value: accessory?.name || 'Nieznane akcesorium',
                _details: {
                  department: department.name,
                  department_id: department.id,
                  status: 'pending',
                  parent_equipment: selectedEquipmentInfo?.name || 'Nieznany sprzęt'
                }
              });
            }
          }
        }
      } else {
        // Add custom equipment
        const equipmentData = {
          project_id: projectId,
          department_id: department.id,
          custom_name: customEquipmentName.trim(),
          custom_description: customEquipmentDescription.trim() || null,
          quantity: 1,
          is_custom: true,
          status: 'pending'
        };

        const { data: customEquipmentResult, error } = await supabase
          .from('project_equipment')
          .insert(equipmentData)
          .select()
          .single();

        if (error) {
          toast({
            title: "Błąd",
            description: "Nie udało się dodać sprzętu",
            variant: "destructive",
          });
          return;
        }

        // Log custom equipment addition
        await supabase.rpc('log_equipment_action', {
          _project_id: projectId,
          _action_type: 'added',
          _project_equipment_id: customEquipmentResult.id,
          _new_value: customEquipmentName.trim(),
          _details: {
            department: department.name,
            department_id: department.id,
            status: 'pending',
            is_custom: true,
            description: customEquipmentDescription.trim() || null
          }
        });
      }

      toast({
        title: "Sukces",
        description: "Sprzęt został dodany",
      });

      // Reset form
      setSelectedEquipment('');
      setSelectedEquipmentDescription('');
      setCustomEquipmentName('');
      setCustomEquipmentDescription('');
      setEquipmentMode('existing');
      setIsEquipmentDialogOpen(false);
      onEquipmentAdded();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas dodawania sprzętu",
        variant: "destructive",
      });
    }
  };

  const removeEquipment = async (equipmentId: string) => {
    try {
      // Get equipment data for logging before deletion
      const { data: equipmentData } = await supabase
        .from('project_equipment')
        .select('*, equipment(*), departments(*)')
        .eq('id', equipmentId)
        .single();

      const { error } = await supabase
        .from('project_equipment')
        .delete()
        .eq('id', equipmentId);

      if (error) {
        toast({
          title: "Błąd",
          description: "Nie udało się usunąć sprzętu",
          variant: "destructive",
        });
        return;
      }

      // Log equipment deletion
      if (equipmentData) {
        const equipmentName = equipmentData.is_custom 
          ? equipmentData.custom_name 
          : equipmentData.equipment?.name || 'Nieznany sprzęt';

        await supabase.rpc('log_equipment_action', {
          _project_id: projectId,
          _action_type: 'removed',
          _equipment_id: equipmentData.equipment_id,
          _project_equipment_id: equipmentId,
          _old_value: equipmentName,
          _details: {
            equipment_name: equipmentName,
            department_name: equipmentData.departments?.name,
            status: equipmentData.status,
            was_custom: equipmentData.is_custom
          }
        });
      }

      toast({
        title: "Sukces",
        description: "Sprzęt został usunięty",
      });

      onEquipmentAdded();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas usuwania sprzętu",
        variant: "destructive",
      });
    }
  };

  const updateEquipmentStatus = async (equipmentId: string, newStatus: string) => {
    try {
      // Get current equipment data for logging
      const { data: currentEquipment } = await supabase
        .from('project_equipment')
        .select('*, equipment(*)')
        .eq('id', equipmentId)
        .single();

      const { error } = await supabase
        .from('project_equipment')
        .update({ status: newStatus })
        .eq('id', equipmentId);

      if (error) {
        toast({
          title: "Błąd",
          description: "Nie udało się zmienić statusu sprzętu",
          variant: "destructive",
        });
        return;
      }

      // Log status change
      if (currentEquipment) {
        const equipmentName = currentEquipment.is_custom 
          ? currentEquipment.custom_name 
          : currentEquipment.equipment?.name || 'Nieznany sprzęt';

        await supabase.rpc('log_equipment_action', {
          _project_id: projectId,
          _action_type: 'status_changed',
          _equipment_id: currentEquipment.equipment_id,
          _project_equipment_id: equipmentId,
          _old_value: currentEquipment.status,
          _new_value: newStatus,
          _details: {
            equipment_name: equipmentName,
            department_id: currentEquipment.department_id
          }
        });
      }

      toast({
        title: "Sukces",
        description: "Status sprzętu został zmieniony",
      });

      onEquipmentAdded();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas zmiany statusu",
        variant: "destructive",
      });
    }
  };

  const getEquipmentDisplayName = (eq: ProjectEquipment) => {
    if (eq.is_custom) {
      return eq.custom_name || 'Nieznany sprzęt';
    }
    return eq.equipment?.name || 'Nieznany sprzęt';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
      case 'pending': return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-yellow-500 shadow-yellow-200/50 shadow-lg';
      case 'ready': return 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600 shadow-green-200/50 shadow-lg';
      case 'loading': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-blue-200/50 shadow-lg';
      case 'delivered': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-600 shadow-purple-200/50 shadow-lg';
      default: return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 border-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned':
      case 'pending': return 'W przygotowaniu';
      case 'ready': return 'Gotowy';
      case 'loading': return 'Po koordynacji';
      case 'delivered': return 'Dostarczony';
      default: return status || 'Przydzielony';
    }
  };

  const printDepartmentChecklist = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Collect all equipment for this department - main items only
    const departmentEquipment = (projectEquipment || []).filter(eq => 
      !eq.project_parent_id && !eq.equipment?.parent_id
    );
    
    // All project equipment for finding accessories
    const allProjectEquipment = (projectEquipment || []);

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Checklist - ${department.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .equipment-item { margin: 10px 0; padding: 8px; border: 1px solid #ddd; }
          .accessory { margin-left: 20px; padding: 5px; border-left: 3px solid #ccc; background: #f9f9f9; }
          .status { padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-ready { background: #d1fae5; color: #065f46; }
          .status-loading { background: #dbeafe; color: #1e40af; }
          .status-delivered { background: #e9d5ff; color: #6b21a8; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Checklist Działu: ${department.name}</h1>
          <p>Projekt ID: ${projectId}</p>
          <p>Data wydruku: ${new Date().toLocaleString('pl-PL')}</p>
        </div>
        <div class="equipment-list">
    `;

    departmentEquipment.forEach(item => {
      const statusClass = `status-${item.status.replace('assigned', 'pending')}`;
      htmlContent += `
        <div class="equipment-item">
          <div style="display: flex; justify-content: between; align-items: center;">
            <strong>${getEquipmentDisplayName(item)}</strong>
            <span class="status ${statusClass}">${getStatusLabel(item.status)}</span>
          </div>
      `;
      
      // Add description if available
      if (item.custom_description?.trim()) {
        htmlContent += `<div style="margin-left: 15px; margin-top: 5px; font-style: italic; color: #666;">• ${item.custom_description}</div>`;
      }
      
      // Add accessories for this equipment (prefer project_parent_id, fallback to model parent)
      const projectChildren = allProjectEquipment.filter(acc => acc.project_parent_id === item.id);
      const itemAccessories = projectChildren.length > 0
        ? projectChildren
        : allProjectEquipment.filter(acc => !acc.project_parent_id && acc.equipment?.parent_id === item.equipment_id);
      if (!item.is_custom && itemAccessories.length > 0) {
        htmlContent += `<div style="margin-top: 8px;">`;
        itemAccessories.forEach(accessory => {
          const accStatusClass = `status-${accessory.status.replace('assigned', 'pending')}`;
          htmlContent += `
            <div class="accessory">
              └ ${getEquipmentDisplayName(accessory)}
              <span class="status ${accStatusClass}">${getStatusLabel(accessory.status)}</span>
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

    htmlContent += `
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleToggleExpand = (itemId: string) => {
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

  // Filter to show only parent equipment (not accessories) in the main list
  const parentEquipment = (projectEquipment || []).filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id);

  return (
    <Card 
      ref={dropDept}
      className={`min-w-[200px] max-w-[250px] transition-all duration-200 ${
        isOverDept && canManage ? 'bg-warning/10 border-warning border-2' : 'hover:bg-muted/50'
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {department.name}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={printDepartmentChecklist}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              title="Drukuj checklist działu"
            >
              <Printer className="h-3 w-3" />
            </Button>
            <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dodaj sprzęt do działu {department.name}</DialogTitle>
                </DialogHeader>
                
                <Tabs value={equipmentMode} onValueChange={(value) => setEquipmentMode(value as 'existing' | 'custom')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing">Z listy</TabsTrigger>
                    <TabsTrigger value="custom">Nowy</TabsTrigger>
                  </TabsList>
                  
                   <TabsContent value="existing" className="space-y-4">
                     <div>
                       <Label>Wybierz sprzęt:</Label>
                       <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                         <SelectTrigger>
                           <SelectValue placeholder="Wybierz sprzęt z listy..." />
                         </SelectTrigger>
                         <SelectContent>
                           {(allEquipment || []).filter(eq => !eq.parent_id && (!eq.department_id || eq.department_id === department.id)).map((eq) => (
                             <SelectItem key={eq.id} value={eq.id}>
                               {eq.name}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div>
                       <Label>Opis (opcjonalny):</Label>
                       <Input
                         value={selectedEquipmentDescription}
                         onChange={(e) => setSelectedEquipmentDescription(e.target.value)}
                         placeholder="Wprowadź dodatkowy opis..."
                       />
                     </div>
                   </TabsContent>
                  
                  <TabsContent value="custom" className="space-y-4">
                    <div>
                      <Label>Nazwa sprzętu:</Label>
                      <Input
                        value={customEquipmentName}
                        onChange={(e) => setCustomEquipmentName(e.target.value)}
                        placeholder="Wprowadź nazwę sprzętu..."
                      />
                    </div>
                    <div>
                      <Label>Opis (opcjonalny):</Label>
                      <Input
                        value={customEquipmentDescription}
                        onChange={(e) => setCustomEquipmentDescription(e.target.value)}
                        placeholder="Wprowadź opis..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEquipmentDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={addEquipment}>
                    Dodaj sprzęt
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveDepartment(projectDepartment.id)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-danger"
              >
                   <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {parentEquipment.slice(0, 8).map((item) => (
            <DraggableEquipmentItem
              key={item.id}
              item={item}
              getEquipmentDisplayName={getEquipmentDisplayName}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              updateEquipmentStatus={updateEquipmentStatus}
              removeEquipment={removeEquipment}
              allProjectEquipment={projectEquipment}
              expandedItems={expandedItems}
              onToggleExpand={handleToggleExpand}
              canDeleteEquipment={canDeleteEquipment}
            />
          ))}
          {parentEquipment.length > 8 && (
            <div className="text-xs text-muted-foreground text-center">
              +{parentEquipment.length - 8} więcej
            </div>
          )}
          {!parentEquipment.length && (
            <div className="text-xs text-muted-foreground text-center py-4">
              Brak sprzętu
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface AddDepartmentTileProps {
  onAddDepartment: (departmentId: string) => void;
  availableDepartments: Department[];
  canAdd: boolean;
}

const AddDepartmentTile = ({ onAddDepartment, availableDepartments, canAdd }: AddDepartmentTileProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const handleAdd = () => {
    if (selectedDepartment) {
      onAddDepartment(selectedDepartment);
      setSelectedDepartment('');
      setIsDialogOpen(false);
    }
  };

  if (!canAdd || availableDepartments.length === 0) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="min-w-[200px] max-w-[250px] h-64 border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all duration-200">
          <CardContent className="flex flex-col items-center justify-center h-full space-y-2">
            <Plus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Dodaj dział</span>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj dział do projektu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Wybierz dział:</label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz dział..." />
              </SelectTrigger>
              <SelectContent>
                {(availableDepartments || []).map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAdd} disabled={!selectedDepartment}>
              Dodaj dział
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface WarehouseTileProps {
  warehouse?: IntermediateWarehouse;
  type: 'pre_coordination' | 'post_coordination';
  onAdd: (name: string, type: 'pre_coordination' | 'post_coordination') => void;
  onRemove: (id: string) => void;
  onEquipmentMoved: (equipmentId: string, newStatus: string, warehouseId?: string | null) => void;
  canManage: boolean;
  canDeleteWarehouses?: boolean;
  equipment: ProjectEquipment[];
  allProjectEquipment: ProjectEquipment[];
  reverseFlow?: boolean;
  removeEquipment?: (equipmentId: string) => void;
  canDeleteEquipment?: boolean;
}

  const WarehouseTile = ({ warehouse, type, onAdd, onRemove, onEquipmentMoved, canManage, canDeleteWarehouses = false, equipment, allProjectEquipment, reverseFlow = false, removeEquipment, canDeleteEquipment = false }: WarehouseTileProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [warehouseName, setWarehouseName] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const printWarehouseChecklist = () => {
    if (!warehouse) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getEquipmentDisplayName = (eq: ProjectEquipment) => {
      if (eq.is_custom) {
        return eq.custom_name || 'Nieznany sprzęt';
      }
      return eq.equipment?.name || 'Nieznany sprzęt';
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'ready': return 'Gotowy (magazyn)';
        case 'loading': return 'Po koordynacji (magazyn)';
        case 'delivered': return reverseFlow ? 'Z budowy (dostarczony)' : 'Dostarczony';
        default: return status || 'Nieznany';
      }
    };

    // Collect main equipment and accessories separately
    const mainEquipment = equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id);

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Checklist - ${warehouse.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .equipment-item { margin: 10px 0; padding: 8px; border: 1px solid #ddd; }
          .accessory { margin-left: 20px; padding: 5px; border-left: 3px solid #ccc; background: #f9f9f9; }
          .status { padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
          .status-ready { background: #d1fae5; color: #065f46; }
          .status-loading { background: #dbeafe; color: #1e40af; }
          .status-delivered { background: #e9d5ff; color: #6b21a8; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Checklist Magazynu: ${warehouse.name}</h1>
          <p>Typ: ${type === 'pre_coordination' ? 'Magazyn przed koordynacją' : 'Magazyn po koordynacji'}</p>
          <p>Data wydruku: ${new Date().toLocaleString('pl-PL')}</p>
        </div>
        <div class="equipment-list">
    `;

    mainEquipment.forEach(item => {
      const statusClass = `status-${item.status}`;
      htmlContent += `
        <div class="equipment-item">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${getEquipmentDisplayName(item)}</strong>
            <span class="status ${statusClass}">${getStatusLabel(item.status)}</span>
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
          const accStatusClass = `status-${accessory.status}`;
          htmlContent += `
            <div class="accessory">
              └ ${getEquipmentDisplayName(accessory)}
              <span class="status ${accStatusClass}">${getStatusLabel(accessory.status)}</span>
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
      htmlContent += `<div class="equipment-item">Brak sprzętu w magazynie</div>`;
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

  const [{ isOverWarehouse }, dropWarehouse] = useDrop({
    accept: ITEM_TYPES.PROJECT_EQUIPMENT,
    drop: (item: any) => {
      if (item.projectEquipment && warehouse) {
        // Sprzęt zostaje w magazynie bez zmiany statusu - zapisujemy lokalizację magazynu
        onEquipmentMoved(item.projectEquipment.id, item.projectEquipment.status, warehouse.id);
      }
    },
    canDrop: (item: any) => {
      // Pre-coordination warehouses accept ready equipment, in reverse flow also delivered
      if (type === 'pre_coordination') {
        return item.projectEquipment && (item.projectEquipment.status === 'ready' || item.projectEquipment.status === 'delivered');
      }
      // Post-coordination warehouses accept loading and delivered equipment  
      if (type === 'post_coordination') {
        return item.projectEquipment && (item.projectEquipment.status === 'loading' || item.projectEquipment.status === 'delivered');
      }
      return false;
    },
    collect: (monitor) => ({
      isOverWarehouse: !!monitor.isOver() && !!monitor.canDrop(),
    }),
  });

  const handleAdd = () => {
    if (warehouseName) {
      onAdd(warehouseName, type);
      setWarehouseName('');
      setIsDialogOpen(false);
    }
  };

  if (warehouse) {
    return (
      <Card 
        ref={dropWarehouse}
        className={`min-w-[200px] max-w-[250px] transition-all duration-200 ${
          isOverWarehouse ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              {warehouse.name}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={printWarehouseChecklist}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                title="Drukuj checklist magazynu"
              >
                <Printer className="h-3 w-3" />
              </Button>
              {canManage && canDeleteWarehouses && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(warehouse.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-danger"
                  disabled={equipment.length > 0}
                  title={equipment.length > 0 ? `Nie można usunąć - magazyn zawiera ${equipment.length} elementów sprzętu` : "Usuń magazyn"}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground">
            {type === 'pre_coordination' 
              ? (reverseFlow ? 'Przyjmuje: ZIELONY i FIOLETOWY sprzęt' : 'Przyjmuje: ZIELONY sprzęt')
              : 'Przyjmuje: NIEBIESKI sprzęt'
            }
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto">
            {equipment.length > 0 ? (
              equipment.slice(0, 8).map((item) => (
                <div key={item.id} className="space-y-1">
                  <DraggableEquipmentItem
                    item={item}
                    getEquipmentDisplayName={(eq) => (eq.is_custom ? eq.custom_name : eq.equipment?.name) || 'Nieznany sprzęt'}
                    getStatusLabel={(status) => status === 'ready' ? 'Gotowy (magazyn)' : status === 'loading' ? 'Po koordynacji (magazyn)' : '—'}
                    getStatusColor={(status) =>
                      status === 'ready'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-emerald-200/50 shadow'
                        : status === 'loading'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-blue-200/50 shadow'
                        : status === 'delivered'
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-600 shadow-purple-200/50 shadow'
                        : 'bg-muted text-foreground'
                    }
                    updateEquipmentStatus={() => {}}
                    removeEquipment={removeEquipment || (() => {})}
                    canDeleteEquipment={canDeleteEquipment}
                    allProjectEquipment={allProjectEquipment}
                    expandedItems={expandedItems}
                    onToggleExpand={(id) => {
                      setExpandedItems(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                      });
                    }}
                    childRenderMode="none"
                  />
                  {/* Render accessories vertically below main item */}
                  {expandedItems.has(item.id) && !item.is_custom && (
                    <div className="ml-2 space-y-1 animate-accordion-down">
                      {allProjectEquipment
                        .filter(eq => (eq as any).project_parent_id === item.id || (!eq.project_parent_id && eq.equipment?.parent_id === item.equipment?.id))
                        .map((accessory) => {
                          const getEquipmentDisplayName = (eq: ProjectEquipment) => 
                            (eq.is_custom ? eq.custom_name : eq.equipment?.name) || 'Nieznany sprzęt';
                          const status = accessory.status;
                          const textColor = status === 'ready' ? 'text-emerald-100' : 
                                          status === 'loading' ? 'text-blue-100' : 
                                          status === 'delivered' ? 'text-purple-100' : 'text-gray-100';
                          return (
                            <div key={accessory.id} className={`text-xs ${textColor} ml-1`}>
                              • {getEquipmentDisplayName(accessory)}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">Brak sprzętu</div>
            )}
            {equipment.length > 8 && (
              <div className="text-xs text-muted-foreground text-center">
                +{equipment.length - 8} więcej
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canManage) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="min-w-[200px] max-w-[250px] h-64 border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all duration-200">
          <CardContent className="flex flex-col items-center justify-center h-full space-y-2">
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center">
              {type === 'pre_coordination' ? 'Magazyn przed koordynacją' : 'Magazyn po koordynacji'}
            </span>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj magazyn pośredni</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nazwa magazynu:</label>
            <input
              type="text"
              value={warehouseName}
              onChange={(e) => setWarehouseName(e.target.value)}
              placeholder="Wprowadź nazwę magazynu..."
              className="w-full p-2 border border-input rounded-md"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAdd} disabled={!warehouseName}>
              Dodaj magazyn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface CoordinationCenterProps {
  onEquipmentMoved: (equipmentId: string, newStatus: string, warehouseId?: string | null) => void;
  equipment: ProjectEquipment[];
  canManage: boolean;
  reverseFlow?: boolean;
  allProjectEquipment?: ProjectEquipment[];
  userCoordinationPermissions?: {
    canMoveAnywhere: boolean;
    isWorker: boolean;
    isManager: boolean;
  };
  removeEquipment?: (equipmentId: string) => void;
  canDeleteEquipment?: boolean;
}

const CoordinationCenter = ({ 
  onEquipmentMoved, 
  equipment, 
  canManage,
  removeEquipment,
  canDeleteEquipment = false, 
  reverseFlow = false, 
  allProjectEquipment = [],
  userCoordinationPermissions = { canMoveAnywhere: false, isWorker: false, isManager: false }
}: CoordinationCenterProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
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

  const ITEM_TYPES = {
    PROJECT_EQUIPMENT: 'project_equipment'
  };

  const [{ isOverCoord, canDropCoord }, dropCoord] = useDrop({
    accept: [ITEM_TYPES.PROJECT_EQUIPMENT, 'equipment'],
    drop: (item: any) => {
      console.log('CoordinationCenter drop event:', item);
      if (item.projectEquipment) {
        console.log('Moving equipment from CoordinationCenter:', { 
          equipmentId: item.projectEquipment.id, 
          currentStatus: item.projectEquipment.status,
          targetStatus: 'loading'
        });
        // Equipment coming back from destination - set to loading status
        if (item.projectEquipment.status === 'delivered') {
          onEquipmentMoved(item.projectEquipment.id, 'loading', null);
        } else {
          onEquipmentMoved(item.projectEquipment.id, 'loading', null);
        }
      }
    },
    canDrop: (item: any) => {
      // For coordination workers: full movement except from construction site in reverse flow
      // For coordination managers: full movement everywhere
      console.log('CoordinationCenter canDrop check:', { 
        item, 
        userCoordinationPermissions, 
        canManage, 
        reverseFlow,
        itemStatus: item.projectEquipment?.status
      });
      
      if (userCoordinationPermissions.canMoveAnywhere) {
        if (userCoordinationPermissions.isWorker && !userCoordinationPermissions.isManager) {
          // Workers cannot move equipment FROM construction site (reverse flow block)
          if (reverseFlow && item.projectEquipment && item.projectEquipment.status === 'delivered') {
            console.log('Blocked: Worker trying to move from construction site in reverse flow');
            return false;
          }
        }
      }
      
      const effectiveCanManage = canManage || userCoordinationPermissions.canMoveAnywhere;
      if (!effectiveCanManage) {
        console.log('Blocked: User cannot manage', { canManage, canMoveAnywhere: userCoordinationPermissions.canMoveAnywhere });
        return false;
      }
      
      if (item.projectEquipment) {
        const allowedStatuses = reverseFlow ? ['delivered'] : ['ready', 'loading', 'delivered'];
        const result = allowedStatuses.includes(item.projectEquipment.status);
        console.log('Status check result:', { allowedStatuses, itemStatus: item.projectEquipment.status, result });
        return result;
      }
      return false;
    },
    collect: (monitor) => ({
      isOverCoord: monitor.isOver(),
      canDropCoord: monitor.canDrop(),
    }),
  });
  const printCoordinationList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getEquipmentDisplayName = (eq: ProjectEquipment) => {
      if (eq.is_custom) {
        return eq.custom_name || 'Nieznany sprzęt';
      }
      return eq.equipment?.name || 'Nieznany sprzęt';
    };

    const getStatusLabel = (status: string) => {
      return 'W koordynacji';
    };

    // Collect main equipment only
    const mainEquipment = equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id);

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista koordynacji</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .equipment-item { margin: 10px 0; padding: 8px; border: 1px solid #ddd; }
          .accessory { margin-left: 20px; padding: 5px; border-left: 3px solid #ccc; background: #f9f9f9; }
          .status { padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; background: #dbeafe; color: #1e40af; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Lista Koordynacji Przesyłek</h1>
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
            <span class="status">W koordynacji</span>
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
              <span class="status">W koordynacji</span>
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
      htmlContent += `<div class="equipment-item">Brak sprzętu w koordynacji</div>`;
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

  const [{ isOverDestTemp }, dropDestTemp] = useDrop({
    accept: ITEM_TYPES.PROJECT_EQUIPMENT,
    drop: (item: any) => {
      if (item.projectEquipment) {
        // From departments (pending/ready) or construction site (delivered in reverse flow) to coordination -> loading status, clear intermediate warehouse
        if (item.projectEquipment.status === 'pending' || item.projectEquipment.status === 'ready' || item.projectEquipment.status === 'delivered') {
          onEquipmentMoved(item.projectEquipment.id, 'loading', null);
        }
      }
    },
    canDrop: (item: any) => {
      if (reverseFlow) {
        // In reverse flow, accept equipment with delivered status (from construction site)
        return item.projectEquipment && 
               (item.projectEquipment.status === 'pending' || item.projectEquipment.status === 'ready' || item.projectEquipment.status === 'delivered');
      }
      // In forward flow, accept equipment from departments that's pending or ready
      return item.projectEquipment && 
             (item.projectEquipment.status === 'pending' || item.projectEquipment.status === 'ready');
    },
    collect: (monitor) => ({
      isOverDestTemp: !!monitor.isOver() && !!monitor.canDrop(),
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
      ref={dropCoord}
      className={`w-full max-w-2xl mx-auto transition-all duration-200 ${
        isOverCoord ? 'bg-primary/5 border-primary' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Truck className="h-5 w-5" />
            Dział Koordynacji przesyłek
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={printCoordinationList}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            title="Drukuj listę koordynacji"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
        {equipment.filter(eq => !eq.equipment?.parent_id).length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            {equipment.filter(eq => !eq.equipment?.parent_id).length} elementów w koordynacji
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length > 0 ? (
          <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
            {equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).slice(0, 15).map((item) => (
              <div key={item.id} className="space-y-1">
                <DraggableEquipmentItem
                  item={item}
                  getEquipmentDisplayName={getEquipmentDisplayName}
                  getStatusLabel={() => 'W koordynacji'}
                  getStatusColor={() => 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-blue-200/50 shadow-lg'}
                  updateEquipmentStatus={() => {}}
                  removeEquipment={removeEquipment || (() => {})}
                  canDeleteEquipment={canDeleteEquipment}
                  allProjectEquipment={allProjectEquipment}
                  expandedItems={expandedItems}
                  onToggleExpand={toggleExpanded}
                  childRenderMode="none"
                />
                {/* Render accessories vertically below main item */}
                {expandedItems.has(item.id) && !item.is_custom && (
                  <div className="ml-2 space-y-1 animate-accordion-down">
                    {allProjectEquipment
                      .filter(eq => (eq as any).project_parent_id === item.id || (!eq.project_parent_id && eq.equipment?.parent_id === item.equipment?.id))
                      .map((accessory) => (
                        <div key={accessory.id} className="text-xs text-blue-100 ml-1">
                          • {getEquipmentDisplayName(accessory)}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
            {equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length > 15 && (
              <div className="text-xs text-muted-foreground text-center col-span-3">
                +{equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length - 15} więcej
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            Centrum koordynacji transportu i logistyki<br/>
            <span className="text-xs">Przeciągnij sprzęt tutaj aby skoordynować przesyłkę</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface DestinationAreaProps {
  onEquipmentMoved: (equipmentId: string, newStatus: string, warehouseId?: string | null) => void;
  equipment: ProjectEquipment[];
  allProjectEquipment?: ProjectEquipment[];
  canManage: boolean;
}

const DestinationArea = ({ onEquipmentMoved, equipment, canManage, allProjectEquipment = [] }: DestinationAreaProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
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
  const printDeliveredList = () => {
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
        <title>Lista dostarczonego sprzętu</title>
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
          <h1>Lista Dostarczonego Sprzętu</h1>
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
            <span class="status">Dostarczony</span>
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
              <span class="status">Dostarczony</span>
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
      htmlContent += `<div class="equipment-item">Brak dostarczonego sprzętu</div>`;
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

  const [{ isOverDestination }, dropDestination] = useDrop({
    accept: ITEM_TYPES.PROJECT_EQUIPMENT,
    drop: (item: any) => {
      if (item.projectEquipment) {
        // Przyjmuj sprzęt z koordynacji (loading) lub z magazynów po koordynacji
        if (item.projectEquipment.status === 'loading') {
          onEquipmentMoved(item.projectEquipment.id, 'delivered', null);
        }
      }
    },
    canDrop: (item: any) => {
      // Accept equipment that's loading (from coordination)
      return item.projectEquipment && item.projectEquipment.status === 'loading';
    },
    collect: (monitor) => ({
      isOverDestination: !!monitor.isOver() && !!monitor.canDrop(),
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
      ref={dropDestination}
      className={`w-full max-w-2xl mx-auto transition-all duration-200 ${
        isOverDestination ? 'bg-primary/5 border-primary' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <MapPin className="h-5 w-5" />
            Magazyn docelowy - Dostarczony sprzęt
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={printDeliveredList}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            title="Drukuj listę dostarczonego sprzętu"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
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
              `${equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length} elementów dostarczonych`
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {filteredEquipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length > 0 ? (
          <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto">
            {filteredEquipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).slice(0, 24).map((item) => (
              <div key={item.id} className="space-y-1">
                <DraggableEquipmentItem
                  item={item}
                  getEquipmentDisplayName={getEquipmentDisplayName}
                  getStatusLabel={() => 'Dostarczony'}
                  getStatusColor={() => 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-purple-600 shadow-purple-200/50 shadow'}
                  updateEquipmentStatus={() => {}}
                  removeEquipment={removeEquipment || (() => {})}
                  canDeleteEquipment={canDeleteEquipment}
                  allProjectEquipment={allProjectEquipment}
                  expandedItems={expandedItems}
                  onToggleExpand={toggleExpanded}
                  childRenderMode="none"
                />
                {/* Render accessories vertically below main item */}
                {expandedItems.has(item.id) && !item.is_custom && (
                  <div className="ml-2 space-y-1 animate-accordion-down">
                    {allProjectEquipment
                      .filter(eq => (eq as any).project_parent_id === item.id || (!eq.project_parent_id && eq.equipment?.parent_id === item.equipment?.id))
                      .map((accessory) => (
                        <div key={accessory.id} className="text-xs text-purple-100 ml-1">
                          • {getEquipmentDisplayName(accessory)}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
            {equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length > 24 && (
              <div className="text-xs text-muted-foreground text-center col-span-3">
                +{equipment.filter(eq => !eq.equipment?.parent_id && !(eq as any).project_parent_id).length - 24} więcej
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            Miejsce docelowe dla dostarczonego sprzętu<br/>
            <span className="text-xs">Przeciągnij sprzęt z koordynacji aby oznaczyć jako dostarczony</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface AddWarehouseTileProps {
  type: 'pre_coordination' | 'post_coordination';
  onAdd: (name: string, type: 'pre_coordination' | 'post_coordination') => void;
}

const AddWarehouseTile = ({ type, onAdd }: AddWarehouseTileProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [warehouseName, setWarehouseName] = useState('');

  const handleAdd = () => {
    if (warehouseName.trim()) {
      onAdd(warehouseName, type);
      setWarehouseName('');
      setIsDialogOpen(false);
    }
  };

  const getTitle = () => {
    return type === 'pre_coordination' 
      ? 'Magazyn przed koordynacją' 
      : 'Magazyn po koordynacji';
  };

  return (
    <>
      <Card className="min-w-[200px] max-w-[250px] h-64 border-2 border-dashed border-muted-foreground/50 hover:border-muted-foreground/80 cursor-pointer transition-colors">
        <CardContent className="p-0 h-full">
          <button
            onClick={() => setIsDialogOpen(true)}
            className="w-full h-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-8 w-8" />
            <span className="text-xs mt-2 text-center">
              {getTitle()}
            </span>
          </button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj {getTitle()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nazwa magazynu..."
              value={warehouseName}
              onChange={(e) => setWarehouseName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleAdd} disabled={!warehouseName.trim()}>
                Dodaj magazyn
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const ProjectChecklist = ({ projectId, reverseFlow = false }: ProjectChecklistProps) => {
  const { user } = useAuth();
  const { canDeleteEquipment, canDeleteWarehouses } = useUserPermissions();
  const { toast } = useToast();

  const [projectDepartments, setProjectDepartments] = useState<ProjectDepartment[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [intermediateWarehouses, setIntermediateWarehouses] = useState<IntermediateWarehouse[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
  const [userDepartmentRoles, setUserDepartmentRoles] = useState<{ [departmentId: string]: boolean }>({});
  const [userCoordinationPermissions, setUserCoordinationPermissions] = useState({
    canMoveAnywhere: false,
    isWorker: false,
    isManager: false
  });

  const fetchProjectDepartments = async () => {
    const { data, error } = await supabase
      .from('project_departments')
      .select(`
        *,
        department:departments(*)
      `)
      .eq('project_id', projectId)
      .order('position_order');

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać działów projektu",
        variant: "destructive",
      });
      return;
    }

    setProjectDepartments(data || []);
  };

  const fetchAllDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy działów",
        variant: "destructive",
      });
      return;
    }

    setAllDepartments(data || []);
  };

  const fetchIntermediateWarehouses = async () => {
    const { data, error } = await supabase
      .from('intermediate_warehouses')
      .select('*')
      .eq('project_id', projectId)
      .order('position_order');

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać magazynów pośrednich",
        variant: "destructive",
      });
      return;
    }

    setIntermediateWarehouses((data || []) as IntermediateWarehouse[]);
  };

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać sprzętu",
        variant: "destructive",
      });
      return;
    }

    setEquipment(data || []);
  };

  const fetchProjectEquipment = async () => {
    const { data, error } = await supabase
      .from('project_equipment')
      .select(`
        *,
        equipment:equipment(*)
      `)
      .eq('project_id', projectId)
      .order('created_at');

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać sprzętu projektu",
        variant: "destructive",
      });
      return;
    }

    setProjectEquipment(data || []);
  };

  useEffect(() => {
    fetchProjectDepartments();
    fetchAllDepartments();
    fetchIntermediateWarehouses();
    fetchEquipment();
    fetchProjectEquipment();
  }, [projectId]);

  // Load user department roles for all departments - simplified for all authenticated users
  useEffect(() => {
    const loadUserDepartmentRoles = async () => {
      if (!user) return;
      
      // All authenticated users can manage all departments
      const roleChecks: { [departmentId: string]: boolean } = {};
      
      for (const dept of allDepartments) {
        roleChecks[dept.id] = true; // Simplified - all users can manage
      }
      
      // All authenticated users have coordination permissions
      setUserCoordinationPermissions({
        canMoveAnywhere: true,
        isWorker: true,
        isManager: true
      });
      
      setUserDepartmentRoles(roleChecks);
    };
    
    if (allDepartments.length > 0) {
      loadUserDepartmentRoles();
    }
  }, [allDepartments, user]);

  const addDepartment = async (departmentId: string) => {
    const maxOrder = Math.max(...(projectDepartments || []).map(pd => pd.position_order), -1);
    
    const { error } = await supabase
      .from('project_departments')
      .insert({
        project_id: projectId,
        department_id: departmentId,
        position_order: maxOrder + 1
      });

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać działu",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sukces",
      description: "Dział został dodany do projektu",
    });

    fetchProjectDepartments();
  };

  const removeDepartment = async (projectDepartmentId: string) => {
    if (!canDeleteWarehouses) {
      toast({
        title: "Brak uprawnień", 
        description: "Tylko administratorzy mogą usuwać działy",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('project_departments')
      .delete()
      .eq('id', projectDepartmentId);

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć działu",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sukces",
      description: "Dział został usunięty z projektu",
    });

    fetchProjectDepartments();
  };

  const addIntermediateWarehouse = async (name: string, type: 'pre_coordination' | 'post_coordination') => {
    const existingWarehouses = (intermediateWarehouses || []).filter(w => w.type === type);
    const maxOrder = Math.max(...existingWarehouses.map(w => w.position_order), -1);

    const { data: warehouseResult, error } = await supabase
      .from('intermediate_warehouses')
      .insert({
        project_id: projectId,
        name,
        type,
        position_order: maxOrder + 1
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać magazynu",
        variant: "destructive",
      });
      return;
    }

    // Log warehouse creation
    await supabase.rpc('log_equipment_action', {
      _project_id: projectId,
      _action_type: 'warehouse_created',
      _new_value: name,
      _details: {
        warehouse_id: warehouseResult.id,
        warehouse_type: type,
        position_order: maxOrder + 1
      }
    });

    toast({
      title: "Sukces",
      description: "Magazyn pośredni został dodany",
    });

    fetchIntermediateWarehouses();
  };

  const removeIntermediateWarehouse = async (warehouseId: string) => {
    // Check if warehouse contains any equipment - query database directly for accurate count
    const { data: equipmentInWarehouse, error: equipmentError } = await supabase
      .from('project_equipment')
      .select('id')
      .eq('intermediate_warehouse_id', warehouseId);
    
    if (equipmentError) {
      toast({
        title: "Błąd",
        description: "Nie udało się sprawdzić zawartości magazynu",
        variant: "destructive",
      });
      return;
    }

    if (equipmentInWarehouse && equipmentInWarehouse.length > 0) {
      toast({
        title: "Nie można usunąć magazynu",
        description: `Magazyn zawiera ${equipmentInWarehouse.length} elementów sprzętu. Najpierw przenieś sprzęt w inne miejsce.`,
        variant: "destructive",
      });
      return;
    }

    // Get warehouse info for logging before deletion
    const { data: warehouseData } = await supabase
      .from('intermediate_warehouses')
      .select('name, type')
      .eq('id', warehouseId)
      .single();

    const { error } = await supabase
      .from('intermediate_warehouses')
      .delete()
      .eq('id', warehouseId);

    if (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć magazynu",
        variant: "destructive",
      });
      return;
    }

    // Log warehouse deletion
    if (warehouseData) {
      await supabase.rpc('log_equipment_action', {
        _project_id: projectId,
        _action_type: 'warehouse_deleted',
        _old_value: warehouseData.name,
        _details: {
          warehouse_id: warehouseId,
          warehouse_type: warehouseData.type
        }
      });
    }

    toast({
      title: "Sukces",
      description: "Magazyn pośredni został usunięty",
    });

    // Refresh both warehouses and equipment data to ensure UI sync
    fetchIntermediateWarehouses();
    fetchProjectEquipment();
  };

  const moveEquipment = async (equipmentId: string, newStatus: string, warehouseId?: string | null) => {
    console.log('Moving equipment:', { equipmentId, newStatus, warehouseId, user: user?.email });
    try {
      // Get current equipment data for logging
      const { data: currentEquipment } = await supabase
        .from('project_equipment')
        .select('*, equipment(*)')
        .eq('id', equipmentId)
        .single();

      console.log('Current equipment:', currentEquipment);

      // Get all potential child equipment (accessories) that should be moved together
      let childQuery = supabase
        .from('project_equipment')
        .select('id, equipment_id, project_parent_id, equipment(*)')
        .eq('project_id', projectId)
        .eq('status', currentEquipment?.status);

      if (currentEquipment?.intermediate_warehouse_id) {
        childQuery = childQuery.eq('intermediate_warehouse_id', currentEquipment.intermediate_warehouse_id);
      } else {
        childQuery = childQuery.is('intermediate_warehouse_id', null);
      }

      const { data: childEquipmentRaw } = await childQuery;

      const childEquipment: any[] = childEquipmentRaw || [];

      const accessories = (childEquipment || []).filter((child: any) => 
        child.project_parent_id === equipmentId || (!child.project_parent_id && child.equipment?.parent_id === currentEquipment?.equipment_id)
      );

      console.log('Updating equipment with:', { status: newStatus, intermediate_warehouse_id: warehouseId ?? null });

      // Update main equipment
      const { error } = await supabase
        .from('project_equipment')
        .update({ status: newStatus, intermediate_warehouse_id: warehouseId ?? null })
        .eq('id', equipmentId);

      if (error) {
        console.error('Database update error:', error);
        toast({
          title: "Błąd",
          description: "Nie udało się przenieść sprzętu: " + error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('Equipment updated successfully');

      // Update all accessories to follow the main equipment
      if (accessories.length > 0) {
        const accessoryIds = accessories.map(acc => acc.id);
        const { error: accessoryError } = await supabase
          .from('project_equipment')
          .update({ status: newStatus, intermediate_warehouse_id: warehouseId ?? null })
          .in('id', accessoryIds);

        if (accessoryError) {
          console.error('Error moving accessories:', accessoryError);
          // Don't fail the main operation if accessories fail to move
        }
      }

      // Log position change
      if (currentEquipment) {
        const equipmentName = currentEquipment.is_custom 
          ? currentEquipment.custom_name 
          : currentEquipment.equipment?.name || 'Nieznany sprzęt';

        let oldLocation = 'Dział';
        let newLocation = 'Dział';

        // Determine old location
        if (currentEquipment.intermediate_warehouse_id) {
          const oldWarehouse = intermediateWarehouses.find(w => w.id === currentEquipment.intermediate_warehouse_id);
          oldLocation = oldWarehouse ? `Magazyn: ${oldWarehouse.name}` : 'Magazyn nieznany';
        } else if (currentEquipment.status === 'loading') {
          oldLocation = 'Koordynacja';
        } else if (currentEquipment.status === 'delivered') {
          oldLocation = 'Dostarczony';
        }

        // Determine new location
        if (warehouseId) {
          const newWarehouse = intermediateWarehouses.find(w => w.id === warehouseId);
          newLocation = newWarehouse ? `Magazyn: ${newWarehouse.name}` : 'Magazyn nieznany';
        } else if (newStatus === 'loading') {
          newLocation = 'Koordynacja';
        } else if (newStatus === 'delivered') {
          newLocation = 'Dostarczony';
        }

        await supabase.rpc('log_equipment_action', {
          _project_id: projectId,
          _action_type: 'position_changed',
          _equipment_id: currentEquipment.equipment_id,
          _project_equipment_id: equipmentId,
          _old_value: oldLocation,
          _new_value: newLocation,
          _details: {
            equipment_name: equipmentName,
            old_status: currentEquipment.status,
            new_status: newStatus,
            old_warehouse_id: currentEquipment.intermediate_warehouse_id,
            new_warehouse_id: warehouseId,
            department_id: currentEquipment.department_id
          }
        });
      }

      toast({
        title: "Sukces",
        description: "Sprzęt został przeniesiony",
      });

      fetchProjectEquipment();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas przenoszenia sprzętu",
        variant: "destructive",
      });
    }
  };

  // All authenticated users have admin-like permissions now
  const canAddDepartments = (projectDepartments || []).length < 8;
  const canManageCoordination = !!user;
  
  // All authenticated users can see all departments
  const availableDepartments = (allDepartments || []).filter(dept => {
    const isNotInProject = !(projectDepartments || []).some(pd => pd.department_id === dept.id);
    return isNotInProject;
  });

  // All authenticated users can add departments
  const userCanAddDepartments = !!user;

  const preCoordinationWarehouses = (intermediateWarehouses || []).filter(w => w.type === 'pre_coordination').sort((a, b) => a.position_order - b.position_order);
  const postCoordinationWarehouses = (intermediateWarehouses || []).filter(w => w.type === 'post_coordination').sort((a, b) => a.position_order - b.position_order);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6 p-6">
        {/* Department Tiles Row - Moved to top for forward flow */}
        {!reverseFlow && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Działy projektu</h3>
            <div className="flex flex-wrap gap-4 justify-start">
              {(projectDepartments || []).map((projectDept) => {
                const canManageThisDepartment = !!user;
                
                return (
                  <DepartmentTile
                    key={projectDept.id}
                    projectId={projectId}
                    department={projectDept.department}
                    projectDepartment={projectDept}
                    projectEquipment={projectEquipment.filter(eq => 
                      eq.department_id === projectDept.department_id &&
                      (eq.status === 'pending' || eq.status === 'ready' || !eq.status || eq.status === 'assigned') &&
                      !eq.intermediate_warehouse_id
                    )}
                    allEquipment={equipment}
                    onRemoveDepartment={removeDepartment}
                    onEquipmentAdded={fetchProjectEquipment}
                    onEquipmentMoved={moveEquipment}
                    canManage={canManageThisDepartment}
                  />
                );
              })}
              {canAddDepartments && (
                <AddDepartmentTile
                  onAddDepartment={addDepartment}
                  availableDepartments={availableDepartments}
                  canAdd={userCanAddDepartments}
                />
              )}
            </div>
          </div>
        )}

        {/* Construction Site Area - Only for reverse flow */}
        {reverseFlow && (
          <div className="space-y-2">
            <ConstructionSiteArea 
              onEquipmentMoved={moveEquipment}
              equipment={(projectEquipment || []).filter(eq => eq.status === 'delivered' && !eq.intermediate_warehouse_id)}
              allProjectEquipment={projectEquipment || []}
              canManage={canManageCoordination}
              projectId={projectId}
            />
          </div>
        )}

        {/* Pre-Coordination Warehouses */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-4 justify-start">
            {preCoordinationWarehouses.map((warehouse) => (
                <WarehouseTile
                  key={warehouse.id}
                  warehouse={warehouse}
                  type="pre_coordination"
                  onAdd={addIntermediateWarehouse}
                  onRemove={removeIntermediateWarehouse}
                  onEquipmentMoved={moveEquipment}
                  canManage={canManageCoordination}
                  canDeleteWarehouses={canDeleteWarehouses}
                  equipment={(projectEquipment || []).filter(eq => (eq.status === 'ready' || (reverseFlow && eq.status === 'delivered')) && eq.intermediate_warehouse_id === warehouse.id && !eq.project_parent_id && !eq.equipment?.parent_id)}
                  allProjectEquipment={projectEquipment || []}
                  reverseFlow={reverseFlow}
                  removeEquipment={removeEquipment}
                  canDeleteEquipment={canDeleteEquipment}
                />
            ))}
            {preCoordinationWarehouses.length < 5 && canManageCoordination && (
              <AddWarehouseTile
                type="pre_coordination"
                onAdd={addIntermediateWarehouse}
              />
            )}
          </div>
        </div>

        {/* Coordination Center */}
        <CoordinationCenter 
          onEquipmentMoved={moveEquipment}
          equipment={(projectEquipment || []).filter(eq => eq.status === 'loading' && !eq.intermediate_warehouse_id)}
          canManage={canManageCoordination}
          reverseFlow={reverseFlow}
          allProjectEquipment={projectEquipment || []}
          userCoordinationPermissions={userCoordinationPermissions}
          removeEquipment={removeEquipment}
          canDeleteEquipment={canDeleteEquipment}
        />

        {/* Post-Coordination Warehouses */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-4 justify-start">
              {postCoordinationWarehouses.map((warehouse) => (
                <WarehouseTile
                  key={warehouse.id}
                  warehouse={warehouse}
                  type="post_coordination"
                  onAdd={addIntermediateWarehouse}
                  onRemove={removeIntermediateWarehouse}
                  onEquipmentMoved={moveEquipment}
                  canManage={canManageCoordination}
                  canDeleteWarehouses={canDeleteWarehouses}
                  equipment={(projectEquipment || []).filter(eq => eq.status === 'loading' && eq.intermediate_warehouse_id === warehouse.id && !eq.project_parent_id && !eq.equipment?.parent_id)}
                  allProjectEquipment={projectEquipment || []}
                  reverseFlow={reverseFlow}
                  removeEquipment={removeEquipment}
                  canDeleteEquipment={canDeleteEquipment}
                />
              ))}
            {canManageCoordination && (
              <AddWarehouseTile
                type="post_coordination"
                onAdd={addIntermediateWarehouse}
              />
            )}
          </div>
        </div>

        {/* Destination Area - Only for forward flow */}
        {!reverseFlow && (
          <DestinationArea 
            onEquipmentMoved={moveEquipment}
            equipment={(projectEquipment || []).filter(eq => eq.status === 'delivered')}
            allProjectEquipment={projectEquipment || []}
            canManage={canManageCoordination}
          />
        )}

        {/* Department Tiles Row - Show at bottom for reverse flow only */}
        {reverseFlow && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Działy projektu</h3>
            <div className="flex flex-wrap gap-4 justify-start">
              {(projectDepartments || []).map((projectDept) => {
                const canManageThisDepartment = !!user;
                
                return (
                  <DepartmentTile
                    key={projectDept.id}
                    projectId={projectId}
                    department={projectDept.department}
                    projectDepartment={projectDept}
                    projectEquipment={projectEquipment.filter(eq => 
                      eq.department_id === projectDept.department_id &&
                      (eq.status === 'pending' || eq.status === 'ready' || !eq.status || eq.status === 'assigned') &&
                      !eq.intermediate_warehouse_id
                    )}
                    allEquipment={equipment}
                    onRemoveDepartment={removeDepartment}
                    onEquipmentAdded={fetchProjectEquipment}
                    onEquipmentMoved={moveEquipment}
                      canManage={canManageThisDepartment}
                      canDeleteEquipment={canDeleteEquipment}
                  />
                );
              })}
              {canAddDepartments && (
                <AddDepartmentTile
                  onAddDepartment={addDepartment}
                  availableDepartments={availableDepartments}
                  canAdd={userCanAddDepartments}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};