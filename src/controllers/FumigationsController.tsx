// src/controllers/FumigationsController.tsx - Controlador para fumigaciones con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useFumigations } from '../contexts/FumigationContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
interface ControllerFumigation {
  id: string;
  orderNumber?: string;
  establishment?: string;
  crop?: string;
  fieldId?: string;
  field?: {
    id: string;
    name: string;
  };
  selectedLots?: any[];
  totalSurface?: number;
  surfaceUnit?: string;
  applicator?: string;
  applicationDate?: any;
  selectedProducts?: any[];
  flowRate?: number;
  applicationMethod?: string;
  status?: string;
  completedAt?: any;
  completionNotes?: string;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

interface Filters {
  status: string;
  crop: string;
  field: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchTerm: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  status: FilterOption[];
  crop: FilterOption[];
  field: FilterOption[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface FumigationChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  type?: string;
}

interface UseFumigationsControllerReturn {
  fumigations: ControllerFumigation[];
  fields: any[];
  products: any[];
  loading: boolean;
  error: string;
  selectedFumigation: ControllerFumigation | null;
  selectedField: any | null;
  selectedLots: any[];
  dialogOpen: boolean;
  dialogType: string;
  filterOptions: FilterOptions;
  handleAddFumigation: () => void;
  handleAddFumigationFromField: (field: any, lots?: any[]) => void;
  handleEditFumigation: (fumigation: ControllerFumigation) => void;
  handleViewFumigation: (fumigation: ControllerFumigation) => void;
  handleCompleteFumigation: (fumigation: ControllerFumigation) => void;
  handleDeleteFumigation: (fumigationId: string) => Promise<void>;
  handleSaveFumigation: (fumigationData: Partial<ControllerFumigation>) => Promise<boolean>;
  handleCompleteFumigationSubmit: (completionData: any) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: any) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  refreshData: () => Promise<void>;
}

const useFumigationsController = (): UseFumigationsControllerReturn => {
  const {
    fumigations: stockFumigations,
    loading: fumigationsLoading,
    error: fumigationsError,
    loadFumigations,
    addFumigation,
    updateFumigation,
    deleteFumigation,
    completeFumigation
  } = useFumigations();
  
  const {
    fields,
    products,
    loading: fieldsLoading,
    error: fieldsError,
    loadFields,
    loadProducts
  } = useStock();

  const { currentUser } = useAuth();
  const { logFumigation } = useActivityLogger();

  // Convertir fumigaciones del stock a nuestro tipo local
  const fumigations: ControllerFumigation[] = stockFumigations.map(fumigation => {
    const fumigationAny = fumigation as any;
    
    const baseFumigation: ControllerFumigation = {
      id: fumigationAny.id || '',
      orderNumber: fumigationAny.orderNumber,
      establishment: fumigationAny.establishment,
      crop: fumigationAny.crop,
      fieldId: fumigationAny.fieldId,
      field: fumigationAny.field,
      selectedLots: fumigationAny.selectedLots || [],
      totalSurface: fumigationAny.totalSurface,
      surfaceUnit: fumigationAny.surfaceUnit,
      applicator: fumigationAny.applicator,
      applicationDate: fumigationAny.applicationDate,
      selectedProducts: fumigationAny.selectedProducts || [],
      flowRate: fumigationAny.flowRate,
      applicationMethod: fumigationAny.applicationMethod,
      status: fumigationAny.status,
      completedAt: fumigationAny.completedAt,
      completionNotes: fumigationAny.completionNotes,
      createdBy: fumigationAny.createdBy,
      createdAt: fumigationAny.createdAt,
      updatedAt: fumigationAny.updatedAt
    };
    
    return baseFumigation;
  });

  // Estados locales
  const [selectedFumigation, setSelectedFumigation] = useState<ControllerFumigation | null>(null);
  const [selectedField, setSelectedField] = useState<any | null>(null);
  const [selectedLots, setSelectedLots] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>(''); // 'add-fumigation', 'edit-fumigation', 'view-fumigation', 'complete-fumigation'
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    crop: 'all',
    field: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredFumigationsList, setFilteredFumigationsList] = useState<ControllerFumigation[]>([]);

  // Cargar campos, productos y fumigaciones al iniciar
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      
      // Cargar campos si no están cargados
      if (fields.length === 0) {
        await loadFields();
      }
      
      // Cargar productos si no están cargados
      if (products.length === 0) {
        await loadProducts();
      }
      
      // Cargar fumigaciones
      await loadFumigations();
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadFields, loadProducts, loadFumigations, fields.length, products.length]);

  // Actualizar estado de carga y error
  useEffect(() => {
    const isLoading = fumigationsLoading || fieldsLoading;
    setLoading(isLoading);
    
    // Establecer mensaje de error si lo hay
    if (fumigationsError) {
      setError(fumigationsError);
    } else if (fieldsError) {
      setError(fieldsError);
    } else {
      setError('');
    }
  }, [fumigationsLoading, fieldsLoading, fumigationsError, fieldsError]);

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Función auxiliar para formatear fechas de forma segura
  const formatSafeDate = useCallback((date: any): string => {
    if (!date) return 'Sin fecha';
    
    try {
      const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      return dateObj.toLocaleDateString('es-ES');
    } catch (error) {
      return 'Fecha inválida';
    }
  }, []);

  // Filtrar fumigaciones según filtros aplicados
  const getFilteredFumigations = useCallback((): ControllerFumigation[] => {
    if (!fumigations || fumigations.length === 0) return [];
    
    // Hacer una copia del array para no modificar el original
    const fumigationsWithFieldRefs = fumigations.map(fumigation => {
      // Si la fumigación ya tiene una referencia completa al campo, usarla
      if (fumigation.field && typeof fumigation.field === 'object') {
        return fumigation;
      }
      
      // Si no, buscar el campo por ID
      const field = fields.find(f => f.id === fumigation.fieldId);
      return {
        ...fumigation,
        field: field ? { id: field.id, name: field.name } : { id: fumigation.fieldId || '', name: 'Campo desconocido' }
      };
    });
    
    return fumigationsWithFieldRefs.filter(fumigation => {
      // Filtro por estado
      if (filters.status !== 'all' && fumigation.status !== filters.status) {
        return false;
      }
      
      // Filtro por cultivo
      if (filters.crop !== 'all' && fumigation.crop !== filters.crop) {
        return false;
      }
      
      // Filtro por campo
      if (filters.field !== 'all' && fumigation.fieldId !== filters.field) {
        return false;
      }
      
      // Filtro por fecha
      if (filters.dateRange.start || filters.dateRange.end) {
        const appDate = fumigation.applicationDate 
          ? new Date(fumigation.applicationDate.seconds ? fumigation.applicationDate.seconds * 1000 : fumigation.applicationDate)
          : null;
        
        if (!appDate) return false;
        
        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          if (appDate < startDate) return false;
        }
        
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999); // Ajustar al final del día
          if (appDate > endDate) return false;
        }
      }
      
      // Búsqueda por texto
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          (fumigation.establishment && fumigation.establishment.toLowerCase().includes(term)) ||
          (fumigation.applicator && fumigation.applicator.toLowerCase().includes(term)) ||
          (fumigation.crop && fumigation.crop.toLowerCase().includes(term)) ||
          (fumigation.orderNumber && fumigation.orderNumber.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [fumigations, fields, filters]);

  // Actualizar fumigaciones filtradas cuando cambian los filtros, fumigaciones o campos
  useEffect(() => {
    setFilteredFumigationsList(getFilteredFumigations());
  }, [getFilteredFumigations]);

  // Abrir diálogo para añadir fumigación
  const handleAddFumigation = useCallback((): void => {
    setSelectedFumigation(null);
    setSelectedField(null);
    setSelectedLots([]);
    setDialogType('add-fumigation');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para añadir fumigación desde un campo específico
  const handleAddFumigationFromField = useCallback((field: any, lots: any[] = []): void => {
    setSelectedFumigation(null);
    setSelectedField(field);
    setSelectedLots(lots);
    setDialogType('add-fumigation');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar fumigación
  const handleEditFumigation = useCallback((fumigation: ControllerFumigation): void => {
    setSelectedFumigation(fumigation);
    setSelectedField(null);
    setSelectedLots([]);
    setDialogType('edit-fumigation');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de fumigación
  const handleViewFumigation = useCallback((fumigation: ControllerFumigation): void => {
    setSelectedFumigation(fumigation);
    setDialogType('view-fumigation');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para completar fumigación
  const handleCompleteFumigation = useCallback((fumigation: ControllerFumigation): void => {
    setSelectedFumigation(fumigation);
    setDialogType('complete-fumigation');
    setDialogOpen(true);
  }, []);

  // NUEVO: Función para detectar cambios entre fumigaciones
  const detectFumigationChanges = useCallback((currentFumigation: ControllerFumigation, newData: Partial<ControllerFumigation>): FumigationChange[] => {
    const changes: FumigationChange[] = [];
    
    const fieldsToMonitor: Record<string, string> = {
      establishment: 'Establecimiento',
      crop: 'Cultivo',
      applicator: 'Aplicador',
      totalSurface: 'Superficie total',
      flowRate: 'Caudal',
      applicationMethod: 'Método de aplicación',
      status: 'Estado'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = (currentFumigation as any)[field];
      const newValue = (newData as any)[field];
      
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatFumigationValue(oldValue, field),
          newValue: formatFumigationValue(newValue, field),
          type: getFumigationChangeType(field, oldValue, newValue)
        });
      }
    }
    
    // Cambios en fecha de aplicación
    const oldDate = currentFumigation.applicationDate 
      ? new Date(currentFumigation.applicationDate.seconds ? currentFumigation.applicationDate.seconds * 1000 : currentFumigation.applicationDate)
      : null;
    const newDate = newData.applicationDate 
      ? new Date(newData.applicationDate.seconds ? newData.applicationDate.seconds * 1000 : newData.applicationDate)
      : null;
      
    if (oldDate && newDate && oldDate.getTime() !== newDate.getTime()) {
      changes.push({
        field: 'applicationDate',
        label: 'Fecha de aplicación',
        oldValue: oldDate.toLocaleDateString('es-ES'),
        newValue: newDate.toLocaleDateString('es-ES'),
        type: 'date'
      });
    }
    
    // Cambios en productos seleccionados
    const oldProductsCount = currentFumigation.selectedProducts?.length || 0;
    const newProductsCount = newData.selectedProducts?.length || 0;
    
    if (oldProductsCount !== newProductsCount) {
      changes.push({
        field: 'selectedProducts',
        label: 'Productos seleccionados',
        oldValue: `${oldProductsCount} productos`,
        newValue: `${newProductsCount} productos`,
        type: newProductsCount > oldProductsCount ? 'increase' : 'decrease'
      });
    }
    
    return changes;
  }, []);

  // NUEVO: Función para formatear valores según el tipo de campo
  const formatFumigationValue = (value: any, field: string): string => {
    if (value == null) return 'Sin definir';
    
    switch (field) {
      case 'totalSurface':
        return `${value} ha`;
      case 'flowRate':
        return `${value} l/ha`;
      case 'status':
        const statusMap: Record<string, string> = {
          'pending': 'Pendiente',
          'in-progress': 'En progreso',
          'completed': 'Completada',
          'cancelled': 'Cancelada'
        };
        return statusMap[value] || value;
      default:
        return String(value);
    }
  };

  // NUEVO: Función para determinar el tipo de cambio
  const getFumigationChangeType = (field: string, oldValue: any, newValue: any): string => {
    switch (field) {
      case 'totalSurface':
      case 'flowRate':
        const oldNum = Number(oldValue) || 0;
        const newNum = Number(newValue) || 0;
        if (newNum > oldNum) return 'increase';
        if (newNum < oldNum) return 'decrease';
        return 'update';
      case 'status':
        return 'status';
      default:
        return 'update';
    }
  };

  // NUEVO: Función para generar resumen de cambios
  const generateFumigationChangesSummary = (changes: FumigationChange[]): string => {
    const summaryParts: string[] = [];
    
    changes.forEach(change => {
      switch (change.type) {
        case 'increase':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬆️)`);
          break;
        case 'decrease':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬇️)`);
          break;
        case 'status':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (📊)`);
          break;
        case 'date':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (📅)`);
          break;
        default:
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue}`);
      }
    });
    
    return summaryParts.join(', ');
  };

  // Confirmar eliminación de fumigación con logging
  const handleDeleteFumigation = useCallback(async (fumigationId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta fumigación? Esta acción no se puede deshacer.')) {
      try {
        // Obtener datos de la fumigación antes de eliminarla
        const fumigationToDelete = fumigations.find(f => f.id === fumigationId);
        
        await deleteFumigation(fumigationId);
        
        // NUEVO: Registrar actividad de eliminación
        if (fumigationToDelete) {
          const fieldName = fields.find(f => f.id === fumigationToDelete.fieldId)?.name || 'Campo desconocido';
          
          await logFumigation('delete', {
            id: fumigationId,
            orderNumber: fumigationToDelete.orderNumber || 'Sin número',
            establishment: fumigationToDelete.establishment || 'Sin establecimiento',
            crop: fumigationToDelete.crop || 'Sin cultivo'
          }, {
            fieldName: fieldName,
            fieldId: fumigationToDelete.fieldId,
            surface: fumigationToDelete.totalSurface,
            surfaceUnit: fumigationToDelete.surfaceUnit,
            applicator: fumigationToDelete.applicator,
            status: fumigationToDelete.status,
            productsCount: fumigationToDelete.selectedProducts?.length || 0,
            applicationDate: formatSafeDate(fumigationToDelete.applicationDate),
            deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
            reason: 'Eliminación manual desde panel de fumigaciones'
          });
        }
        
        // Cerrar el diálogo si estaba abierto para esta fumigación
        if (selectedFumigation && selectedFumigation.id === fumigationId) {
          setDialogOpen(false);
        }
        
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar fumigación:', err);
        setError('Error al eliminar fumigación: ' + err.message);
      }
    }
  }, [fumigations, fields, deleteFumigation, logFumigation, currentUser, selectedFumigation, loadData, formatSafeDate]);

  // Guardar fumigación (crear o actualizar)
  const handleSaveFumigation = useCallback(async (fumigationData: Partial<ControllerFumigation>): Promise<boolean> => {
    try {
      setError('');
      let fumigationId: string;
      
      const fieldName = fields.find(f => f.id === fumigationData.fieldId)?.name || 'Campo desconocido';
      
      if (dialogType === 'add-fumigation') {
        // Convertir datos para el contexto - debe coincidir exactamente con FumigationData interface
        const contextFumigationData = {
          applicationDate: fumigationData.applicationDate,
          establishment: fumigationData.establishment || '',
          applicator: fumigationData.applicator || '',
          fieldId: fumigationData.fieldId || '',
          crop: fumigationData.crop || '',
          lots: fumigationData.selectedLots || [],
          totalSurface: fumigationData.totalSurface || 0,
          selectedProducts: fumigationData.selectedProducts || [],
          applicationMethod: fumigationData.applicationMethod || '',
          // Campos opcionales según la interface
          orderNumber: fumigationData.orderNumber,
          surfaceUnit: fumigationData.surfaceUnit,
          flowRate: fumigationData.flowRate,
          observations: '',
          status: fumigationData.status as 'pending' | 'in-progress' | 'completed' | 'cancelled' || 'pending'
        };
        
        // Crear nueva fumigación
        fumigationId = await addFumigation(contextFumigationData);
        
        // NUEVO: Registrar actividad de creación
        await logFumigation('create', {
          id: fumigationId,
          orderNumber: fumigationData.orderNumber || 'Generado automáticamente',
          establishment: fumigationData.establishment || 'Sin establecimiento',
          crop: fumigationData.crop || 'Sin cultivo'
        }, {
          fieldName: fieldName,
          fieldId: fumigationData.fieldId,
          surface: fumigationData.totalSurface,
          surfaceUnit: fumigationData.surfaceUnit,
          applicator: fumigationData.applicator,
          applicationDate: formatSafeDate(fumigationData.applicationDate),
          productsCount: fumigationData.selectedProducts?.length || 0,
          flowRate: fumigationData.flowRate,
          applicationMethod: fumigationData.applicationMethod,
          totalVolume: ((fumigationData.flowRate || 80) * (fumigationData.totalSurface || 0)).toFixed(1),
          status: fumigationData.status || 'pending',
          createdBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
        
      } else if (dialogType === 'edit-fumigation' && selectedFumigation) {
        // Convertir datos para el contexto - Partial<FumigationData>
        const contextFumigationData: any = {};
        
        // Solo incluir campos que están definidos
        if (fumigationData.orderNumber !== undefined) contextFumigationData.orderNumber = fumigationData.orderNumber;
        if (fumigationData.applicationDate !== undefined) contextFumigationData.applicationDate = fumigationData.applicationDate;
        if (fumigationData.establishment !== undefined) contextFumigationData.establishment = fumigationData.establishment;
        if (fumigationData.applicator !== undefined) contextFumigationData.applicator = fumigationData.applicator;
        if (fumigationData.fieldId !== undefined) contextFumigationData.fieldId = fumigationData.fieldId;
        if (fumigationData.crop !== undefined) contextFumigationData.crop = fumigationData.crop;
        if (fumigationData.selectedLots !== undefined) contextFumigationData.lots = fumigationData.selectedLots;
        if (fumigationData.totalSurface !== undefined) contextFumigationData.totalSurface = fumigationData.totalSurface;
        if (fumigationData.surfaceUnit !== undefined) contextFumigationData.surfaceUnit = fumigationData.surfaceUnit;
        if (fumigationData.selectedProducts !== undefined) contextFumigationData.selectedProducts = fumigationData.selectedProducts;
        if (fumigationData.applicationMethod !== undefined) contextFumigationData.applicationMethod = fumigationData.applicationMethod;
        if (fumigationData.flowRate !== undefined) contextFumigationData.flowRate = fumigationData.flowRate;
        if (fumigationData.status !== undefined) contextFumigationData.status = fumigationData.status;
        
        // Actualizar fumigación existente
        fumigationId = await updateFumigation(selectedFumigation.id, contextFumigationData);
        
        // NUEVO: Registrar actividad de actualización
        const changes = detectFumigationChanges(selectedFumigation, fumigationData);
        
        await logFumigation('update', {
          id: selectedFumigation.id,
          orderNumber: fumigationData.orderNumber || 'Sin número',
          establishment: fumigationData.establishment || 'Sin establecimiento',
          crop: fumigationData.crop || 'Sin cultivo'
        }, {
          fieldName: fieldName,
          fieldId: fumigationData.fieldId,
          surface: fumigationData.totalSurface,
          surfaceUnit: fumigationData.surfaceUnit,
          applicator: fumigationData.applicator,
          applicationDate: formatSafeDate(fumigationData.applicationDate),
          previousStatus: selectedFumigation.status,
          newStatus: fumigationData.status,
          previousSurface: selectedFumigation.totalSurface,
          newSurface: fumigationData.totalSurface,
          changes: changes,
          changesCount: changes.length,
          changesSummary: changes.length > 0 ? 
            generateFumigationChangesSummary(changes) : 
            'Sin cambios detectados',
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedFumigation(null);
      await loadData();
      return true;
      
    } catch (err: any) {
      console.error('Error al guardar fumigación:', err);
      setError('Error al guardar fumigación: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedFumigation, addFumigation, updateFumigation, logFumigation, currentUser, loadData, fields, formatSafeDate, detectFumigationChanges]);

  // Completar fumigación
  const handleCompleteFumigationSubmit = useCallback(async (completionData: any): Promise<boolean> => {
    try {
      if (!selectedFumigation) return false;
      
      setError('');
      
      await completeFumigation(selectedFumigation.id, completionData);
      
      // NUEVO: Registrar actividad de finalización
      const fieldName = fields.find(f => f.id === selectedFumigation.fieldId)?.name || 'Campo desconocido';
      
      await logFumigation('complete', {
        id: selectedFumigation.id,
        orderNumber: selectedFumigation.orderNumber || 'Sin número',
        establishment: selectedFumigation.establishment || 'Sin establecimiento',
        crop: selectedFumigation.crop || 'Sin cultivo'
      }, {
        fieldName: fieldName,
        fieldId: selectedFumigation.fieldId,
        surface: selectedFumigation.totalSurface,
        applicator: selectedFumigation.applicator,
        completedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
        completionDate: new Date().toLocaleDateString('es-ES'),
        completionNotes: completionData.notes || 'Sin notas adicionales',
        actualProducts: completionData.actualProducts || [],
        actualProductsCount: completionData.actualProducts?.length || 0,
        weather: completionData.weather,
        applicationConditions: completionData.applicationConditions
      });
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedFumigation(null);
      await loadData();
      return true;
      
    } catch (err: any) {
      console.error('Error al completar fumigación:', err);
      setError('Error al completar fumigación: ' + err.message);
      throw err;
    }
  }, [selectedFumigation, completeFumigation, logFumigation, currentUser, fields, loadData]);

  // Cambiar filtros
  const handleFilterChange = useCallback((filterName: string, value: any): void => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Buscar por texto
  const handleSearch = useCallback((searchTerm: string): void => {
    setFilters(prev => ({
      ...prev,
      searchTerm
    }));
  }, []);

  // Cerrar diálogo
  const handleCloseDialog = useCallback((): void => {
    setDialogOpen(false);
    setSelectedFumigation(null);
    setSelectedField(null);
    setSelectedLots([]);
  }, []);

  // Obtener cultivos únicos para filtros
  const getUniqueCrops = useCallback((): string[] => {
    const crops = new Set<string>();
    
    fumigations.forEach(fumigation => {
      if (fumigation.crop) {
        crops.add(fumigation.crop);
      }
    });
    
    return Array.from(crops).sort();
  }, [fumigations]);

  // Opciones para filtros
  const filterOptions: FilterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'pending', label: 'Pendiente' },
      { value: 'in-progress', label: 'En progreso' },
      { value: 'completed', label: 'Completada' },
      { value: 'cancelled', label: 'Cancelada' }
    ],
    crop: [
      { value: 'all', label: 'Todos los cultivos' },
      ...getUniqueCrops().map(crop => ({ value: crop, label: crop }))
    ],
    field: [
      { value: 'all', label: 'Todos los campos' },
      ...fields.map(field => ({ value: field.id, label: field.name }))
    ],
    dateRange: {
      start: null,
      end: null
    }
  };

  return {
    fumigations: filteredFumigationsList,
    fields: Array.isArray(fields) ? fields : [],
    products: Array.isArray(products) ? products : [],
    loading,
    error,
    selectedFumigation,
    selectedField,
    selectedLots,
    dialogOpen,
    dialogType,
    filterOptions,
    handleAddFumigation,
    handleAddFumigationFromField,
    handleEditFumigation,
    handleViewFumigation,
    handleCompleteFumigation,
    handleDeleteFumigation,
    handleSaveFumigation,
    handleCompleteFumigationSubmit,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

export default useFumigationsController;