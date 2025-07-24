// src/contexts/UsersContext.tsx - Contexto corregido sin permisos automáticos y sin afectar sesión
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  signOut,
  Auth
} from 'firebase/auth';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db } from '../api/firebase';
import { useAuth } from './AuthContext';

// Interfaces para TypeScript
interface UserPermissions {
  dashboard: boolean;
  activities: boolean;
  products: boolean;
  transfers: boolean;
  purchases: boolean;
  expenses: boolean;
  fumigations: boolean;
  harvests: boolean;
  fields: boolean;
  warehouses: boolean;
  reports: boolean;
  users: boolean;
  admin: boolean;
}

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  permissions: UserPermissions;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any | null;
  isActive: boolean;
}

interface UserData {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
  role?: string;
  permissions?: Partial<UserPermissions>;
}

interface UsersContextType {
  users: User[];
  loading: boolean;
  error: string;
  setError: (error: string) => void;
  loadUsers: () => Promise<User[]>;
  addUser: (userData: UserData) => Promise<string>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<string>;
  deleteUser: (userId: string) => Promise<boolean>;
  updateUserPermissions: (userId: string, permissions: Partial<UserPermissions>) => Promise<string>;
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<string>;
  updateLastLogin: (userId: string) => Promise<void>;
  createMinimalPermissions: () => UserPermissions;
  getRecommendedPermissions: (role?: string) => UserPermissions;
}

interface UsersProviderProps {
  children: ReactNode;
}

// Crear el contexto de usuarios
const UsersContext = createContext<UsersContextType | undefined>(undefined);

export function useUsers(): UsersContextType {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
}

// Configuración de Firebase para instancia secundaria (misma que tu app principal)
const firebaseConfig = {
  apiKey: "AIzaSyCeGZp5Pna87490Ns8Y_5kCtEjxw12VI2g",
  authDomain: "appja-b8f49.firebaseapp.com",
  projectId: "appja-b8f49",
  storageBucket: "appja-b8f49.firebasestorage.app",
  messagingSenderId: "276671305114",
  appId: "1:276671305114:web:121705036997ea74bc1623"
};

// Crear una segunda instancia de Firebase solo para crear usuarios
const secondaryApp: FirebaseApp = initializeApp(firebaseConfig, 'userCreation');
const secondaryAuth: Auth = getAuth(secondaryApp);

// CORREGIDO: Función para crear permisos mínimos (solo dashboard obligatorio)
const createMinimalPermissions = (): UserPermissions => {
  return {
    dashboard: true, // SOLO dashboard obligatorio
    activities: false, // CORREGIDO: Por defecto false
    products: false,
    transfers: false,
    purchases: false,
    expenses: false,
    fumigations: false,
    harvests: false,
    fields: false,
    warehouses: false,
    reports: false,
    users: false,
    admin: false
  };
};

// Función para crear permisos por rol (solo para referencia, no automáticos)
const getRecommendedPermissions = (role: string = 'user'): UserPermissions => {
  switch (role) {
    case 'admin':
      return {
        dashboard: true,
        activities: true,
        products: true,
        transfers: true,
        purchases: true,
        expenses: true,
        fumigations: true,
        harvests: true,
        fields: true,
        warehouses: true,
        reports: true,
        users: true,
        admin: true
      };
    
    case 'manager':
      return {
        dashboard: true,
        activities: true,
        products: true,
        transfers: true,
        purchases: true,
        expenses: true,
        fumigations: true,
        harvests: true,
        fields: true,
        warehouses: true,
        reports: true,
        users: false,
        admin: false
      };
    
    case 'operator':
      return {
        dashboard: true,
        activities: false, // CORREGIDO: No automático
        products: true,
        transfers: true,
        fumigations: true,
        harvests: true,
        fields: false,
        warehouses: false,
        purchases: false,
        expenses: false,
        reports: false,
        users: false,
        admin: false
      };
    
    case 'viewer':
      return {
        dashboard: true,
        activities: false, // CORREGIDO: No automático
        products: true,
        transfers: false,
        purchases: false,
        expenses: false,
        fumigations: false,
        harvests: false,
        fields: false,
        warehouses: false,
        reports: false,
        users: false,
        admin: false
      };
    
    default: // 'user'
      return {
        dashboard: true,
        activities: false, // CORREGIDO: No automático
        products: false,
        transfers: false,
        purchases: false,
        expenses: false,
        fumigations: false,
        harvests: false,
        fields: false,
        warehouses: false,
        reports: false,
        users: false,
        admin: false
      };
  }
};

export function UsersProvider({ children }: UsersProviderProps) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Cargar usuarios
  const loadUsers = useCallback(async (): Promise<User[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Cargando usuarios desde Firestore...'); // Debug
      
      // Crear consulta para obtener todos los usuarios
      const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
      const querySnapshot = await getDocs(usersQuery);
      
      // Mapear documentos a objetos de usuarios
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersData.push({
          id: doc.id,
          email: userData.email || '',
          username: userData.username || '',
          displayName: userData.displayName || '',
          role: userData.role || 'user',
          permissions: userData.permissions || createMinimalPermissions(), // CORREGIDO: Solo permisos mínimos
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          lastLoginAt: userData.lastLoginAt || null,
          isActive: userData.isActive !== false // Por defecto activo
        });
      });
      
      console.log('Total usuarios cargados:', usersData.length); // Debug
      
      setUsers(usersData);
      return usersData;
    } catch (error: any) {
      console.error('Error al cargar usuarios:', error);
      setError('Error al cargar usuarios: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // NUEVO: Función para crear usuario sin afectar la sesión actual
  const createUserWithoutAffectingSession = useCallback(async (userData: UserData): Promise<string> => {
    try {
      console.log('Creando usuario sin afectar sesión actual...', userData);

      // Crear usuario usando la instancia secundaria de Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        userData.email,
        userData.password
      );

      const newUser = userCredential.user;
      console.log('Usuario creado en Auth con instancia secundaria:', newUser.uid);

      // Preparar datos para Firestore
      const userDataForDB = {
        id: newUser.uid,
        email: userData.email,
        username: userData.username || userData.email.split('@')[0],
        displayName: userData.displayName || userData.username || userData.email.split('@')[0],
        role: userData.role || 'user',
        permissions: userData.permissions || createMinimalPermissions(), // CORREGIDO: Solo permisos mínimos
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: null
      };

      console.log('Guardando datos en Firestore:', userDataForDB);

      // Guardar en Firestore usando setDoc para especificar el ID
      await setDoc(doc(db, 'users', newUser.uid), userDataForDB);

      console.log('Usuario guardado exitosamente en Firestore');

      // Cerrar sesión de la instancia secundaria para no afectar la sesión actual
      await signOut(secondaryAuth);
      console.log('Sesión secundaria cerrada');

      // Recargar la lista de usuarios
      await loadUsers();

      return newUser.uid;
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      setError('Error al crear usuario: ' + error.message);
      throw error;
    }
  }, [loadUsers]);

  // Agregar nuevo usuario (ahora usando la función sin afectar sesión)
  const addUser = useCallback(async (userData: UserData): Promise<string> => {
    return await createUserWithoutAffectingSession(userData);
  }, [createUserWithoutAffectingSession]);

  // Actualizar usuario
  const updateUser = useCallback(async (userId: string, userData: Partial<User>): Promise<string> => {
    try {
      setError('');
      
      const updateData = {
        ...userData,
        updatedAt: serverTimestamp()
      };
      
      // Remover campos que no deben actualizarse
      delete updateData.id;
      delete updateData.createdAt;
      
      await updateDoc(doc(db, 'users', userId), updateData);
      
      // Recargar usuarios
      await loadUsers();
      
      return userId;
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error);
      setError('Error al actualizar usuario: ' + error.message);
      throw error;
    }
  }, [loadUsers]);

  // Eliminar usuario
  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setError('');
      
      // Eliminar de Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      // Recargar usuarios
      await loadUsers();
      
      return true;
    } catch (error: any) {
      console.error('Error al eliminar usuario:', error);
      setError('Error al eliminar usuario: ' + error.message);
      throw error;
    }
  }, [loadUsers]);

  // Actualizar permisos de usuario
  const updateUserPermissions = useCallback(async (userId: string, permissions: Partial<UserPermissions>): Promise<string> => {
    try {
      setError('');
      
      // Obtener permisos actuales y fusionar con los nuevos
      const currentUser = users.find(user => user.id === userId);
      const currentPermissions = currentUser?.permissions || createMinimalPermissions();
      
      const updatedPermissions = {
        ...currentPermissions,
        ...permissions
      };
      
      const updateData = {
        permissions: updatedPermissions,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.id || 'system'
      };
      
      await updateDoc(doc(db, 'users', userId), updateData);
      
      // Recargar usuarios
      await loadUsers();
      
      return userId;
    } catch (error: any) {
      console.error(`Error al actualizar permisos del usuario ${userId}:`, error);
      setError('Error al actualizar permisos: ' + error.message);
      throw error;
    }
  }, [loadUsers, currentUser, users]);

  // Desactivar/activar usuario
  const toggleUserStatus = useCallback(async (userId: string, isActive: boolean): Promise<string> => {
    try {
      setError('');
      
      const updateData = {
        isActive: isActive,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'system'
      };
      
      await updateDoc(doc(db, 'users', userId), updateData);
      
      // Recargar usuarios
      await loadUsers();
      
      return userId;
    } catch (error: any) {
      console.error(`Error al cambiar estado del usuario ${userId}:`, error);
      setError('Error al cambiar estado del usuario: ' + error.message);
      throw error;
    }
  }, [loadUsers, currentUser]);

  // Registrar último login (se puede llamar desde el AuthContext)
  const updateLastLogin = useCallback(async (userId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        lastLoginAt: serverTimestamp()
      });
    } catch (error: any) {
      console.warn('Error al actualizar último login:', error);
      // No lanzar error para no interrumpir el flujo de login
    }
  }, []);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Solo cargar usuarios si el usuario actual tiene permisos de administración
    if (currentUser.permissions?.users || currentUser.permissions?.admin) {
      console.log('Cargando usuarios iniciales...'); // Debug
      
      loadUsers()
        .then(() => {
          console.log('Usuarios cargados exitosamente'); // Debug
        })
        .catch((err: any) => {
          console.error('Error al cargar datos iniciales de usuarios:', err);
          setError('Error al cargar datos: ' + err.message);
        });
    } else {
      console.log('Usuario sin permisos para gestionar usuarios'); // Debug
      setUsers([]);
      setLoading(false);
    }
  }, [currentUser, loadUsers]);

  // Valor que se proporcionará a través del contexto
  const value: UsersContextType = {
    users,
    loading,
    error,
    setError,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
    updateUserPermissions,
    toggleUserStatus,
    updateLastLogin,
    createMinimalPermissions, // CORREGIDO: Función de permisos mínimos
    getRecommendedPermissions // Para usar como referencia, no automático
  };

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
}

export default UsersContext;