import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  MapPin,
  RotateCcw
} from 'lucide-react';
import { useProjects, type DatabaseProject } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export const AdminProjects = () => {
  const { projects, loading, createProject, updateProject, copyProjectForReturn, deleteProject } = useProjects();
  const { user } = useAuth();
  const { canDeleteProjects, isAdmin } = useUserPermissions();
  const [editingProject, setEditingProject] = useState<DatabaseProject | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'completed' | 'pending',
    start_date: '',
    end_date: '',
    location: ''
  });

  // Check permissions on mount - all authenticated users can do everything now

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active',
      start_date: '',
      end_date: '',
      location: ''
    });
  };

  const handleCreate = async () => {
    const result = await createProject(formData);
    if (result.success) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleEdit = (project: DatabaseProject) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date || '',
      location: project.location
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingProject) return;
    const result = await updateProject(editingProject.id, formData);
    if (result.success) {
      setIsEditDialogOpen(false);
      setEditingProject(null);
      resetForm();
    }
  };

  const handleCopyForReturn = async (projectId: string) => {
    if (window.confirm('Czy chcesz utworzyć projekt wysyłki powrotnej? Sprzęt zostanie przygotowany do zwrotu z budowy.')) {
      await copyProjectForReturn(projectId);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDeleteProjects) {
      alert('Tylko administratorzy mogą usuwać projekty');
      return;
    }
    if (window.confirm('Czy na pewno chcesz usunąć ten projekt?')) {
      await deleteProject(id);
    }
  };

  const getStatusColor = (status: DatabaseProject['status']) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'completed': return 'bg-primary text-primary-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: DatabaseProject['status']) => {
    switch (status) {
      case 'active': return 'Aktywny';
      case 'completed': return 'Zakończony';
      case 'pending': return 'Oczekujący';
      default: return status;
    }
  };

  const ProjectForm = useMemo(() => {
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, name: e.target.value }));
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFormData(prev => ({ ...prev, description: e.target.value }));
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, location: e.target.value }));
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, start_date: e.target.value }));
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, end_date: e.target.value }));
    };

    const handleStatusChange = (value: any) => {
      setFormData(prev => ({ ...prev, status: value }));
    };

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nazwa projektu</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="Wprowadź nazwę projektu"
          />
        </div>
        
        <div>
          <Label htmlFor="description">Opis</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Wprowadź opis projektu"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="location">Lokalizacja</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={handleLocationChange}
            placeholder="Wprowadź lokalizację"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start_date">Data rozpoczęcia</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleStartDateChange}
            />
          </div>
          
          <div>
            <Label htmlFor="end_date">Data zakończenia</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleEndDateChange}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktywny</SelectItem>
              <SelectItem value="pending">Oczekujący</SelectItem>
              <SelectItem value="completed">Zakończony</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }, [formData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie projektów...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Zarządzanie Projektami</h2>
          <p className="text-muted-foreground">Twórz, edytuj i usuwaj projekty</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nowy Projekt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Utwórz Nowy Projekt</DialogTitle>
              <DialogDescription>
                Dodaj nowy projekt do systemu checklisty
              </DialogDescription>
            </DialogHeader>
            {ProjectForm}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleCreate}>Utwórz</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <Input
          placeholder="Szukaj projektów..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg line-clamp-2 flex items-center gap-2">
                  {project.name}
                  {project.reverse_flow && (
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                  )}
                </CardTitle>
                <Badge className={getStatusColor(project.status)}>
                  {getStatusText(project.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {project.description}
              </p>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="line-clamp-1">{project.location}</span>
              </div>
              
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  {new Date(project.start_date).toLocaleDateString('pl-PL')}
                  {project.end_date && (
                    <> - {new Date(project.end_date).toLocaleDateString('pl-PL')}</>
                  )}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 inline mr-1" />
                  {new Date(project.created_at).toLocaleDateString('pl-PL')}
                </div>
                
                <div className="flex space-x-1">
                  {!project.reverse_flow && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyForReturn(project.id)}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                      title="Utwórz projekt wysyłki powrotnej"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(project)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {canDeleteProjects && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nie znaleziono projektów
          </h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Utwórz pierwszy projekt'}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj Projekt</DialogTitle>
            <DialogDescription>
              Zmień dane projektu
            </DialogDescription>
          </DialogHeader>
          {ProjectForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleUpdate}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};