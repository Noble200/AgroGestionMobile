// src/controllers/ActivitiesController.js - CORREGIDO: Orden cronológico correcto
import { useState, useEffect, useCallback } from 'react';
import { useActivities } from '../contexts/ActivityContext';

const useActivitiesController = () => {
  const {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    loadActivities,
    loadActivitiesByEntity,
    loadActivitiesByUser,
    loadMoreActivities
  } = useActivities();

  const [filters, setFilters] = useState({
    entity: 'all',
    type: 'all',
    user: 'all',
    startDate: '',
    endDate: '',
    searchTerm: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Opciones para filtros
  const filterOptions = {
    entities: [
      { value: 'all', label: 'Todas las entidades' },
      { value: 'product', label: 'Productos' },
      { value: 'transfer', label: 'Transferencias' },
      { value: 'fumigation', label: 'Fumigaciones' },
      { value: 'harvest', label: 'Cosechas' },
      { value: 'purchase', label: 'Compras' },
      { value: 'expense', label: 'Gastos' },
      { value: 'field', label: 'Campos' },
      { value: 'warehouse', label: 'Almacenes' },
      { value: 'user', label: 'Usuarios' }
    ],
    types: [
      { value: 'all', label: 'Todas las acciones' },
      { value: 'create', label: 'Creación' },
      { value: 'update', label: 'Actualización' },
      { value: 'delete', label: 'Eliminación' },
      { value: 'approve', label: 'Aprobación' },
      { value: 'reject', label: 'Rechazo' },
      { value: 'complete', label: 'Completado' },
      { value: 'cancel', label: 'Cancelación' },
      { value: 'ship', label: 'Envío' },
      { value: 'receive', label: 'Recepción' }
    ],
    users: [
      { value: 'all', label: 'Todos los usuarios' }
      // Se agregará dinámicamente desde las actividades
    ]
  };

  // Actualizar estado de loading y error
  useEffect(() => {
    setLoading(activitiesLoading);
    setError(activitiesError || '');
  }, [activitiesLoading, activitiesError]);

  // Extraer usuarios únicos de las actividades para el filtro
  useEffect(() => {
    if (activities.length > 0) {
      const uniqueUsers = new Set();
      activities.forEach(activity => {
        if (activity.userName) {
          uniqueUsers.add(activity.userName);
        }
      });
      
      const userOptions = [
        { value: 'all', label: 'Todos los usuarios' },
        ...Array.from(uniqueUsers).map(userName => ({
          value: userName,
          label: userName
        }))
      ];
      
      filterOptions.users = userOptions;
    }
  }, [activities]);

  // CORREGIDO: Filtrar actividades y mantener orden cronológico (más reciente primero)
  useEffect(() => {
    let filtered = activities.filter(activity => {
      // Filtro por entidad
      if (filters.entity !== 'all' && activity.entity !== filters.entity) {
        return false;
      }

      // Filtro por tipo de acción
      if (filters.type !== 'all' && activity.type !== filters.type) {
        return false;
      }

      // Filtro por usuario
      if (filters.user !== 'all' && activity.userName !== filters.user) {
        return false;
      }

      // Filtro por fecha
      if (filters.startDate || filters.endDate) {
        const activityDate = new Date(activity.createdAt);
        
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          if (activityDate < startDate) return false;
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (activityDate > endDate) return false;
        }
      }

      // Búsqueda por texto
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          activity.action.toLowerCase().includes(term) ||
          activity.description.toLowerCase().includes(term) ||
          activity.entityName.toLowerCase().includes(term) ||
          activity.userName.toLowerCase().includes(term)
        );
      }

      return true;
    });

    // CORREGIDO: Asegurar orden cronológico (más reciente primero)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime(); // DESC: más reciente primero
    });

    console.log('🔍 Actividades filtradas y ordenadas:', filtered.length); // Debug
    
    // Verificar el orden en debug
    if (filtered.length > 1) {
      console.log('📅 Primera actividad (más reciente):', filtered[0].createdAt);
      console.log('📅 Segunda actividad:', filtered[1].createdAt);
      console.log('📅 Última actividad (más antigua):', filtered[filtered.length - 1].createdAt);
    }

    setFilteredActivities(filtered);
    setTotalCount(filtered.length);
  }, [activities, filters]);

  // Cargar actividades al iniciar
  useEffect(() => {
    handleRefresh();
  }, []); // Solo al montar el componente

  // Cambiar filtros
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Buscar por texto
  const handleSearch = useCallback((searchTerm) => {
    setFilters(prev => ({
      ...prev,
      searchTerm
    }));
  }, []);

  // Refrescar datos
  const handleRefresh = useCallback(async () => {
    try {
      console.log('🔄 Refrescando actividades...'); // Debug
      await loadActivities(100); // Cargar las primeras 100 actividades
      setHasMore(true);
    } catch (err) {
      console.error('❌ Error al refrescar actividades:', err);
      setError('Error al cargar actividades: ' + err.message);
    }
  }, [loadActivities]);

  // Cargar más actividades
  const handleLoadMore = useCallback(async () => {
    try {
      if (!hasMore || loading) return;
      
      console.log('📥 Cargando más actividades...'); // Debug
      
      const moreActivities = await loadMoreActivities();
      
      // Si se obtuvieron menos actividades de las esperadas, no hay más
      if (!moreActivities || moreActivities.length < 20) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('❌ Error al cargar más actividades:', err);
      setError('Error al cargar más actividades: ' + err.message);
    }
  }, [hasMore, loading, loadMoreActivities]);

  // Limpiar filtros
  const handleClearFilters = useCallback(() => {
    setFilters({
      entity: 'all',
      type: 'all',
      user: 'all',
      startDate: '',
      endDate: '',
      searchTerm: ''
    });
  }, []);

  // Cargar actividades por entidad específica
  const handleLoadByEntity = useCallback(async (entity, entityId = null) => {
    try {
      await loadActivitiesByEntity(entity, entityId);
    } catch (err) {
      console.error('❌ Error al cargar actividades por entidad:', err);
      setError('Error al cargar actividades: ' + err.message);
    }
  }, [loadActivitiesByEntity]);

  // Cargar actividades por usuario específico
  const handleLoadByUser = useCallback(async (userId) => {
    try {
      await loadActivitiesByUser(userId);
    } catch (err) {
      console.error('❌ Error al cargar actividades por usuario:', err);
      setError('Error al cargar actividades: ' + err.message);
    }
  }, [loadActivitiesByUser]);

  return {
    activities: filteredActivities, // CORREGIDO: Ya ordenadas cronológicamente
    loading,
    error,
    filters,
    filterOptions,
    hasMore,
    totalCount,
    handleFilterChange,
    handleSearch,
    handleRefresh,
    handleLoadMore,
    handleClearFilters,
    handleLoadByEntity,
    handleLoadByUser
  };
};

export default useActivitiesController;