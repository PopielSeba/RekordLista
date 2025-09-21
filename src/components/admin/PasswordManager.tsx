import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePasswordManager } from '@/hooks/usePasswordManager';
import { Eye, EyeOff, Edit, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const PasswordManager = () => {
  const { passwords, loading, updatePassword } = usePasswordManager();
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (passwordId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [passwordId]: !prev[passwordId]
    }));
  };

  const handleEdit = (passwordId: string, currentValue: string) => {
    setEditingPassword(passwordId);
    setNewValue(currentValue);
  };

  const handleSave = async () => {
    if (!editingPassword) return;

    const result = await updatePassword(editingPassword, newValue);
    if (result.success) {
      toast({
        title: "Sukces",
        description: "Hasło zostało zaktualizowane"
      });
      setEditingPassword(null);
      setNewValue('');
    } else {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować hasła",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingPassword(null);
    setNewValue('');
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Zarządzanie hasłami systemowymi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {passwords.map((password) => (
          <div key={password.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <h3 className="font-medium">{password.password_name}</h3>
              <p className="text-sm text-muted-foreground">{password.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor={`password-${password.id}`}>Hasło:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`password-${password.id}`}
                    type={showPasswords[password.id] ? 'text' : 'password'}
                    value={password.password_value}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePasswordVisibility(password.id)}
                  >
                    {showPasswords[password.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <Dialog open={editingPassword === password.id} onOpenChange={handleCancel}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(password.id, password.password_value)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edytuj
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edytuj hasło</DialogTitle>
                  <DialogDescription>
                    Zmień wartość hasła: {password.password_name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-password">Nowe hasło</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Wprowadź nowe hasło"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCancel}>
                    Anuluj
                  </Button>
                  <Button onClick={handleSave}>
                    Zapisz
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
