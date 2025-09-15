import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Package,
  FolderOpen,
  Users,
  Shield
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { AdminProjects } from './AdminProjects';
import { AdminDepartments } from './AdminDepartments';
import { AdminEquipment } from './AdminEquipment';
import { SecurityPasswordManager } from '@/components/security/SecurityPasswordManager';
import { UserRoleManager } from '@/components/admin/UserRoleManager';

const SuperAdmin = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel Administratora</h1>
            <p className="text-muted-foreground">Zaawansowane zarządzanie systemem PPP</p>
          </div>
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Projekty
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Działy
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Sprzęt
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Użytkownicy
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Bezpieczeństwo
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects" className="mt-6">
            <AdminProjects />
          </TabsContent>
          
          <TabsContent value="departments" className="mt-6">
            <AdminDepartments />
          </TabsContent>
          
          <TabsContent value="equipment" className="mt-6">
            <AdminEquipment />
          </TabsContent>
          
          <TabsContent value="users" className="mt-6">
            <UserRoleManager />
          </TabsContent>
          
          <TabsContent value="security" className="mt-6">
            <SecurityPasswordManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SuperAdmin;