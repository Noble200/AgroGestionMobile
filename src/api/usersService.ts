// src/api/usersService.ts - CORREGIDO con tipado completo
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  orderBy,
  where
} from 'firebase/firestore';
import { auth, db } from './firebase';

// Tipos para usersService
interface Permissions {
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

interface UserData {
  id?: string;
  email: string;
  username?: string;
  displayName?: string;
  role?: string;
  permissions?: Permissions;
  password?: string;
  sendVerification?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

// CORREGIDO: Función para crear permisos mínimos (solo dashboard obligatorio)
const createMinimalPermissions = (): Permissions => {
  return {
    dashboard: true, // SOLO este es obligatorio
    activities: false, // CORREGIDO: Por defecto false y NO obligatorio
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

// Función para crear permisos por defecto según el rol (solo para referencia, NO automáticos)
const createDefaultPermissions = (role: string = 'user'): Permissions => {
  switch (role) {
    case 'admin':
      return {
        dashboard: true,
        activities: true, // Solo sugerido para admin
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
        activities: false, // CORREGIDO: No automático ni para managers
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

const usersService = {
  login: async (email: string, password: string) => {
    try {
      console.log('Iniciando proceso de login con email...');
      
      // Iniciar sesión con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('Login exitoso con ID:', user.uid);

      // Obtener datos adicionales del usuario desde Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        // Si no existe el usuario en la colección users, crearlo con permisos mínimos
        const basicUserData = {
          id: user.uid,
          email: user.email,
          username: user.email?.split('@')[0] || '',
          displayName: user.email?.split('@')[0] || '',
          role: 'user',
          permissions: createMinimalPermissions() // CORREGIDO: Solo permisos mínimos
        };

        await setDoc(doc(db, 'users', user.uid), basicUserData);
        
        return {
          uid: user.uid,
          ...basicUserData,
          emailVerified: user.emailVerified,
          isNewUser: true
        };
      }

      const userData = userDoc.data();
      
      // CORREGIDO: NO asegurar permisos automáticos, respetar exactamente los asignados
      let permissions = userData?.permissions || createMinimalPermissions();
      
      // CORREGIDO: Solo asegurar que dashboard esté activo (es el único obligatorio)
      if (!permissions.dashboard) {
        permissions.dashboard = true;
      }
      
      return {
        uid: user.uid,
        email: user.email,
        username: userData?.username || user.email?.split('@')[0] || '',
        displayName: userData?.displayName || userData?.username || user.email?.split('@')[0] || '',
        role: userData?.role || 'user',
        permissions: permissions,
        emailVerified: user.emailVerified,
        isNewUser: false
      };
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    }
  },

  loginWithUsername: async (username: string, password: string) => {
    try {
      console.log('Iniciando proceso de login con username...');
      
      // Buscar usuario por username para obtener email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Usuario no encontrado');
      }
      
      // Obtener el email del primer resultado
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const email = userData?.email;
      
      if (!email) {
        throw new Error('Email no encontrado para este usuario');
      }
      
      // Hacer login con email obtenido
      return await usersService.login(email, password);
    } catch (error: any) {
      console.error('Error al iniciar sesión con username:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    return new Promise<User | null>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          reject(error);
        }
      );
    });
  },

  isAuthenticated: async (): Promise<boolean> => {
    const user = await usersService.getCurrentUser();
    return user !== null;
  },

  createUser: async (userData: UserData): Promise<string> => {
    try {
      if (!userData.email || !userData.password) {
        throw new Error('El correo y la contraseña son obligatorios');
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
      
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, userData.email, userData.password
      );
      
      const user = userCredential.user;
      
      // Datos a guardar en Firestore
      const { password, sendVerification, ...userDataForDB } = userData;
      
      // CORREGIDO: Usar permisos específicos proporcionados o mínimos
      const dataWithDefaults = {
        id: user.uid,
        email: user.email,
        username: userData.username || user.email?.split('@')[0] || '',
        displayName: userData.displayName || userData.username || user.email?.split('@')[0] || '',
        role: userData.role || 'user',
        permissions: userData.permissions || createMinimalPermissions(), // CORREGIDO: Solo mínimos
        createdAt: new Date()
      };
      
      // CORREGIDO: Asegurar que dashboard esté activo (es el único obligatorio)
      if (!dataWithDefaults.permissions.dashboard) {
        dataWithDefaults.permissions.dashboard = true;
      }
      
      // Guardar datos en Firestore
      await setDoc(doc(db, 'users', user.uid), dataWithDefaults);
      
      return user.uid;
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  },

  updateUser: async (userId: string, userData: Partial<UserData>): Promise<string> => {
    try {
      // Eliminar campos sensibles que no se deben actualizar directamente
      const { password, email, uid, ...updateData } = userData;
      
      // Si se actualiza el nombre de usuario, verificar que no exista ya
      if (updateData.username) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', updateData.username));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== userId) {
          throw new Error('El nombre de usuario ya está en uso');
        }
      }
      
      // CORREGIDO: Si se actualizan permisos, solo asegurar dashboard
      if (updateData.permissions) {
        if (!updateData.permissions.dashboard) {
          updateData.permissions.dashboard = true;
        }
      }
      
      // Datos para actualizar en Firestore
      const dbUpdateData = {
        ...updateData,
        updatedAt: new Date()
      };
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', userId), dbUpdateData);
      
      return userId;
    } catch (error: any) {
      console.error(`Error al actualizar usuario ${userId}:`, error);
      throw error;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      // Actualizar contraseña en Firebase Auth
      const user = auth.currentUser;
      if (!user) throw new Error('No hay usuario autenticado');
      
      await updatePassword(user, newPassword);
      return true;
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      throw error;
    }
  },
  
  changeEmail: async (password: string, newEmail: string): Promise<boolean> => {
    try {
      // Actualizar email en Firebase Auth
      const user = auth.currentUser;
      if (!user) throw new Error('No hay usuario autenticado');
      
      await updateEmail(user, newEmail);
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', user.uid), { 
        email: newEmail, 
        updatedAt: new Date() 
      });
      
      return true;
    } catch (error: any) {
      console.error('Error al cambiar correo electrónico:', error);
      throw error;
    }
  },
  
  resetPassword: async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      console.error('Error al enviar correo de restablecimiento:', error);
      throw error;
    }
  },
  
  getAllUsers: async (): Promise<any[]> => {
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('displayName'));
      const querySnapshot = await getDocs(usersQuery);
      
      const users: any[] = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return users;
    } catch (error: any) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  },
  
  getUserById: async (userId: string): Promise<any | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) return null;
      
      const userData = userDoc.data();
      return {
        id: userDoc.id,
        email: userData?.email,
        username: userData?.username,
        displayName: userData?.displayName,
        role: userData?.role,
        permissions: userData?.permissions
      };
    } catch (error: any) {
      console.error(`Error al obtener usuario ${userId}:`, error);
      throw error;
    }
  },
  
  updateUserPermissions: async (userId: string, permissions: Permissions): Promise<string> => {
    try {
      // CORREGIDO: Solo asegurar que dashboard esté activo (es el único obligatorio)
      const finalPermissions = { ...permissions };
      if (!finalPermissions.dashboard) {
        finalPermissions.dashboard = true;
      }
      
      await updateDoc(doc(db, 'users', userId), { 
        permissions: finalPermissions,
        updatedAt: new Date() 
      });
      
      return userId;
    } catch (error: any) {
      console.error(`Error al actualizar permisos del usuario ${userId}:`, error);
      throw error;
    }
  },
  
  hasPermission: async (permission: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        return false;
      }
      
      // Obtener datos de permisos desde Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      
      // Los administradores tienen todos los permisos
      if (userData?.permissions?.admin === true) {
        return true;
      }
      
      // Verificar permiso específico (debe estar explícitamente en true)
      return userData?.permissions?.[permission] === true;
    } catch (error: any) {
      console.error(`Error al verificar permiso ${permission}:`, error);
      return false;
    }
  },

  verifySession: async (): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      return user !== null;
    } catch (error: any) {
      console.error('Error en verifySession:', error);
      return false;
    }
  }
};

export default usersService;