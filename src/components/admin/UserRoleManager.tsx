import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'pracownik';
  assigned_at: string;
}

export const UserRoleManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          email,
          display_name,
          user_roles (
            role,
            assigned_at
          )
        `);

      if (error) throw error;

      const formattedUsers = data?.map(user => {
        const userRole = Array.isArray(user.user_roles) ? user.user_roles[0] : user.user_roles;
        return {
          id: user.user_id,
          email: user.email || '',
          display_name: user.display_name || user.email || 'Nieznany użytkownik',
          role: userRole?.role || 'pracownik',
          assigned_at: userRole?.assigned_at || new Date().toISOString()
        };
      }) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy użytkowników",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'pracownik') => {
    setUpdating(userId);
    try {
      // Najpierw sprawdź czy użytkownik już ma rolę
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Aktualizuj istniejącą rolę
        const { error } = await supabase
          .from('user_roles')
          .update({ 
            role: newRole,
            assigned_by: (await supabase.auth.getUser()).data.user?.id,
            assigned_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Utwórz nową rolę
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: newRole,
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
      }

      toast({
        title: "Sukces",
        description: `Rola użytkownika została zaktualizowana na: ${newRole}`,
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować roli użytkownika",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'destructive' : 'secondary';
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrator' : 'Pracownik';
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
        <Users className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Zarządzanie użytkownikami</h2>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{user.display_name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Przypisano: {new Date(user.assigned_at).toLocaleDateString('pl-PL')}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value: 'admin' | 'pracownik') => updateUserRole(user.id, value)}
                    disabled={updating === user.id}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pracownik">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Pracownik
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Administrator
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {updating === user.id && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {users.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Brak użytkowników</h3>
              <p className="text-muted-foreground">W systemie nie ma jeszcze żadnych zarejestrowanych użytkowników.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};