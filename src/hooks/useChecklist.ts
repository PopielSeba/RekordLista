import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ChecklistDepartment {
  id: string;
  name: string;
  project_id: string;
}

export interface ChecklistEquipment {
  id: string;
  name: string;
  status: 'ready' | 'pending' | 'loading';
  department_id: string;
  parent_id?: string;
  quantity: number;
}

export const useChecklist = (projectId?: string) => {
  const [departments, setDepartments] = useState<ChecklistDepartment[]>([]);
  const [equipment, setEquipment] = useState<ChecklistEquipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecklistData = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('project_id', projectId);

      if (deptError) throw deptError;

      // Fetch equipment
      const { data: equipData, error: equipError } = await supabase
        .from('equipment')
        .select('*')
        .in('department_id', (deptData || []).map(d => d.id));

      if (equipError) throw equipError;

      setDepartments(deptData || []);
      setEquipment(equipData?.map(equip => ({
        ...equip,
        status: equip.status as 'ready' | 'pending' | 'loading'
      })) || []);
    } catch (error) {
      console.error('Error fetching checklist data:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać danych checklisty",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async (name: string, project_id: string) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ name, project_id }])
        .select()
        .single();

      if (error) throw error;

      setDepartments(prev => [...prev, data]);
      toast({
        title: "Sukces",
        description: "Dział został utworzony"
      });
      return { success: true, data };
    } catch (error) {
      console.error('Error creating department:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć działu",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const createEquipment = async (equipmentData: Omit<ChecklistEquipment, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert([equipmentData])
        .select()
        .single();

      if (error) throw error;

      setEquipment(prev => [...prev, { ...data, status: data.status as 'ready' | 'pending' | 'loading' }]);
      toast({
        title: "Sukces",
        description: "Sprzęt został utworzony"
      });
      return { success: true, data };
    } catch (error) {
      console.error('Error creating equipment:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć sprzętu",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const updateEquipment = async (id: string, updates: Partial<ChecklistEquipment>) => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setEquipment(prev => prev.map(e => e.id === id ? { ...data, status: data.status as 'ready' | 'pending' | 'loading' } : e));
      toast({
        title: "Sukces",
        description: "Sprzęt został zaktualizowany"
      });
      return { success: true, data };
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować sprzętu",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEquipment(prev => prev.filter(e => e.id !== id));
      toast({
        title: "Sukces",
        description: "Sprzęt został usunięty"
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć sprzętu",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  const deleteDepartment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDepartments(prev => prev.filter(d => d.id !== id));
      setEquipment(prev => prev.filter(e => e.department_id !== id));
      toast({
        title: "Sukces",
        description: "Dział został usunięty"
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć działu",
        variant: "destructive"
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchChecklistData();
    }
  }, [projectId]);

  return {
    departments,
    equipment,
    loading,
    createDepartment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    deleteDepartment,
    refetch: fetchChecklistData
  };
};