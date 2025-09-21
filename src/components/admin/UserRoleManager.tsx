import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Users, Shield, Truck, Building2, Wrench } from 'lucide-react';

interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  pracownik: 'Pracownik',
  koordynacja_przesylek: 'Koordynacja przesyłek',
  pracownik_dzialu: 'Pracownik działu',
  pracownik_budowy: 'Pracownik budowy',
  null: 'Brak roli'
};

const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  pracownik: <Users className="h-4 w-4" />,
  koordynacja_przesylek: <Truck className="h-4 w-4" />,
  pracownik_dzialu: <Building2 className="h-4 w-4" />,
  pracownik_budowy: <Wrench className="h-4 w-4" />,
  null: <Users className="h-4 w-4" />
};

const roleDescriptions: Record<UserRole, string> = {
  admin: 'Może wszystko',
  pracownik: 'Podstawowe uprawnienia',
  koordynacja_przesylek: 'Może wszystko po podaniu hasła 3 stopnia',
  pracownik_dzialu: 'Może przenosić sprzęt z działów do koordynacji',
  pracownik_budowy: 'Może przenosić sprzęt między określonymi kafelkami',
  null: 'Brak uprawnień'
};

export const UserRoleManager = () => {
  const { isAdmin } = useUserPermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          role: (userRole?.role as UserRole) || null
        };
      }) || [];

      setUsers(usersWithRoles);
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

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      if (newRole === null) {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Upsert role
        const { error } = await supabase
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: newRole
          });
        
        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: "Sukces",
        description: "Rola użytkownika została zaktualizowana"
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować roli użytkownika",
        variant: "destructive"
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Brak uprawnień do zarządzania rolami użytkowników.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Zarządzanie rolami użytkowników
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-medium">{user.display_name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {roleIcons[user.role]}
                  {roleLabels[user.role]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {roleDescriptions[user.role]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={user.role || 'null'}
                onValueChange={(value) => updateUserRole(user.id, value === 'null' ? null : value as UserRole)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Brak roli</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="pracownik">Pracownik</SelectItem>
                  <SelectItem value="koordynacja_przesylek">Koordynacja przesyłek</SelectItem>
                  <SelectItem value="pracownik_dzialu">Pracownik działu</SelectItem>
                  <SelectItem value="pracownik_budowy">Pracownik budowy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};