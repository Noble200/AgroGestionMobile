// src/contexts/ActivityContext.tsx - SOLUCIÓN FINAL: Timestamps reales sin recarga
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../api/firebase';
import { useAuth } from './AuthContext';

// Tipos para ActivityContext
interface Activity {
  id: string;
  type: string;
  entity: string;
  entityId: string;
  entityName: string;
  action: string;
  description: string;
  metadata: any;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: Date;
  _originalTimestamp: any;
}

interface ActivityProviderProps {
  children: React.ReactNode;
}

interface ActivityContextType {
  activities: Activity[];
  loading: boolean;
  error: string;
  logActivity: (type: string, action: string, entity: string, entityData?: any, metadata?: any) => Promise<string>;
  loadActivities: (limitCount?: number, reset?: boolean) => Promise<Activity[]>;
  loadMoreActivities: (limitCount?: number) => Promise<Activity[]>;
  loadActivitiesByEntity: (entityType: string, entityId: string) => Promise<Activity[]>;
  loadActivitiesByUser: (userId: string) => Promise<Activity[]>;
  getRecentActivities: () => Activity[];
}

// Crear el contexto de actividades
const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function useActivities() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivityProvider');
  }
  return context;
}

// SOLUCIÓN FINAL: Función para convertir timestamp de Firebase preservando el timestamp original
const convertFirebaseTimestamp = (timestamp: any): Date => {
  try {
    if (!timestamp) {
      console.warn('⚠️ Timestamp vacío');
      return new Date();
    }
    
    // CASO PRIORITARIO: Timestamp de Firestore con seconds y nanoseconds
    if (timestamp && typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
      const milliseconds = timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
      const firebaseDate = new Date(milliseconds);
      console.log('🔥 Timestamp Firebase convertido:', {
        original: timestamp,
        converted: firebaseDate.toISOString(),
        seconds: timestamp.seconds,
        nanoseconds: timestamp.nanoseconds
      });
      return firebaseDate;
    }
    
    // Si ya es un Date válido, devolverlo tal como está
    if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
      console.log('📅 Ya es Date válido:', timestamp.toISOString());
      return timestamp;
    }
    
    // Si tiene método toDate (backup)
    if (timestamp && typeof timestamp.toDate === 'function') {
      const convertedDate = timestamp.toDate();
      console.log('📅 Convertido con toDate():', convertedDate.toISOString());
      return convertedDate;
    }
    
    // String ISO
    if (typeof timestamp === 'string') {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) {
        console.log('📅 String convertido:', parsedDate.toISOString());
        return parsedDate;
      }
    }
    
    console.warn('⚠️ Timestamp no reconocido:', timestamp);
    return new Date();
    
  } catch (error: any) {
    console.error('❌ Error al convertir timestamp:', error);
    return new Date();
  }
};

export function ActivityProvider({ children }: ActivityProviderProps) {
  const { currentUser } = useAuth() as any;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Referencias para evitar múltiples cargas y listeners
  const isLoadingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasInitializedRef = useRef(false);

  // Función para registrar una nueva actividad
  const logActivity = useCallback(async (type: string, action: string, entity: string, entityData: any = {}, metadata: any = {}) => {
    try {
      if (!currentUser) {
        console.warn('⚠️ No hay usuario logueado para registrar actividad');
        return '';
      }

      const activityDoc = {
        type,
        action,
        entity,
        entityId: entityData?.id || entityData?.uid || '',
        entityName: entityData?.name || entityData?.displayName || entityData?.username || entityData?.title || '',
        description: `${action} en ${entity}`,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        userEmail: currentUser.email || '',
        createdAt: serverTimestamp()
      };

      console.log('📝 Registrando actividad:', activityDoc);

      const docRef = await addDoc(collection(db, 'activities'), activityDoc);
      
      console.log('✅ Actividad registrada con ID:', docRef.id);
      
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error al registrar actividad:', error);
      setError('Error al registrar actividad: ' + error.message);
      throw error;
    }
  }, [currentUser]);

  // SOLUCIÓN FINAL: Configurar listener en tiempo real
  const setupRealtimeListener = useCallback(async () => {
    if (!currentUser) {
      console.log('❌ No hay usuario para configurar listener');
      return;
    }

    try {
      console.log('🔧 Configurando listener de actividades en tiempo real...');
      
      // Limpiar listener anterior si existe
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      const activitiesQuery = query(
        collection(db, 'activities'), 
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
        console.log('📡 Datos de actividades actualizados en tiempo real');
        
        const activitiesData: Activity[] = [];
        
        snapshot.forEach((doc) => {
          const activityData = doc.data();
          
          const convertedActivity: Activity = {
            id: doc.id,
            type: activityData.type || 'unknown',
            entity: activityData.entity || 'unknown',
            entityId: activityData.entityId || '',
            entityName: activityData.entityName || '',
            action: activityData.action || '',
            description: activityData.description || '',
            metadata: activityData.metadata || {},
            userId: activityData.userId || '',
            userName: activityData.userName || 'Usuario desconocido',
            userEmail: activityData.userEmail || '',
            createdAt: convertFirebaseTimestamp(activityData.createdAt),
            _originalTimestamp: activityData.createdAt
          };
          
          activitiesData.push(convertedActivity);
        });
        
        // Ordenar por fecha descendente
        activitiesData.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        console.log(`📊 Actividades procesadas: ${activitiesData.length}`);
        
        if (activitiesData.length > 0) {
          console.log('🕐 Primera actividad (más reciente):', {
            id: activitiesData[0].id,
            action: activitiesData[0].action,
            timestamp: activitiesData[0].createdAt.toISOString(),
            original: activitiesData[0]._originalTimestamp
          });
        }
        
        setActivities(activitiesData);
        setLoading(false);
      }, (error: any) => {
        console.error('❌ Error en listener de actividades:', error);
        setError('Error al cargar actividades en tiempo real: ' + error.message);
        setLoading(false);
      });

      unsubscribeRef.current = unsubscribe;
      console.log('✅ Listener de actividades configurado');

    } catch (error: any) {
      console.error('❌ Error al configurar listener:', error);
      setError('Error al configurar listener: ' + error.message);
      setLoading(false);
    }
  }, [currentUser]);

  // Cargar actividades manualmente (fallback)
  const loadActivities = useCallback(async (limitCount = 50, reset = true): Promise<Activity[]> => {
    if (isLoadingRef.current) return [];

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError('');
      
      console.log('🔄 Carga manual de actividades...');
      
      const activitiesQuery = query(
        collection(db, 'activities'), 
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(activitiesQuery);
      const activitiesData: Activity[] = [];
      
      querySnapshot.forEach((doc) => {
        const activityData = doc.data();
        
        const convertedActivity: Activity = {
          id: doc.id,
          type: activityData.type || 'unknown',
          entity: activityData.entity || 'unknown',
          entityId: activityData.entityId || '',
          entityName: activityData.entityName || '',
          action: activityData.action || '',
          description: activityData.description || '',
          metadata: activityData.metadata || {},
          userId: activityData.userId || '',
          userName: activityData.userName || 'Usuario desconocido',
          userEmail: activityData.userEmail || '',
          createdAt: convertFirebaseTimestamp(activityData.createdAt),
          _originalTimestamp: activityData.createdAt
        };
        
        activitiesData.push(convertedActivity);
      });
      
      // Ordenar por fecha descendente
      activitiesData.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      if (reset) {
        setActivities(activitiesData);
      }
      
      // Actualizar lastVisible para paginación
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === limitCount);
      } else {
        setHasMore(false);
      }
      
      return activitiesData;
    } catch (error: any) {
      console.error('❌ Error al cargar actividades:', error);
      setError('Error al cargar actividades: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Cargar más actividades (paginación)
  const loadMoreActivities = useCallback(async (limitCount = 20): Promise<Activity[]> => {
    if (!hasMore || isLoadingRef.current || !lastVisible) return [];

    try {
      isLoadingRef.current = true;
      setError('');
      
      console.log('📄 Cargando más actividades...');
      
      const activitiesQuery = query(
        collection(db, 'activities'), 
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(activitiesQuery);
      const newActivitiesData: Activity[] = [];
      
      querySnapshot.forEach((doc) => {
        const activityData = doc.data();
        
        const convertedActivity: Activity = {
          id: doc.id,
          type: activityData.type || 'unknown',
          entity: activityData.entity || 'unknown',
          entityId: activityData.entityId || '',
          entityName: activityData.entityName || '',
          action: activityData.action || '',
          description: activityData.description || '',
          metadata: activityData.metadata || {},
          userId: activityData.userId || '',
          userName: activityData.userName || 'Usuario desconocido',
          userEmail: activityData.userEmail || '',
          createdAt: convertFirebaseTimestamp(activityData.createdAt),
          _originalTimestamp: activityData.createdAt
        };
        
        newActivitiesData.push(convertedActivity);
      });
      
      // Añadir nuevas actividades a las existentes
      setActivities(prev => [...prev, ...newActivitiesData]);
      
      // Actualizar estado de paginación
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === limitCount);
      } else {
        setHasMore(false);
      }
      
      return newActivitiesData;
    } catch (error: any) {
      console.error('❌ Error al cargar más actividades:', error);
      setError('Error al cargar más actividades: ' + error.message);
      throw error;
    } finally {
      isLoadingRef.current = false;
    }
  }, [lastVisible, hasMore]);

  // Cargar actividades por entidad específica
  const loadActivitiesByEntity = useCallback(async (entityType: string, entityId: string): Promise<Activity[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log(`🔍 Cargando actividades para ${entityType}:${entityId}`);
      
      const activitiesQuery = query(
        collection(db, 'activities'), 
        where('entity', '==', entityType),
        where('entityId', '==', entityId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(activitiesQuery);
      const activitiesData: Activity[] = [];
      
      querySnapshot.forEach((doc) => {
        const activityData = doc.data();
        
        const convertedActivity: Activity = {
          id: doc.id,
          type: activityData.type || 'unknown',
          entity: activityData.entity || 'unknown',
          entityId: activityData.entityId || '',
          entityName: activityData.entityName || '',
          action: activityData.action || '',
          description: activityData.description || '',
          metadata: activityData.metadata || {},
          userId: activityData.userId || '',
          userName: activityData.userName || 'Usuario desconocido',
          userEmail: activityData.userEmail || '',
          createdAt: convertFirebaseTimestamp(activityData.createdAt),
          _originalTimestamp: activityData.createdAt
        };
        
        activitiesData.push(convertedActivity);
      });
      
      activitiesData.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      return activitiesData;
    } catch (error: any) {
      console.error('❌ Error al cargar actividades por entidad:', error);
      setError('Error al cargar actividades: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar actividades por usuario específico
  const loadActivitiesByUser = useCallback(async (userId: string): Promise<Activity[]> => {
    try {
      setLoading(true);
      setError('');
      
      console.log(`👤 Cargando actividades para usuario: ${userId}`);
      
      const activitiesQuery = query(
        collection(db, 'activities'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(activitiesQuery);
      const activitiesData: Activity[] = [];
      
      querySnapshot.forEach((doc) => {
        const activityData = doc.data();
        
        const convertedActivity: Activity = {
          id: doc.id,
          type: activityData.type || 'unknown',
          entity: activityData.entity || 'unknown',
          entityId: activityData.entityId || '',
          entityName: activityData.entityName || '',
          action: activityData.action || '',
          description: activityData.description || '',
          metadata: activityData.metadata || {},
          userId: activityData.userId || '',
          userName: activityData.userName || 'Usuario desconocido',
          userEmail: activityData.userEmail || '',
          createdAt: convertFirebaseTimestamp(activityData.createdAt),
          _originalTimestamp: activityData.createdAt
        };
        
        activitiesData.push(convertedActivity);
      });
      
      activitiesData.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setActivities(activitiesData);
      return activitiesData;
    } catch (error: any) {
      console.error('❌ Error al cargar actividades por usuario:', error);
      setError('Error al cargar actividades: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener actividades recientes para el dashboard
  const getRecentActivities = useCallback(() => {
    const sortedActivities = [...activities].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return sortedActivities.slice(0, 10);
  }, [activities]);

  // Configurar listener al inicializar
  useEffect(() => {
    if (currentUser && !hasInitializedRef.current) {
      console.log('🚀 Inicializando sistema de actividades en tiempo real...');
      hasInitializedRef.current = true;
      setupRealtimeListener();
    } else if (!currentUser) {
      console.log('🧹 Limpiando actividades...');
      
      // Limpiar listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      setActivities([]);
      hasInitializedRef.current = false;
    }

    // Cleanup al desmontar
    return () => {
      if (unsubscribeRef.current) {
        console.log('🔴 Cerrando listener de actividades');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser, setupRealtimeListener]);

  const value: ActivityContextType = {
    activities,
    loading,
    error,
    logActivity,
    loadActivities,
    loadMoreActivities,
    loadActivitiesByEntity,
    loadActivitiesByUser,
    getRecentActivities
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}