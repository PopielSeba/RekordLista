import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Wrench, Package, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Equipment {
  id: string;
  name: string;
  department_id: string;
  parent_id: string | null;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
  show_in_checklist: boolean;
  accessories?: Equipment[];
}

interface Department {
  id: string;
  name: string;
}

export const AdminEquipment = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    quantity: 1
  });
  const { toast } = useToast();

  const fetchEquipment = async () => {
    try {
      // Fetch main equipment (parent items only)
      const { data: mainEquipment, error } = await supabase
        .from('equipment')
        .select(`
          *,
          departments!inner(name)
        `)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch accessories for each equipment
      const equipmentWithAccessories = await Promise.all(
        (mainEquipment || []).map(async (item) => {
          const { data: accessories } = await supabase
            .from('equipment')
            .select('*')
            .eq('parent_id', item.id)
            .order('created_at', { ascending: true });

          return {
            ...item,
            accessories: accessories || []
          };
        })
      );

      setEquipment(equipmentWithAccessories);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać sprzętu: " + error.message,
        variant: "destructive",
      });
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('is_global', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać działów: " + error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEquipment(), fetchDepartments()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.department_id) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie pola",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment')
        .insert([
          {
            name: formData.name.trim(),
            department_id: formData.department_id,
            quantity: formData.quantity,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Sprzęt został dodany",
      });

      setFormData({ name: '', department_id: '', quantity: 1 });
      fetchEquipment();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać sprzętu: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten sprzęt?')) return;

    try {
      // First delete all accessories
      await supabase
        .from('equipment')
        .delete()
        .eq('parent_id', id);

      // Then delete the main equipment
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Sprzęt został usunięty",
      });

      fetchEquipment();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć sprzętu: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddAccessory = async (parentId: string, name: string, showInChecklist: boolean) => {
    if (!name.trim()) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .insert([
          {
            name: name.trim(),
            department_id: equipment.find(e => e.id === parentId)?.department_id || '',
            parent_id: parentId,
            quantity: 1,
            status: 'pending',
            show_in_checklist: showInChecklist
          }
        ]);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Akcesoria zostało dodane",
      });

      fetchEquipment();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać akcesoriów: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateAccessory = async (accessoryId: string, name: string, showInChecklist: boolean) => {
    if (!name.trim()) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .update({
          name: name.trim(),
          show_in_checklist: showInChecklist
        })
        .eq('id', accessoryId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Akcesoria zostało zaktualizowane",
      });

      fetchEquipment();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować akcesoriów: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccessory = async (accessoryId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to akcesoria?')) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', accessoryId);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Akcesoria zostało usunięte",
      });

      fetchEquipment();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć akcesoriów: " + error.message,
        variant: "destructive",
      });
    }
  };

// Accessory Editor Component
interface AccessoryEditorProps {
  index: number;
  accessory?: Equipment;
  parentId: string;
  onAdd: (parentId: string, name: string, showInChecklist: boolean) => Promise<void>;
  onUpdate: (accessoryId: string, name: string, showInChecklist: boolean) => Promise<void>;
  onDelete: (accessoryId: string) => Promise<void>;
}

const AccessoryEditor = ({ index, accessory, parentId, onAdd, onUpdate, onDelete }: AccessoryEditorProps) => {
  const [name, setName] = useState(accessory?.name || '');
  const [showInChecklist, setShowInChecklist] = useState(accessory?.show_in_checklist ?? true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setName(accessory?.name || '');
    setShowInChecklist(accessory?.show_in_checklist ?? true);
  }, [accessory]);

  const handleSave = async () => {
    if (!name.trim()) return;

    if (accessory) {
      await onUpdate(accessory.id, name, showInChecklist);
    } else {
      await onAdd(parentId, name, showInChecklist);
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (accessory) {
      await onDelete(accessory.id);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-3 bg-background rounded-md border">
      <div className="flex items-center space-x-2 flex-1">
        <Checkbox
          checked={showInChecklist}
          onCheckedChange={(checked) => setShowInChecklist(checked as boolean)}
          disabled={!accessory && !name.trim()}
        />
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Akcesoria ${index + 1}`}
            className="text-sm"
            onFocus={() => setIsEditing(true)}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        {(isEditing || accessory) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={!name.trim()}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
        
        {accessory && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

  // Filter and search equipment
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartmentFilter === '' || item.department_id === selectedDepartmentFilter;
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Zarządzanie Sprzętem</h2>
        <p className="text-muted-foreground">Dodawaj i zarządzaj sprzętem w działach</p>
      </div>

      {/* Create Equipment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Dodaj Nowy Sprzęt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equipment-name">Nazwa sprzętu</Label>
                <Input
                  id="equipment-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="np. Wiertarka udarowa"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department-select">Dział</Label>
                <select
                  id="department-select"
                  value={formData.department_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-foreground"
                  required
                >
                  <option value="">Wybierz dział</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Ilość</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Sprzęt
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Wyszukiwanie i Filtrowanie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search-equipment">Wyszukaj sprzęt</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-equipment"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Wpisz nazwę sprzętu..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-department">Filtruj po dziale</Label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  id="filter-department"
                  value={selectedDepartmentFilter}
                  onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-input bg-background rounded-md text-foreground"
                >
                  <option value="">Wszystkie działy</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {(searchTerm || selectedDepartmentFilter) && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Znaleziono: {filteredEquipment.length} elementów
              </span>
              {(searchTerm || selectedDepartmentFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDepartmentFilter('');
                  }}
                >
                  Wyczyść filtry
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista Sprzętu ({filteredEquipment.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEquipment.length === 0 ? (
            <Alert>
              <AlertDescription>
                {equipment.length === 0 
                  ? "Brak sprzętu. Dodaj pierwszy sprzęt używając formularza powyżej."
                  : "Nie znaleziono sprzętu spełniającego kryteria wyszukiwania."
                }
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredEquipment.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Dział: {(item as any).departments?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Ilość: {item.quantity} | Utworzono: {new Date(item.created_at).toLocaleDateString('pl-PL')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {item.accessories && item.accessories.length > 0 
                          ? `${item.accessories.length} akcesoriów` 
                          : 'Brak akcesoriów'
                        }
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedEquipment(
                          expandedEquipment === item.id ? null : item.id
                        )}
                      >
                        {expandedEquipment === item.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Accessories Section */}
                  {expandedEquipment === item.id && (
                    <div className="border-t bg-muted/20 p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-foreground">Wyposażenie dodatkowe</h4>
                          <Badge variant="secondary">{item.accessories?.length || 0}/6</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Array.from({ length: 6 }, (_, index) => {
                            const accessory = item.accessories?.[index];
                            return (
                              <AccessoryEditor
                                key={index}
                                index={index}
                                accessory={accessory}
                                parentId={item.id}
                                onAdd={handleAddAccessory}
                                onUpdate={handleUpdateAccessory}
                                onDelete={handleDeleteAccessory}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};