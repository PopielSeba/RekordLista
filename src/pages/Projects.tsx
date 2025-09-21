import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Building } from 'lucide-react';
import { useProjects, type DatabaseProject } from '@/hooks/useProjects';
import { Header } from '@/components/layout/Header';

export const Projects = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { projects, loading } = useProjects();
  
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Ładowanie projektów...</p>
          </div>
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Lista Projektów
            </h2>
            <p className="text-muted-foreground">
              Wybierz projekt, aby przejść do systemu checklisty
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj projektów..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 bg-card/50 backdrop-blur-sm relative overflow-hidden"
              onClick={() => navigate(`/project/${project.id}`)}
              style={{
                '--project-color': project.color || '#3b82f6'
              } as React.CSSProperties}
            >
              {/* Blur effect background */}
              <div 
                className="absolute inset-0 opacity-20 blur-xl pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 50%, var(--project-color) 0%, transparent 70%)`
                }}
              />
              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {project.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusText(project.status)}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="line-clamp-3 text-sm">
                  {project.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3 relative z-10">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="line-clamp-1">{project.location}</span>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>
                    {new Date(project.start_date).toLocaleDateString('pl-PL')}
                    {project.end_date && (
                      <> - {new Date(project.end_date).toLocaleDateString('pl-PL')}</>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Building className="h-3 w-3 mr-1" />
                    {new Date(project.created_at).toLocaleDateString('pl-PL')}
                  </div>
                  
                  <div className="text-xs text-primary font-medium">
                    Otwórz checklist →
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {projects.length === 0 ? 'Brak projektów' : 'Nie znaleziono projektów'}
            </h3>
            <p className="text-muted-foreground">
              {projects.length === 0 
                ? 'Utwórz pierwszy projekt w panelu administratora'
                : 'Spróbuj zmienić kryteria wyszukiwania'
              }
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;