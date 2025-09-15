import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectChecklist } from '@/components/project/ProjectChecklist';
import { EquipmentLogs } from '@/components/project/EquipmentLogs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  location: string;
  start_date: string;
  end_date: string | null;
  reverse_flow?: boolean;
}

export const Project = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // All authenticated users can view logs
  const canViewLogs = !!user;

  // Fetch project data
  const fetchProject = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać projektu: " + error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProject();
      setLoading(false);
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Projekt nie został znaleziony
          </h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do projektów
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <div className="p-6 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              {canViewLogs && (
                <EquipmentLogs projectId={id!} />
              )}
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status === 'active' ? 'Aktywny' : 'Nieaktywny'}
              </Badge>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{project.name}</h2>
          <p className="text-muted-foreground mb-4">{project.description}</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Lokalizacja: {project.location}</span>
            <span>Start: {new Date(project.start_date).toLocaleDateString('pl-PL')}</span>
            {project.end_date && (
              <span>Koniec: {new Date(project.end_date).toLocaleDateString('pl-PL')}</span>
            )}
          </div>
        </div>

        {/* Project Checklist */}
        <ProjectChecklist projectId={id!} reverseFlow={project.reverse_flow} />
      </main>
    </div>
  );
};

export default Project;