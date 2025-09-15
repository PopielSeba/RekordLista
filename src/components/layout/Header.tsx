import { User, LogOut, Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';
import { useState } from 'react';

export const Header = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { passwords } = useSecuritySettings();
  const [password, setPassword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const handleSettingsClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsDialogOpen(true);
    setPassword('');
    setError('');
  };

  const handlePasswordSubmit = () => {
    if (password === passwords.level1_password) {
      setIsDialogOpen(false);
      navigate('/admin');
      setPassword('');
      setError('');
    } else {
      setError('Nieprawidłowe hasło dostępu');
    }
  };

  const handleAdminClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setIsAdminDialogOpen(true);
    setAdminPassword('');
    setError('');
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPassword === passwords.level2_password) {
      setIsAdminDialogOpen(false);
      navigate('/super-admin');
      setAdminPassword('');
      setError('');
    } else {
      setError('Nieprawidłowe hasło dostępu');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/projects');
  };
  
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/')}
          title="Powrót do projektów"
          className="h-10 w-10 p-0"
        >
          <Home className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          PPP-Program :: system checklista
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {user && profile && (
          <div className="flex items-center gap-2 text-sm">
            <div className="text-right">
              <div className="font-medium text-foreground">{profile.display_name || profile.email}</div>
              <div className="text-xs text-muted-foreground">Użytkownik</div>
            </div>
          </div>
        )}
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 px-4 border-2 hover:bg-primary hover:text-primary-foreground"
              onClick={handleSettingsClick}
              title={user ? "Ustawienia" : "Zaloguj się"}
            >
              <Settings className="h-5 w-5 mr-2" />
              <span className="font-medium">Ustawienia</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dostęp do ustawień</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Hasło dostępu 1 stopnia</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Wprowadź hasło"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handlePasswordSubmit}>
                  Potwierdź
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 px-4 border-2 hover:bg-primary hover:text-primary-foreground"
              onClick={handleAdminClick}
              title={user ? "Admin" : "Zaloguj się"}
            >
              <User className="h-5 w-5 mr-2" />
              <span className="font-medium">Admin</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dostęp administratora</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Hasło dostępu 2 stopnia</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminPasswordSubmit()}
                  placeholder="Wprowadź hasło"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAdminDialogOpen(false)}>
                  Anuluj
                </Button>
                <Button onClick={handleAdminPasswordSubmit}>
                  Potwierdź
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {user && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            title="Wyloguj się"
            className="h-10 px-3 border-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Wyloguj</span>
          </Button>
        )}
      </div>
    </header>
  );
};