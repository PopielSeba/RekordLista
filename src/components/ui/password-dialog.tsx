import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePasswordManager } from '@/hooks/usePasswordManager';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  passwordName?: string;
}

export const PasswordDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  title = "Wymagane hasło 3 stopnia",
  description = "Wprowadź hasło 3 stopnia, aby kontynuować",
  passwordName = "haslo_3_stopnia"
}: PasswordDialogProps) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { checkPassword } = usePasswordManager();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await checkPassword(passwordName, password);
      
      if (result.success && result.isValid) {
        onSuccess();
        setPassword('');
        onOpenChange(false);
        toast({
          title: "Sukces",
          description: "Hasło zostało zweryfikowane"
        });
      } else {
        toast({
          title: "Błąd",
          description: "Nieprawidłowe hasło",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking password:', error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas weryfikacji hasła",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Hasło 3 stopnia</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Wprowadź hasło"
                required
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Anuluj
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Weryfikacja...' : 'Potwierdź'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
