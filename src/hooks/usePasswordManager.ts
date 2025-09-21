import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SystemPassword {
  id: string;
  password_name: string;
  password_value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const usePasswordManager = () => {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState<SystemPassword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPasswords();
    }
  }, [user]);

  const fetchPasswords = async () => {
    try {
      const { data, error } = await supabase
        .from('system_passwords')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPasswords(data || []);
    } catch (error) {
      console.error('Error fetching passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (id: string, newValue: string) => {
    try {
      const { error } = await supabase
        .from('system_passwords')
        .update({ password_value: newValue })
        .eq('id', id);

      if (error) throw error;
      await fetchPasswords();
      return { success: true };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error };
    }
  };

  const checkPassword = async (passwordName: string, providedPassword: string) => {
    try {
      const { data, error } = await supabase
        .rpc('check_password', {
          password_name: passwordName,
          provided_password: providedPassword
        });

      if (error) throw error;
      return { success: true, isValid: data };
    } catch (error) {
      console.error('Error checking password:', error);
      return { success: false, error };
    }
  };

  return {
    passwords,
    loading,
    updatePassword,
    checkPassword,
    refetch: fetchPasswords
  };
};
