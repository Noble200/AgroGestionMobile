// src/controllers/ActivitiesController.tsx - CORREGIDO: Orden cronológico correcto
import { useState, useEffect, useCallback } from 'react';
import { useActivities } from '../contexts/ActivityContext';

// Interfaces para TypeScript
interface Activity {
  id: string;
  entity: string;
  type: string;
  entityId: string;
  entityName?: string;
  action?: string;
  details?: any;
  userName?: string;
  userId?: string;
  createdAt: any; // Firebase Timestamp
  [key: string]: any;
}

interface ActivityFilters {
  entity: string;
  type: string;
  user: string;
  startDate: string;
  endDate: string;
  searchTerm: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  entities: FilterOption[];
  types: FilterOption[];
  users: FilterOption[];
}

interface UseActivitiesControllerReturn {
  activities: Activity[];
  loading: boolean;
  error: string;
  filters: ActivityFilters;
  filterOptions: FilterOptions;
  hasMore: boolean;
  totalCount: number;
  handleFilterChange: (filterName: string, value: string) => void;
  handleSearch: (searchTerm: string) => void;
  handleRefresh: () => Promise<void>;
  handleLoadMore: () => Promise<void>;
  handleClearFilters: () => void;
  handleLoadByEntity: (entity: string, entityId?: string | null) => Promise<void>;
  handleLoadByUser: (userId: string) => Promise<void>;
}

const useActivitiesController = (): UseActivitiesControllerReturn => {
  const {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    loadActivities,
    loadActivitiesByEntity,
    loadActivitiesByUser,
    loadMoreActivities
  } = useActivities();

  const [filters, setFilters] = useState<ActivityFilters>({
    entity: 'all',
    type: 'all',
    user: 'all',
    startDate: '',
    endDate: '',
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Opciones para filtros
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
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
  });

  // Actualizar estado de loading y error
  useEffect(() => {
    setLoading(activitiesLoading);
    setError(activitiesError || '');
  }, [activitiesLoading, activitiesError]);

  // Extraer usuarios únicos de las actividades para el filtro
  useEffect(() => {
    if (activities.length > 0) {
      const uniqueUsers = new Set<string>();
      activities.forEach(activity => {
        const activityAny = activity as any;
        if (activityAny.userName) {
          uniqueUsers.add(activityAny.userName);
        }
      });
      
      const userOptions: FilterOption[] = [
        { value: 'all', label: 'Todos los usuarios' },
        ...Array.from(uniqueUsers).map(userName => ({
          value: userName,
          label: userName
        }))
      ];
      
      setFilterOptions(prev => ({
        ...prev,
        users: userOptions
      }));
    }
  }, [activities]);

  // CORREGIDO: Filtrar actividades y mantener orden cronológico (más reciente primero)
  useEffect(() => {
    let filtered = activities.filter(activity => {
      const activityAny = activity as any; // Casting temporal para acceder a todas las propiedades
      
      // Filtro por entidad
      if (filters.entity !== 'all' && activityAny.entity !== filters.entity) {
        return false;
      }

      // Filtro por tipo de acción
      if (filters.type !== 'all' && activityAny.type !== filters.type) {
        return false;
      }

      // Filtro por usuario
      if (filters.user !== 'all' && activityAny.userName !== filters.user) {
        return false;
      }

      // Filtro por fecha
      if (filters.startDate || filters.endDate) {
        const activityDate = new Date(activityAny.createdAt);
        
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
          (activityAny.entityName && activityAny.entityName.toLowerCase().includes(term)) ||
          (activityAny.action && activityAny.action.toLowerCase().includes(term)) ||
          (activityAny.userName && activityAny.userName.toLowerCase().includes(term)) ||
          (activityAny.type && activityAny.type.toLowerCase().includes(term)) ||
          (activityAny.details && JSON.stringify(activityAny.details).toLowerCase().includes(term))
        );
      }

      return true;
    });

    // CORREGIDO: Asegurar orden cronológico descendente (más reciente primero)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime(); // Descendente
    });

    console.log('🔍 Actividades filtradas:', filtered.length); // Debug
    console.log('📅 Primera actividad:', filtered[0]?.createdAt); // Debug
    console.log('📅 Última actividad:', filtered[filtered.length - 1]?.createdAt); // Debug

    setFilteredActivities(filtered);
    setTotalCount(filtered.length);
  }, [activities, filters]);

  // Cambiar filtro
  const handleFilterChange = useCallback((filterName: string, value: string): void => {
    console.log(`🔧 Cambiando filtro ${filterName} a:`, value); // Debug
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Buscar por texto
  const handleSearch = useCallback((searchTerm: string): void => {
    console.log('🔍 Buscando:', searchTerm); // Debug
    setFilters(prev => ({
      ...prev,
      searchTerm
    }));
  }, []);

  // Refrescar actividades
  const handleRefresh = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 Refrescando actividades...'); // Debug
      setError('');
      setHasMore(true); // Resetear paginación
      await loadActivities();
    } catch (err: any) {
      console.error('❌ Error al refrescar actividades:', err);
      setError('Error al refrescar actividades: ' + err.message);
    }
  }, [loadActivities]);

  // Cargar más actividades
  const handleLoadMore = useCallback(async (): Promise<void> => {
    try {
      if (!hasMore || loading) return;
      
      console.log('📥 Cargando más actividades...'); // Debug
      
      const moreActivities = await loadMoreActivities();
      
      // Si se obtuvieron menos actividades de las esperadas, no hay más
      if (!moreActivities || moreActivities.length < 20) {
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('❌ Error al cargar más actividades:', err);
      setError('Error al cargar más actividades: ' + err.message);
    }
  }, [hasMore, loading, loadMoreActivities]);

  // Limpiar filtros
  const handleClearFilters = useCallback((): void => {
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
  const handleLoadByEntity = useCallback(async (entity: string, entityId?: string | null): Promise<void> => {
    try {
      await loadActivitiesByEntity(entity, entityId ?? '');
    } catch (err: any) {
      console.error('❌ Error al cargar actividades por entidad:', err);
      setError('Error al cargar actividades: ' + err.message);
    }
  }, [loadActivitiesByEntity]);

  // Cargar actividades por usuario específico
  const handleLoadByUser = useCallback(async (userId: string): Promise<void> => {
    try {
      await loadActivitiesByUser(userId);
    } catch (err: any) {
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