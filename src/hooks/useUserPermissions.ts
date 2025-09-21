import { useUserRole } from './useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export const useUserPermissions = () => {
  const { user } = useAuth();
  const { role, loading, isAdmin, canDeleteEquipment, canDeleteWarehouses } = useUserRole();

  const isAuthenticated = !!user;
  
  return {
    role,
    loading,
    isAuthenticated,
    isAdmin,
    canDeleteEquipment,
    canDeleteWarehouses,
    // Can manage anything if admin or authenticated (pracownik can do most things except delete)
    canManageProjects: isAuthenticated,
    canManageDepartments: isAuthenticated,
    canManageEquipment: isAuthenticated,
    canAddEquipment: isAuthenticated,
    canMoveEquipment: isAuthenticated,
    canUpdateEquipment: isAuthenticated,
    canManageWarehouses: isAuthenticated,
    canAddWarehouses: isAuthenticated,
    // Only admin can delete
    canDeleteProjects: isAdmin,
    canDeleteDepartments: isAdmin,
  };
};