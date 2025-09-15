import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SecuritySetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
}

export const SecurityPasswordManager = () => {
  const [settings, setSettings] = useState<SecuritySetting[]>([]);
  const [passwords, setPasswords] = useState({
    level1_password: '',
    level2_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    level1: false,
    level2: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .in('setting_key', ['level1_password', 'level2_password']);

      if (error) throw error;

      setSettings(data || []);
      
      // Populate password fields
      const level1 = data?.find(s => s.setting_key === 'level1_password');
      const level2 = data?.find(s => s.setting_key === 'level2_password');
      
      setPasswords({
        level1_password: level1?.setting_value || '',
        level2_password: level2?.setting_value || ''
      });
    } catch (error) {
      console.error('Error fetching security settings:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać ustawień bezpieczeństwa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (key: string, value: string) => {
    setPasswords(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (level: 'level1' | 'level2') => {
    setShowPasswords(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const savePassword = async (settingKey: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('security_settings')
        .update({ 
          setting_value: passwords[settingKey as keyof typeof passwords] 
        })
        .eq('setting_key', settingKey);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: `Hasło ${settingKey === 'level1_password' ? '1 stopnia' : '2 stopnia'} zostało zaktualizowane`,
      });

      await fetchSettings();
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować hasła",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Key className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Zarządzanie hasłami dostępu</h2>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Zmiana haseł dostępu wpłynie na wszystkich użytkowników systemu. 
          Upewnij się, że nowe hasła są bezpieczne i zostały przekazane odpowiednim osobom.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Hasło 1 stopnia - Ustawienia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Hasło dostępu 1 stopnia
            </CardTitle>
            <CardDescription>
              Hasło wymagane do dostępu do panelu "Ustawienia"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="level1_password">Nowe hasło</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="level1_password"
                    type={showPasswords.level1 ? "text" : "password"}
                    value={passwords.level1_password}
                    onChange={(e) => handlePasswordChange('level1_password', e.target.value)}
                    placeholder="Wprowadź nowe hasło 1 stopnia"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('level1')}
                  >
                    {showPasswords.level1 ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={() => savePassword('level1_password')}
                  disabled={saving || !passwords.level1_password}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Zapisz
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hasło 2 stopnia - Admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Hasło dostępu 2 stopnia
            </CardTitle>
            <CardDescription>
              Hasło wymagane do dostępu do panelu "Admin"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="level2_password">Nowe hasło</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="level2_password"
                    type={showPasswords.level2 ? "text" : "password"}
                    value={passwords.level2_password}
                    onChange={(e) => handlePasswordChange('level2_password', e.target.value)}
                    placeholder="Wprowadź nowe hasło 2 stopnia"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('level2')}
                  >
                    {showPasswords.level2 ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={() => savePassword('level2_password')}
                  disabled={saving || !passwords.level2_password}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Zapisz
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};