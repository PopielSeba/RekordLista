import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Building,
  Wrench
} from 'lucide-react';
import { useChecklist, type ChecklistDepartment, type ChecklistEquipment } from '@/hooks/useChecklist';
import { useProjects } from '@/hooks/useProjects';

export const AdminChecklist = () => {
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const { departments, equipment, loading, createDepartment, createEquipment, updateEquipment, deleteEquipment, deleteDepartment } = useChecklist(selectedProjectId);
  
  const [isCreateDeptDialogOpen, setIsCreateDeptDialogOpen] = useState(false);
  const [isCreateEquipDialogOpen, setIsCreateEquipDialogOpen] = useState(false);
  const [isEditEquipDialogOpen, setIsEditEquipDialogOpen] = useState(false);
  
  const [editingEquipment, setEditingEquipment] = useState<ChecklistEquipment | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [equipFormData, setEquipFormData] = useState({
    name: '',
    status: 'pending' as 'ready' | 'pending' | 'loading',
    department_id: '',
    quantity: 1
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleCreateDepartment = async () => {
    if (!selectedProjectId || !newDeptName.trim()) return;
    
    const result = await createDepartment(newDeptName, selectedProjectId);
    if (result.success) {
      setIsCreateDeptDialogOpen(false);
      setNewDeptName('');
    }
  };

  const handleCreateEquipment = async () => {
    if (!equipFormData.department_id || !equipFormData.name.trim()) return;
    
    const result = await createEquipment(equipFormData);
    if (result.success) {
      setIsCreateEquipDialogOpen(false);
      setEquipFormData({
        name: '',
        status: 'pending',
        department_id: '',
        quantity: 1
      });
    }
  };

  const handleEditEquipment = (equip: ChecklistEquipment) => {
    setEditingEquipment(equip);
    setEquipFormData({
      name: equip.name,
      status: equip.status,
      department_id: equip.department_id,
      quantity: equip.quantity
    });
    setIsEditEquipDialogOpen(true);
  };

  const handleUpdateEquipment = async () => {
    if (!editingEquipment) return;
    
    const result = await updateEquipment(editingEquipment.id, equipFormData);
    if (result.success) {
      setIsEditEquipDialogOpen(false);
      setEditingEquipment(null);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten sprzęt?')) {
      await deleteEquipment(id);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten dział? Wszystkie przypisane sprzęty również zostaną usunięte.')) {
      await deleteDepartment(id);
    }
  };

  const getStatusColor = (status: ChecklistEquipment['status']) => {
    switch (status) {
      case 'ready': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'loading': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: ChecklistEquipment['status']) => {
    switch (status) {
      case 'ready': return 'Gotowy';
      case 'pending': return 'W trakcie';
      case 'loading': return 'Ładowanie';
      default: return status;
    }
  };

  const getEquipmentForDepartment = (departmentId: string) => {
    return equipment.filter(e => e.department_id === departmentId && !e.parent_id);
  };

  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Zarządzanie Checklistą</h2>
          <p className="text-muted-foreground">Wybierz projekt aby zarządzać jego checklistą</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Label htmlFor="project-select">Wybierz projekt</Label>
              <Select onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz projekt..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie checklisty...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Zarządzanie Checklistą</h2>
          <p className="text-muted-foreground">
            Projekt: <span className="font-semibold">{selectedProject?.name}</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isCreateDeptDialogOpen} onOpenChange={setIsCreateDeptDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building className="h-4 w-4 mr-2" />
                Nowy Dział
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Utwórz Nowy Dział</DialogTitle>
              </DialogHeader>
              <div>
                <Label htmlFor="dept-name">Nazwa działu</Label>
                <Input
                  id="dept-name"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="np. Dział Elektryczny"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDeptDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleCreateDepartment}>Utwórz</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateEquipDialogOpen} onOpenChange={setIsCreateEquipDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nowy Sprzęt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj Nowy Sprzęt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="equip-name">Nazwa sprzętu</Label>
                  <Input
                    id="equip-name"
                    value={equipFormData.name}
                    onChange={(e) => setEquipFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="np. Generator 100kW"
                  />
                </div>
                <div>
                  <Label htmlFor="equip-dept">Dział</Label>
                  <Select value={equipFormData.department_id} onValueChange={(value) => setEquipFormData(prev => ({ ...prev, department_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz dział..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="equip-status">Status</Label>
                  <Select value={equipFormData.status} onValueChange={(value: any) => setEquipFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">W trakcie</SelectItem>
                      <SelectItem value="ready">Gotowy</SelectItem>
                      <SelectItem value="loading">Ładowanie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="equip-quantity">Ilość</Label>
                  <Input
                    id="equip-quantity"
                    type="number"
                    min="1"
                    value={equipFormData.quantity}
                    onChange={(e) => setEquipFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateEquipDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleCreateEquipment}>Dodaj</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => setSelectedProjectId('')}>
          ← Zmień projekt
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <Card key={department.id} className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {department.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteDepartment(department.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-2">
              {getEquipmentForDepartment(department.id).map((equip) => (
                <div
                  key={equip.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{equip.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(equip.status)} variant="secondary">
                          {getStatusText(equip.status)}
                        </Badge>
                        {equip.quantity > 1 && (
                          <span className="text-xs text-muted-foreground">
                            x{equip.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEquipment(equip)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEquipment(equip.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {getEquipmentForDepartment(department.id).length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Brak sprzętu</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Brak działów
          </h3>
          <p className="text-muted-foreground">
            Utwórz pierwszy dział dla tego projektu
          </p>
        </div>
      )}

      {/* Edit Equipment Dialog */}
      <Dialog open={isEditEquipDialogOpen} onOpenChange={setIsEditEquipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj Sprzęt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-equip-name">Nazwa sprzętu</Label>
              <Input
                id="edit-equip-name"
                value={equipFormData.name}
                onChange={(e) => setEquipFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-equip-status">Status</Label>
              <Select value={equipFormData.status} onValueChange={(value: any) => setEquipFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">W trakcie</SelectItem>
                  <SelectItem value="ready">Gotowy</SelectItem>
                  <SelectItem value="loading">Ładowanie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-equip-quantity">Ilość</Label>
              <Input
                id="edit-equip-quantity"
                type="number"
                min="1"
                value={equipFormData.quantity}
                onChange={(e) => setEquipFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditEquipDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleUpdateEquipment}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};