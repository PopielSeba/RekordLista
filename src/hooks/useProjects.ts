import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Helper function to lighten a hex color
const lightenColor = (hex: string, factor: number): string => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Lighten by mixing with white
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export interface DatabaseProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'pending';
  start_date: string;
  end_date?: string;
  location: string;
  created_at: string;
  updated_at: string;
  reverse_flow?: boolean;
  color?: string;
}


export const useProjects = () => {
  const [projects, setProjects] = useState<DatabaseProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setProjects(data?.map(project => ({
        ...project,
        status: project.status as 'active' | 'completed' | 'pending',
        color: project.color || '#3b82f6' // Use DB color or default
      })) || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać projektów",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: Omit<DatabaseProject, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Remove color field if it exists, as the column might not exist in the database yet
      const { color, ...projectDataWithoutColor } = projectData as any;
      
      const { data, error } = await supabase
        .from('projects')
        .insert([projectDataWithoutColor])
        .select()
        .single();

      if (error) throw error;
      
      // Add color back to the returned data
      const projectWithColor = { ...data, color: color || '#3b82f6' };
      
      setProjects(prev => [{ ...projectWithColor, status: data.status as 'active' | 'completed' | 'pending' }, ...prev]);
      toast({
        title: "Sukces",
        description: "Projekt został utworzony"
      });
      return { success: true, data: projectWithColor };
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć projektu",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateProject = async (id: string, updates: Partial<DatabaseProject>) => {
    try {
      // Remove color field if it exists, as the column might not exist in the database yet
      const { color, ...updatesWithoutColor } = updates as any;
      
      const { data, error } = await supabase
        .from('projects')
        .update(updatesWithoutColor)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Find the existing project to preserve its color
      const existingProject = projects.find(p => p.id === id);
      const existingColor = existingProject?.color || '#3b82f6';
      
      // Use the new color if provided, otherwise keep the existing color
      const finalColor = color || existingColor;
      const dataWithColor = { ...data, color: finalColor };

      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...dataWithColor } : p));
      toast({
        title: "Sukces",
        description: "Projekt został zaktualizowany"
      });
      return { success: true, data: dataWithColor };
    } catch (error) {
      console.error('Error updating project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Błąd",
        description: `Nie udało się zaktualizować projektu: ${error instanceof Error ? error.message : 'Nieznany błąd'}`,
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const copyProjectForReturn = async (sourceProjectId: string) => {
    try {
      // First, fetch the source project
      const { data: sourceProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', sourceProjectId)
        .single();

      if (fetchError) throw fetchError;

      // Create new project with reverse flow
      // Get the source color from the local projects state (which has the color)
      const localSourceProject = projects.find(p => p.id === sourceProjectId);
      const sourceColor = localSourceProject?.color || sourceProject.color || '#3b82f6';
      const lighterColor = lightenColor(sourceColor, 0.4); // Make it 40% lighter
      
      // Remove color field as it might not exist in the database yet
      const newProjectData = {
        name: `${sourceProject.name} - Wysyłka Powrotna`,
        description: `Wysyłka powrotna sprzętu z projektu: ${sourceProject.description}`,
        status: 'active' as const,
        start_date: new Date().toISOString().split('T')[0],
        location: sourceProject.location,
        reverse_flow: true
        // color: lighterColor - removed as column might not exist
      };

      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert([newProjectData])
        .select()
        .single();

      if (createError) throw createError;

      // Add color back to the new project data
      const newProjectWithColor = { ...newProject, color: lighterColor };

      // Copy project equipment but with different status for reverse flow
      const { data: sourceEquipment, error: equipmentError } = await supabase
        .from('project_equipment')
        .select('*')
        .eq('project_id', sourceProjectId);

      if (equipmentError) throw equipmentError;

      if (sourceEquipment && sourceEquipment.length > 0) {
        // Two-pass mapping to keep accessories (project_parent_id)
        const idMapping = new Map<string, string>();
        sourceEquipment.forEach(({ id }) => {
          idMapping.set(id as string, crypto.randomUUID());
        });

        const newEquipment = sourceEquipment.map(({ id: oldId, created_at: _createdAt, updated_at: _updatedAt, project_id: _oldProjectId, project_parent_id, ...rest }) => ({
          ...rest,
          id: idMapping.get(oldId as string)!,
          project_id: newProjectWithColor.id,
          project_parent_id: project_parent_id ? idMapping.get(project_parent_id as string) ?? null : null,
          status: 'delivered',
          intermediate_warehouse_id: null
        }));

        const { error: insertEquipmentError } = await supabase
          .from('project_equipment')
          .insert(newEquipment);

        if (insertEquipmentError) throw insertEquipmentError;
      }


      // Copy departments
      const { data: sourceDepartments, error: deptError } = await supabase
        .from('project_departments')
        .select('*')
        .eq('project_id', sourceProjectId);

      if (deptError) throw deptError;

      if (sourceDepartments && sourceDepartments.length > 0) {
        const newDepartments = sourceDepartments.map(({ id: _oldId, created_at: _createdAt, ...rest }) => ({
          ...rest,
          project_id: newProjectWithColor.id
        }));

        const { error: insertDeptError } = await supabase
          .from('project_departments')
          .insert(newDepartments);

        if (insertDeptError) throw insertDeptError;
      }

      // Copy destinations
      const { data: sourceDestinations, error: destError } = await supabase
        .from('destinations')
        .select('*')
        .eq('project_id', sourceProjectId);

      if (destError) throw destError;

      if (sourceDestinations && sourceDestinations.length > 0) {
        const newDestinations = sourceDestinations.map(({ id: _oldId, created_at: _createdAt, updated_at: _updatedAt, project_id: _oldProjectId, ...rest }) => ({
          ...rest,
          project_id: newProjectWithColor.id
        }));

        const { error: insertDestError } = await supabase
          .from('destinations')
          .insert(newDestinations);

        if (insertDestError) throw insertDestError;
      }

      setProjects(prev => [{ ...newProjectWithColor, status: newProjectWithColor.status as 'active' | 'completed' | 'pending' }, ...prev]);
      toast({
        title: "Sukces",
        description: "Projekt wysyłki powrotnej został utworzony"
      });
      return { success: true, data: newProjectWithColor };
    } catch (error) {
      console.error('Error copying project for return:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć projektu wysyłki powrotnej",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProjects(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Sukces",
        description: "Projekt został usunięty"
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć projektu",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    createProject,
    updateProject,
    copyProjectForReturn,
    deleteProject,
    refetch: fetchProjects
  };
};