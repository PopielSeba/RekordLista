import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'pracownik' | null;

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    fetchUserRole();
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error);
        setRole('pracownik'); // Default fallback
        return;
      }

      setRole((data?.role as UserRole) || 'pracownik');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('pracownik'); // Default fallback
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin';
  const canDeleteEquipment = role === 'admin'; // Only admins can delete equipment
  const canDeleteWarehouses = role === 'admin'; // Only admins can delete warehouses

  return {
    role,
    loading,
    isAdmin,
    canDeleteEquipment,
    canDeleteWarehouses,
    refetch: fetchUserRole
  };
};