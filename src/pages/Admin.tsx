import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Package,
  FolderOpen
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { AdminProjects } from './AdminProjects';
import { AdminDepartments } from './AdminDepartments';
import { AdminEquipment } from './AdminEquipment';

const Admin = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ustawienia</h1>
            <p className="text-muted-foreground">Zarządzanie systemem PPP</p>
          </div>
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
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
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;