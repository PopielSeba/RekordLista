import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Building2, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Department {
  id: string;
  name: string;
  project_id: string | null;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
}

export const AdminDepartments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });
  const { toast } = useToast();

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_global', true)
        .order('created_at', { ascending: false });

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
      await fetchDepartments();
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Błąd",
        description: "Wprowadź nazwę działu",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingDepartment) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update({ name: formData.name.trim() })
          .eq('id', editingDepartment.id);

        if (error) throw error;

        toast({
          title: "Sukces",
          description: "Dział został zaktualizowany",
        });

        setEditingDepartment(null);
      } else {
        // Create new department
        const { error } = await supabase
          .from('departments')
          .insert([
            {
              name: formData.name.trim(),
              is_global: true,
              project_id: null
            }
          ]);

        if (error) throw error;

        toast({
          title: "Sukces",
          description: "Dział został utworzony",
        });
      }

      setFormData({ name: '' });
      fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: `Nie udało się ${editingDepartment ? 'zaktualizować' : 'utworzyć'} działu: ` + error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({ name: department.name });
  };

  const handleCancelEdit = () => {
    setEditingDepartment(null);
    setFormData({ name: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten dział?')) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Dział został usunięty",
      });

      fetchDepartments();
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć działu: " + error.message,
        variant: "destructive",
      });
    }
  };

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
        <h2 className="text-2xl font-bold text-foreground">Zarządzanie Działami</h2>
        <p className="text-muted-foreground">Twórz i zarządzaj globalnymi działami dostępnymi we wszystkich projektach</p>
      </div>

      {/* Create/Edit Department Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingDepartment ? 'Edytuj Dział' : 'Utwórz Nowy Dział'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department-name">Nazwa działu</Label>
              <Input
                id="department-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="np. Dział Serwisu, Dział Mechaniczny"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                {editingDepartment ? 'Zaktualizuj' : 'Utwórz'} Dział
              </Button>
              
              {editingDepartment && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Anuluj
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Departments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista Działów ({departments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <Alert>
              <AlertDescription>
                Brak globalnych działów. Utwórz pierwszy dział używając formularza powyżej.
                Działy będą dostępne automatycznie we wszystkich projektach.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {departments.map((department) => (
                <div 
                  key={department.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div>
                      <div className="font-medium text-foreground">{department.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Globalny dział - dostępny we wszystkich projektach
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Utworzono: {new Date(department.created_at).toLocaleDateString('pl-PL')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Globalny</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(department)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(department.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};