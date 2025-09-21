import { useUserRole } from './useUserRole';
import { useAuth } from '@/contexts/AuthContext';

export const useUserPermissions = () => {
  const { user } = useAuth();
  const { role, loading, isAdmin, canDeleteEquipment, canDeleteWarehouses } = useUserRole();

  const isAuthenticated = !!user;
  
  // Role-based permissions
  const isKoordynacjaPrzesylek = role === 'koordynacja_przesylek';
  const isPracownikDzialu = role === 'pracownik_dzialu';
  const isPracownikBudowy = role === 'pracownik_budowy';
  
  return {
    role,
    loading,
    isAuthenticated,
    isAdmin,
    isKoordynacjaPrzesylek,
    isPracownikDzialu,
    isPracownikBudowy,
    canDeleteEquipment,
    canDeleteWarehouses,
    
    // Basic permissions - all authenticated users can do these
    canManageProjects: isAuthenticated,
    canManageDepartments: isAuthenticated,
    canManageEquipment: isAuthenticated,
    canAddEquipment: isAuthenticated,
    canUpdateEquipment: isAuthenticated,
    canManageWarehouses: isAuthenticated,
    canAddWarehouses: isAuthenticated,
    
    // Movement permissions based on role
    canMoveEquipment: isAuthenticated,
    canMoveFromDepartments: isPracownikDzialu || isAdmin,
    canMoveToCoordination: isKoordynacjaPrzesylek || isPracownikDzialu || isAdmin,
    canMoveFromCoordination: isKoordynacjaPrzesylek || isPracownikBudowy || isAdmin,
    canMoveToWarehouses: isKoordynacjaPrzesylek || isPracownikBudowy || isAdmin,
    canMoveFromWarehouses: isKoordynacjaPrzesylek || isPracownikBudowy || isAdmin,
    
    // Delete permissions - only admin can delete
    canDeleteProjects: isAdmin,
    canDeleteDepartments: isAdmin,
    
    // Equipment deletion - requires password for pracownik_dzialu
    canDeleteEquipmentWithoutPassword: isAdmin || isKoordynacjaPrzesylek,
    canDeleteEquipmentWithPassword: isPracownikDzialu,
  };
};