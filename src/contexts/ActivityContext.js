// src/contexts/ActivityContext.js - SOLUCIÓN FINAL: Timestamps reales sin recarga
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

// Crear el contexto de actividades
const ActivityContext = createContext();

export function useActivities() {
  return useContext(ActivityContext);
}

// SOLUCIÓN FINAL: Función para convertir timestamp de Firebase preservando el timestamp original
const convertFirebaseTimestamp = (timestamp) => {
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
    
  } catch (error) {
    console.error('❌ Error al convertir timestamp:', error);
    return new Date();
  }
};

export function ActivityProvider({ children }) {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastVisible, setLastVisible] = useState(null);
  
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const unsubscribeRef = useRef(null);

  // SOLUCIÓN FINAL: Usar listener en tiempo real para obtener timestamps exactos
  const setupRealtimeListener = useCallback(() => {
    if (!currentUser || unsubscribeRef.current) return;

    console.log('🔴 Configurando listener en tiempo real para actividades...');

    try {
      // Query para las actividades más recientes
      const activitiesQuery = query(
        collection(db, 'activities'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      // LISTENER EN TIEMPO REAL
      const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
        console.log('📡 Snapshot recibido - cambios:', snapshot.docChanges().length);
        
        const activitiesData = [];
        
        snapshot.forEach((doc) => {
          const activityData = doc.data();
          
          // CRÍTICO: Preservar el timestamp original de Firebase
          const originalTimestamp = activityData.createdAt;
          
          console.log('📄 Procesando actividad:', {
            id: doc.id,
            action: activityData.action,
            originalTimestamp: originalTimestamp,
            timestampType: typeof originalTimestamp
          });
          
          const convertedActivity = {
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
            createdAt: convertFirebaseTimestamp(originalTimestamp), // PRESERVAR timestamp original
            _originalTimestamp: originalTimestamp // Guardar referencia original para debug
          };
          
          activitiesData.push(convertedActivity);
        });
        
        // Ordenar por timestamp (más reciente primero)
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
      }, (error) => {
        console.error('❌ Error en listener de actividades:', error);
        setError('Error al cargar actividades en tiempo real: ' + error.message);
        setLoading(false);
      });

      unsubscribeRef.current = unsubscribe;
      console.log('✅ Listener de actividades configurado');

    } catch (error) {
      console.error('❌ Error al configurar listener:', error);
      setError('Error al configurar listener: ' + error.message);
      setLoading(false);
    }
  }, [currentUser]);

  // Cargar actividades manualmente (fallback)
  const loadActivities = useCallback(async (limitCount = 50, reset = true) => {
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
      const activitiesData = [];
      
      querySnapshot.forEach((doc) => {
        const activityData = doc.data();
        
        const convertedActivity = {
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
      
      if (reset) {
        setActivities(activitiesData);
      }
      
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      
      return activitiesData;
    } catch (error) {
      console.error('❌ Error al cargar actividades:', error);
      setError('Error al cargar actividades: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Cargar más actividades
  const loadMoreActivities = useCallback(async (limitCount = 20) => {
    if (!lastVisible || isLoadingRef.current) return [];
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      const activitiesQuery = query(
        collection(db, 'activities'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(activitiesQuery);
      const activitiesData = [];
      
      querySnapshot.forEach((doc) => {
        const activityData = doc.data();
        
        const convertedActivity = {
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
      
      setActivities(prev => {
        const combined = [...prev, ...activitiesData];
        return combined.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
      
      if (querySnapshot.docs.length > 0) {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      
      return activitiesData;
    } catch (error) {
      console.error('❌ Error al cargar más actividades:', error);
      setError('Error al cargar más actividades: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [lastVisible]);

  // SOLUCIÓN FINAL: Registrar actividad sin recargar
  const logActivity = useCallback(async (activityData) => {
    try {
      if (!currentUser) {
        console.warn('⚠️ No hay usuario autenticado');
        return;
      }

      console.log('🆕 Registrando actividad:', activityData.action);

      const cleanedActivityData = {
        type: activityData.type || 'unknown',
        entity: activityData.entity || 'unknown',
        entityId: activityData.entityId || '',
        entityName: activityData.entityName || '',
        action: activityData.action || '',
        description: activityData.description || '',
        metadata: activityData.metadata || {},
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || 'Usuario desconocido',
        userEmail: currentUser.email || '',
        createdAt: serverTimestamp() // Firebase establecerá el timestamp exacto
      };

      if (!cleanedActivityData.type || !cleanedActivityData.entity) {
        console.warn('⚠️ Datos insuficientes');
        return;
      }

      // Insertar en Firestore
      const docRef = await addDoc(collection(db, 'activities'), cleanedActivityData);
      
      console.log('✅ Actividad registrada con ID:', docRef.id);
      console.log('📡 El listener en tiempo real actualizará automáticamente la lista');
      
      // NO recargar manualmente - el listener se encargará
      
      return docRef.id;

    } catch (error) {
      console.error('❌ Error al registrar actividad:', error);
      setError('Error al registrar actividad: ' + error.message);
    }
  }, [currentUser]);

  // Funciones para cargar por entidad/usuario (simplificadas)
  const loadActivitiesByEntity = useCallback(async (entity, entityId = null) => {
    // Detener listener actual
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      setLoading(true);
      setError('');
      
      let activitiesQuery = query(
        collection(db, 'activities'),
        where('entity', '==', entity),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      if (entityId) {
        activitiesQuery = query(
          collection(db, 'activities'),
          where('entity', '==', entity),
          where('entityId', '==', entityId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }
      
      const querySnapshot = await getDocs(activitiesQuery);
      const activitiesData = [];
      
      querySnapshot.forEach((doc) => {
        const activityData = doc.data();
        
        const convertedActivity = {
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
    } catch (error) {
      console.error('❌ Error al cargar actividades por entidad:', error);
      setError('Error al cargar actividades: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivitiesByUser = useCallback(async (userId) => {
    // Detener listener actual
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      setLoading(true);
      setError('');
      
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(activitiesQuery);
      const activitiesData = [];
      
      querySnapshot.forEach((doc) => {
        const activityData = doc.data();
        
        const convertedActivity = {
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
    } catch (error) {
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

  const value = {
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