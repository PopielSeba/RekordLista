import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSecuritySettings = () => {
  const [passwords, setPasswords] = useState({
    level1_password: '0500600525', // fallback
    level2_password: '3181175' // fallback
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPasswords();
  }, []);

  const fetchPasswords = async () => {
    try {
      const { data, error } = await supabase
        .from('security_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['level1_password', 'level2_password']);

      if (error) {
        console.error('Error fetching security settings:', error);
        return;
      }

      if (data) {
        const newPasswords = { ...passwords };
        data.forEach(setting => {
          if (setting.setting_key === 'level1_password') {
            newPasswords.level1_password = setting.setting_value;
          } else if (setting.setting_key === 'level2_password') {
            newPasswords.level2_password = setting.setting_value;
          }
        });
        setPasswords(newPasswords);
      }
    } catch (error) {
      console.error('Error fetching passwords:', error);
    } finally {
      setLoading(false);
    }
  };

  return { passwords, loading, refetch: fetchPasswords };
};