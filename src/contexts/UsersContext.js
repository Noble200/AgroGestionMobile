// src/contexts/UsersContext.js - Contexto corregido sin permisos automáticos y sin afectar sesión
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  signOut
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db } from '../api/firebase';
import { useAuth } from './AuthContext';

// Crear el contexto de usuarios
const UsersContext = createContext();

export function useUsers() {
  return useContext(UsersContext);
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
const secondaryApp = initializeApp(firebaseConfig, 'userCreation');
const secondaryAuth = getAuth(secondaryApp);

// CORREGIDO: Función para crear permisos mínimos (solo dashboard obligatorio)
const createMinimalPermissions = () => {
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
const getRecommendedPermissions = (role = 'user') => {
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

export function UsersProvider({ children }) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar usuarios
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Cargando usuarios desde Firestore...'); // Debug
      
      // Crear consulta para obtener todos los usuarios
      const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
      const querySnapshot = await getDocs(usersQuery);
      
      // Mapear documentos a objetos de usuarios
      const usersData = [];
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
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setError('Error al cargar usuarios: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // NUEVO: Función para crear usuario sin afectar la sesión actual
  const createUserWithoutAffectingSession = useCallback(async (userData) => {
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
        permissions: userData.permissions || createMinimalPermissions(),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid || 'system'
      };

      // Guardar en Firestore usando la instancia principal de db
      await setDoc(doc(db, 'users', newUser.uid), userDataForDB);
      console.log('Usuario guardado en Firestore');

      // Cerrar sesión solo de la instancia secundaria
      await signOut(secondaryAuth);
      console.log('Sesión cerrada en instancia secundaria (no afecta sesión principal)');

      return newUser.uid;

    } catch (error) {
      console.error('Error al crear usuario:', error);
      
      // Asegurar que se cierre la sesión secundaria en caso de error
      try {
        await signOut(secondaryAuth);
      } catch (signOutError) {
        console.warn('Error al cerrar sesión secundaria:', signOutError);
      }
      
      throw error;
    }
  }, [currentUser]);

  // Añadir un usuario - VERSIÓN CORREGIDA que no afecta la sesión
  const addUser = useCallback(async (userData) => {
    try {
      setError('');
      
      console.log('Creando usuario:', userData); // Debug
      
      // Verificar que el email y password estén presentes
      if (!userData.email || !userData.password) {
        throw new Error('Email y contraseña son obligatorios');
      }
      
      // Verificar si el nombre de usuario ya existe
      if (userData.username) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', userData.username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          throw new Error('El nombre de usuario ya está en uso');
        }
      }

      // NUEVA IMPLEMENTACIÓN: Usar función que no afecta la sesión
      const newUserId = await createUserWithoutAffectingSession(userData);
      
      console.log('Usuario creado exitosamente con ID:', newUserId); // Debug
      
      // Recargar usuarios
      await loadUsers();
      
      return newUserId;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setError('Error al crear usuario: ' + error.message);
      throw error;
    }
  }, [loadUsers, createUserWithoutAffectingSession]);

  // Actualizar un usuario
  const updateUser = useCallback(async (userId, userData) => {
    try {
      setError('');
      
      console.log('Actualizando usuario:', userId, userData); // Debug
      
      // Verificar si el nombre de usuario ya existe (excluyendo el usuario actual)
      if (userData.username) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', userData.username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== userId) {
          throw new Error('El nombre de usuario ya está en uso');
        }
      }
      
      // Preparar datos para actualizar (excluir campos sensibles)
      const { password, id, uid, createdAt, createdBy, ...updateData } = userData;
      
      const finalUpdateData = {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'system'
      };
      
      // CORREGIDO: Si no se proporcionan permisos, usar solo los mínimos
      if (!finalUpdateData.permissions) {
        finalUpdateData.permissions = createMinimalPermissions();
      }
      
      console.log('Datos finales de actualización:', finalUpdateData); // Debug
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', userId), finalUpdateData);
      
      console.log('Usuario actualizado exitosamente'); // Debug
      
      // Recargar usuarios
      await loadUsers();
      
      return userId;
    } catch (error) {
      console.error(`Error al actualizar usuario ${userId}:`, error);
      setError('Error al actualizar usuario: ' + error.message);
      throw error;
    }
  }, [loadUsers, currentUser]);

  // Eliminar un usuario
  const deleteUser = useCallback(async (userId) => {
    try {
      setError('');
      
      console.log('Eliminando usuario:', userId); // Debug
      
      // Verificar que no se esté eliminando el usuario actual
      if (userId === currentUser?.uid) {
        throw new Error('No puedes eliminar tu propia cuenta');
      }
      
      // Eliminar de Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      console.log('Usuario eliminado de Firestore'); // Debug
      
      // Recargar usuarios
      await loadUsers();
      
      return true;
    } catch (error) {
      console.error(`Error al eliminar usuario ${userId}:`, error);
      setError('Error al eliminar usuario: ' + error.message);
      throw error;
    }
  }, [loadUsers, currentUser]);

  // CORREGIDO: Actualizar permisos de un usuario (sin permisos automáticos)
  const updateUserPermissions = useCallback(async (userId, permissions) => {
    try {
      setError('');
      
      console.log('Actualizando permisos del usuario:', userId, permissions); // Debug
      
      // CORREGIDO: Asegurar que dashboard esté siempre activo (es el único obligatorio)
      const finalPermissions = {
        ...permissions,
        dashboard: true // SOLO este es obligatorio
      };
      
      const updateData = {
        permissions: finalPermissions,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'system'
      };
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', userId), updateData);
      
      console.log('Permisos actualizados exitosamente'); // Debug
      
      // Recargar usuarios
      await loadUsers();
      
      return userId;
    } catch (error) {
      console.error(`Error al actualizar permisos del usuario ${userId}:`, error);
      setError('Error al actualizar permisos: ' + error.message);
      throw error;
    }
  }, [loadUsers, currentUser]);

  // Desactivar/activar usuario
  const toggleUserStatus = useCallback(async (userId, isActive) => {
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
    } catch (error) {
      console.error(`Error al cambiar estado del usuario ${userId}:`, error);
      setError('Error al cambiar estado del usuario: ' + error.message);
      throw error;
    }
  }, [loadUsers, currentUser]);

  // Registrar último login (se puede llamar desde el AuthContext)
  const updateLastLogin = useCallback(async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        lastLoginAt: serverTimestamp()
      });
    } catch (error) {
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
        .catch(err => {
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
  const value = {
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