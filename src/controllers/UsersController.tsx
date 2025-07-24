// src/controllers/UsersController.tsx - Controlador para gestión de usuarios con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useUsers } from '../contexts/UsersContext';
import { useActivityLogger } from '../hooks/useActivityLogger';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
interface ControllerUser {
  id: string;
  displayName?: string;
  username?: string;
  email: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer' | 'user';
  permissions?: Record<string, boolean>;
  active?: boolean;
  lastLogin?: any; // Firebase Timestamp
  createdAt?: any; // Firebase Timestamp
  updatedAt?: any; // Firebase Timestamp
  [key: string]: any;
}

interface Permissions {
  [key: string]: boolean;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  roles: FilterOption[];
  status: FilterOption[];
}

interface Statistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  managerUsers: number;
  operatorUsers: number;
  viewerUsers: number;
  basicUsers: number;
}

interface UserChange {
  field: string;
  oldValue: string;
  newValue: string;
}

type DialogType = 'add-user' | 'edit-user' | 'view-user' | 'permissions' | '';

interface UseUsersControllerReturn {
  users: ControllerUser[];
  loading: boolean;
  error: string;
  selectedUser: ControllerUser | null;
  dialogOpen: boolean;
  dialogType: DialogType;
  filterOptions: FilterOptions;
  statistics: Statistics;
  handleAddUser: () => void;
  handleEditUser: (user: ControllerUser) => void;
  handleViewUser: (user: ControllerUser) => void;
  handleManagePermissions: (user: ControllerUser) => void;
  handleDeleteUser: (userId: string) => Promise<void>;
  handleSaveUser: (userData: Partial<ControllerUser>) => Promise<boolean>;
  handleSavePermissions: (permissions: Permissions) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: string) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  refreshData: () => Promise<void>;
}

const useUsersController = (): UseUsersControllerReturn => {
  const {
    users: stockUsers,
    loading: usersLoading,
    error: usersError,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
    updateUserPermissions
  } = useUsers();

  const { logUser } = useActivityLogger();

  // Convertir usuarios del contexto a nuestro tipo local
  const users: ControllerUser[] = stockUsers.map(user => {
    const userAny = user as any;
    
    const baseUser: ControllerUser = {
      id: userAny.id || '',
      displayName: userAny.displayName,
      username: userAny.username,
      email: userAny.email || '',
      role: userAny.role || 'user',
      permissions: userAny.permissions || {},
      active: userAny.active !== false, // Por defecto true
      lastLogin: userAny.lastLogin,
      createdAt: userAny.createdAt,
      updatedAt: userAny.updatedAt
    };
    
    return baseUser;
  });

  // Estados locales
  const [selectedUser, setSelectedUser] = useState<ControllerUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<DialogType>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredUsersList, setFilteredUsersList] = useState<ControllerUser[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all'
  });

  // Actualizar estado de carga y error
  useEffect(() => {
    setLoading(usersLoading);
    if (usersError) {
      setError(usersError);
    } else {
      setError('');
    }
  }, [usersLoading, usersError]);

  // Cargar usuarios al iniciar
  useEffect(() => {
    loadData();
  }, []);

  // Función para cargar datos
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      await loadUsers();
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
      setError('Error al cargar usuarios: ' + err.message);
    }
  }, [loadUsers]);

  // Filtrar usuarios según la búsqueda y filtros
  const getFilteredUsers = useCallback((): ControllerUser[] => {
    if (!Array.isArray(users) || users.length === 0) return [];
    
    let filtered = users;
    
    // Filtro por rol
    if (filters.role !== 'all') {
      filtered = filtered.filter((user: ControllerUser) => user.role === filters.role);
    }
    
    // Filtro por estado
    if (filters.status !== 'all') {
      filtered = filtered.filter((user: ControllerUser) => {
        if (filters.status === 'active') return user.active !== false;
        if (filters.status === 'inactive') return user.active === false;
        return true;
      });
    }
    
    // Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((user: ControllerUser) => {
        const searchableFields = [
          user.displayName,
          user.username,
          user.email
        ].filter(Boolean);
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(term)
        );
      });
    }
    
    return filtered;
  }, [users, searchTerm, filters]);

  // Actualizar usuarios filtrados cuando cambia la búsqueda, filtros o usuarios
  useEffect(() => {
    setFilteredUsersList(getFilteredUsers());
  }, [getFilteredUsers]);

  // Abrir diálogo para añadir usuario
  const handleAddUser = useCallback((): void => {
    setSelectedUser(null);
    setDialogType('add-user');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar usuario
  const handleEditUser = useCallback((user: ControllerUser): void => {
    setSelectedUser(user);
    setDialogType('edit-user');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de usuario
  const handleViewUser = useCallback((user: ControllerUser): void => {
    setSelectedUser(user);
    setDialogType('view-user');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para gestionar permisos
  const handleManagePermissions = useCallback((user: ControllerUser): void => {
    setSelectedUser(user);
    setDialogType('permissions');
    setDialogOpen(true);
  }, []);

  // Confirmar eliminación de usuario
  const handleDeleteUser = useCallback(async (userId: string): Promise<void> => {
    const user = users.find((u: ControllerUser) => u.id === userId);
    
    if (!user) {
      setError('Usuario no encontrado');
      return;
    }

    const confirmMessage = `¿Estás seguro de que deseas eliminar al usuario "${user.displayName || user.username}"? Esta acción no se puede deshacer.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        setError('');
        
        await deleteUser(userId);
        
        // Registrar actividad
        await logUser('delete', user, {
          deletedBy: 'admin',
          reason: 'Eliminación manual desde panel de usuarios'
        });
        
        // Cerrar el diálogo si estaba abierto para este usuario
        if (selectedUser && selectedUser.id === userId) {
          setDialogOpen(false);
          setSelectedUser(null);
        }
        
        // Recargar datos
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar usuario:', err);
        setError('Error al eliminar usuario: ' + err.message);
      }
    }
  }, [deleteUser, selectedUser, users, logUser, loadData]);

  // Guardar usuario (nuevo o editado)
  const handleSaveUser = useCallback(async (userData: Partial<ControllerUser>): Promise<boolean> => {
    try {
      setError('');
      
      if (dialogType === 'add-user') {
        // Convertir datos para el contexto
        const contextUserData: any = {
          displayName: userData.displayName,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          permissions: userData.permissions,
          active: userData.active !== false
        };
        
        // Crear nuevo usuario
        const userId = await addUser(contextUserData);
        
        // Registrar actividad
        await logUser('create', {
          id: userId,
          ...userData
        }, {
          role: userData.role,
          permissions: Object.keys(userData.permissions || {}).filter(key => userData.permissions![key])
        });
        
      } else if (dialogType === 'edit-user' && selectedUser) {
        // Convertir datos para el contexto
        const contextUserData: any = {
          displayName: userData.displayName,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          permissions: userData.permissions,
          active: userData.active
        };
        
        // Actualizar usuario existente
        await updateUser(selectedUser.id, contextUserData);
        
        // Registrar actividad
        await logUser('update', {
          id: selectedUser.id,
          ...userData
        }, {
          previousRole: selectedUser.role,
          newRole: userData.role,
          changedFields: getChangedFields(selectedUser, userData as ControllerUser)
        });
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedUser(null);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al guardar usuario:', err);
      setError('Error al guardar usuario: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedUser, addUser, updateUser, logUser, loadData]);

  // Actualizar permisos de usuario
  const handleSavePermissions = useCallback(async (permissions: Permissions): Promise<boolean> => {
    try {
      if (!selectedUser) return false;
      
      setError('');
      
      await updateUserPermissions(selectedUser.id, permissions);
      
      // Registrar actividad
      await logUser('permissions-update', selectedUser, {
        previousPermissions: Object.keys(selectedUser.permissions || {}).filter(key => selectedUser.permissions![key]),
        newPermissions: Object.keys(permissions).filter(key => permissions[key]),
        permissionsAdded: getAddedPermissions(selectedUser.permissions, permissions),
        permissionsRemoved: getRemovedPermissions(selectedUser.permissions, permissions)
      });
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedUser(null);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al actualizar permisos:', err);
      setError('Error al actualizar permisos: ' + err.message);
      throw err;
    }
  }, [selectedUser, updateUserPermissions, logUser, loadData]);

  // Cambiar filtros
  const handleFilterChange = useCallback((filterName: string, value: string): void => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Buscar por texto
  const handleSearch = useCallback((term: string): void => {
    setSearchTerm(term);
  }, []);

  // Cerrar diálogo
  const handleCloseDialog = useCallback((): void => {
    setDialogOpen(false);
    setSelectedUser(null);
  }, []);

  // Calcular estadísticas de usuarios
  const getStatistics = useCallback((): Statistics => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u: ControllerUser) => u.active !== false).length;
    const inactiveUsers = users.filter((u: ControllerUser) => u.active === false).length;
    const adminUsers = users.filter((u: ControllerUser) => u.role === 'admin').length;
    const managerUsers = users.filter((u: ControllerUser) => u.role === 'manager').length;
    const operatorUsers = users.filter((u: ControllerUser) => u.role === 'operator').length;
    const viewerUsers = users.filter((u: ControllerUser) => u.role === 'viewer').length;
    const basicUsers = users.filter((u: ControllerUser) => u.role === 'user').length;
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      managerUsers,
      operatorUsers,
      viewerUsers,
      basicUsers
    };
  }, [users]);

  // Opciones para filtros
  const filterOptions: FilterOptions = {
    roles: [
      { value: 'all', label: 'Todos los roles' },
      { value: 'admin', label: 'Administrador' },
      { value: 'manager', label: 'Gerente' },
      { value: 'operator', label: 'Operador' },
      { value: 'viewer', label: 'Visualizador' },
      { value: 'user', label: 'Usuario básico' }
    ],
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'active', label: 'Activos' },
      { value: 'inactive', label: 'Inactivos' }
    ]
  };

  return {
    users: filteredUsersList,
    loading,
    error,
    selectedUser,
    dialogOpen,
    dialogType,
    filterOptions,
    statistics: getStatistics(),
    handleAddUser,
    handleEditUser,
    handleViewUser,
    handleManagePermissions,
    handleDeleteUser,
    handleSaveUser,
    handleSavePermissions,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

// Funciones auxiliares tipadas
function getChangedFields(oldUser: ControllerUser, newUser: ControllerUser): string[] {
  const changes: string[] = [];
  const fieldsToCheck: (keyof ControllerUser)[] = ['displayName', 'username', 'email', 'role'];
  
  fieldsToCheck.forEach(field => {
    if (oldUser[field] !== newUser[field]) {
      changes.push(`${String(field)}: ${oldUser[field]} → ${newUser[field]}`);
    }
  });
  
  return changes;
}

function getAddedPermissions(oldPermissions: Permissions = {}, newPermissions: Permissions = {}): string[] {
  const added: string[] = [];
  
  Object.keys(newPermissions).forEach(permission => {
    if (newPermissions[permission] && !oldPermissions[permission]) {
      added.push(permission);
    }
  });
  
  return added;
}

function getRemovedPermissions(oldPermissions: Permissions = {}, newPermissions: Permissions = {}): string[] {
  const removed: string[] = [];
  
  Object.keys(oldPermissions).forEach(permission => {
    if (oldPermissions[permission] && !newPermissions[permission]) {
      removed.push(permission);
    }
  });
  
  return removed;
}

export default useUsersController;