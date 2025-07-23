// src/contexts/AuthContext.js - ACTUALIZADO: Sin permisos automáticos
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../api/firebase';
import usersService from '../api/usersService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Función para crear permisos vacíos (sin permisos automáticos)
  const createEmptyPermissions = () => {
    return {
      dashboard: false,
      activities: false,
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

  async function login(email, password) {
    try {
      setError('');
      const userData = await usersService.login(email, password);
      return userData;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setError('Error al iniciar sesión: ' + error.message);
      throw error;
    }
  }

  async function loginWithUsername(username, password) {
    try {
      setError('');
      const userData = await usersService.loginWithUsername(username, password);
      return userData;
    } catch (error) {
      console.error('Error al iniciar sesión con nombre de usuario:', error);
      setError('Error al iniciar sesión: ' + error.message);
      throw error;
    }
  }

  async function logout() {
    try {
      setError('');
      await usersService.logout();
      return true;
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setError('Error al cerrar sesión: ' + error.message);
      throw error;
    }
  }

  // ACTUALIZADO: Verificar permisos sin automáticos
  function hasPermission(permission) {
    if (!currentUser || !currentUser.permissions) return false;
    
    // Los administradores tienen todos los permisos
    if (currentUser.permissions.admin === true) {
      return true;
    }
    
    // Verificar permiso específico (debe estar explícitamente en true)
    return currentUser.permissions[permission] === true;
  }

  useEffect(() => {
    setLoading(true);
    console.log('Inicializando contexto de autenticación...');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log('Usuario autenticado detectado:', user.email);
          
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          let userData = {};
          if (userDoc.exists()) {
            userData = userDoc.data();
          }
          
          // ACTUALIZADO: NO asignar permisos automáticos
          let permissions = userData.permissions || createEmptyPermissions();
          
          // NO agregar permisos automáticos - usar solo los asignados
          
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            username: userData.username || user.email.split('@')[0],
            displayName: userData.displayName || userData.username || user.email.split('@')[0],
            emailVerified: user.emailVerified,
            role: userData.role || 'user',
            permissions: permissions // Solo los permisos asignados explícitamente
          });
        } else {
          console.log('No hay usuario autenticado, limpiando estado');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error al procesar cambio de autenticación:', error);
        setError('Error al obtener datos completos del usuario: ' + error.message);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log('Limpiando suscripciones de autenticación');
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    login,
    loginWithUsername,
    logout,
    hasPermission, // ACTUALIZADO: Sin permisos automáticos
    error,
    setError,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;