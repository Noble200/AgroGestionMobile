// src/controllers/HarvestsController.tsx - Controlador para cosechas con logging de actividades  
import { useState, useEffect, useCallback } from 'react';
import { useHarvests } from '../contexts/HarvestContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
interface ControllerHarvest {
  id: string;
  harvestNumber?: string;
  crop?: string;
  fieldId?: string;
  field?: {
    id: string;
    name: string;
  };
  selectedLots?: any[];
  totalArea?: number;
  areaUnit?: string;
  estimatedYield?: number;
  yieldUnit?: string;
  plannedDate?: any;
  harvestDate?: any;
  harvestMethod?: string;
  selectedProducts?: any[];
  harvestedProducts?: any[];
  machinery?: any[];
  workers?: string;
  targetWarehouse?: string;
  destination?: string;
  qualityNotes?: string;
  weatherConditions?: string;
  status?: string;
  actualYield?: number;
  totalHarvested?: number;
  totalHarvestedUnit?: string;
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

interface HarvestChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  type?: string;
}

interface UseHarvestsControllerReturn {
  harvests: ControllerHarvest[];
  fields: any[];
  products: any[];
  warehouses: any[];
  loading: boolean;
  error: string;
  selectedHarvest: ControllerHarvest | null;
  selectedField: any | null;
  selectedLots: any[];
  dialogOpen: boolean;
  dialogType: string;
  filterOptions: FilterOptions;
  handleAddHarvest: () => void;
  handleEditHarvest: (harvest: ControllerHarvest) => void;
  handleViewHarvest: (harvest: ControllerHarvest) => void;
  handleDeleteHarvest: (harvestId: string) => Promise<void>;
  handleCompleteHarvest: (harvest: ControllerHarvest) => void;
  handleSaveHarvest: (harvestData: Partial<ControllerHarvest>) => Promise<boolean>;
  handleCompleteHarvestSubmit: (completionData: any) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: any) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  refreshData: () => Promise<void>;
}

const useHarvestsController = (): UseHarvestsControllerReturn => {
  const {
    harvests: stockHarvests,
    loading: harvestsLoading,
    error: harvestsError,
    loadHarvests,
    addHarvest,
    updateHarvest,
    deleteHarvest,
    completeHarvest
  } = useHarvests();
  
  const {
    fields = [],
    products = [],
    warehouses = [],
    loading: fieldsLoading,
    error: fieldsError,
    loadFields,
    loadProducts,
    loadWarehouses
  } = useStock();

  const { currentUser } = useAuth();
  const { logHarvest } = useActivityLogger();

  // Convertir cosechas del stock a nuestro tipo local
  const harvests: ControllerHarvest[] = stockHarvests.map(harvest => {
    const harvestAny = harvest as any;
    
    const baseHarvest: ControllerHarvest = {
      id: harvestAny.id || '',
      harvestNumber: harvestAny.harvestNumber,
      crop: harvestAny.crop,
      fieldId: harvestAny.fieldId,
      field: harvestAny.field,
      selectedLots: harvestAny.selectedLots || [],
      totalArea: harvestAny.totalArea,
      areaUnit: harvestAny.areaUnit,
      estimatedYield: harvestAny.estimatedYield,
      yieldUnit: harvestAny.yieldUnit,
      plannedDate: harvestAny.plannedDate,
      harvestDate: harvestAny.harvestDate,
      harvestMethod: harvestAny.harvestMethod,
      selectedProducts: harvestAny.selectedProducts || [],
      harvestedProducts: harvestAny.harvestedProducts || [],
      machinery: harvestAny.machinery || [],
      workers: harvestAny.workers,
      targetWarehouse: harvestAny.targetWarehouse,
      destination: harvestAny.destination,
      qualityNotes: harvestAny.qualityNotes,
      weatherConditions: harvestAny.weatherConditions,
      status: harvestAny.status,
      actualYield: harvestAny.actualYield,
      totalHarvested: harvestAny.totalHarvested,
      totalHarvestedUnit: harvestAny.totalHarvestedUnit,
      completedAt: harvestAny.completedAt,
      completionNotes: harvestAny.completionNotes,
      createdBy: harvestAny.createdBy,
      createdAt: harvestAny.createdAt,
      updatedAt: harvestAny.updatedAt
    };
    
    return baseHarvest;
  });

  // Estados locales
  const [selectedHarvest, setSelectedHarvest] = useState<ControllerHarvest | null>(null);
  const [selectedField, setSelectedField] = useState<any | null>(null);
  const [selectedLots, setSelectedLots] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>(''); // 'add-harvest', 'edit-harvest', 'view-harvest', 'complete-harvest'
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    crop: 'all',
    field: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredHarvestsList, setFilteredHarvestsList] = useState<ControllerHarvest[]>([]);

  // Cargar campos, productos y almacenes al iniciar
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      
      // Cargar todos los datos necesarios
      await Promise.all([
        loadFields(),
        loadProducts(), 
        loadWarehouses(),
        loadHarvests()
      ]);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadFields, loadProducts, loadWarehouses, loadHarvests]);

  // Actualizar estado de carga y error
  useEffect(() => {
    const isLoading = harvestsLoading || fieldsLoading;
    setLoading(isLoading);
    
    // Establecer mensaje de error si lo hay
    if (harvestsError) {
      setError(harvestsError);
    } else if (fieldsError) {
      setError(fieldsError);
    } else {
      setError('');
    }
  }, [harvestsLoading, fieldsLoading, harvestsError, fieldsError]);

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

  // Filtrar cosechas con verificación de arrays
  const getFilteredHarvests = useCallback((): ControllerHarvest[] => {
    // Verificar que harvests sea un array
    if (!Array.isArray(harvests) || harvests.length === 0) return [];
    
    // Hacer una copia del array para no modificar el original
    const harvestsWithFieldRefs = harvests.map(harvest => {
      // Si el harvest ya tiene una referencia completa al campo, usarla
      if (harvest.field && typeof harvest.field === 'object') {
        return harvest;
      }
      
      // Verificar que fields sea un array antes de usar find
      if (!Array.isArray(fields)) {
        return {
          ...harvest,
          field: { id: harvest.fieldId || '', name: 'Campo desconocido' }
        };
      }
      
      // Si no, buscar el campo por ID
      const field = fields.find(f => f.id === harvest.fieldId);
      return {
        ...harvest,
        field: field ? { id: field.id, name: field.name } : { id: harvest.fieldId || '', name: 'Campo desconocido' }
      };
    });
    
    return harvestsWithFieldRefs.filter(harvest => {
      // Filtro por estado
      if (filters.status !== 'all' && harvest.status !== filters.status) {
        return false;
      }
      
      // Filtro por cultivo
      if (filters.crop !== 'all' && harvest.crop !== filters.crop) {
        return false;
      }
      
      // Filtro por campo
      if (filters.field !== 'all' && harvest.fieldId !== filters.field) {
        return false;
      }
      
      // Filtro por fecha
      if (filters.dateRange.start || filters.dateRange.end) {
        const plannedDate = harvest.plannedDate
          ? new Date(harvest.plannedDate.seconds ? harvest.plannedDate.seconds * 1000 : harvest.plannedDate)
          : null;
        
        if (!plannedDate) return false;
        
        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          if (plannedDate < startDate) return false;
        }
        
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (plannedDate > endDate) return false;
        }
      }
      
      // Búsqueda por texto
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          (harvest.crop && harvest.crop.toLowerCase().includes(term)) ||
          (harvest.harvestNumber && harvest.harvestNumber.toLowerCase().includes(term)) ||
          (harvest.harvestMethod && harvest.harvestMethod.toLowerCase().includes(term)) ||
          (harvest.workers && harvest.workers.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [harvests, fields, filters]);

  // Actualizar cosechas filtradas cuando cambian los filtros, cosechas o campos
  useEffect(() => {
    setFilteredHarvestsList(getFilteredHarvests());
  }, [getFilteredHarvests]);

  // Abrir diálogo para añadir cosecha
  const handleAddHarvest = useCallback((): void => {
    setSelectedHarvest(null);
    setSelectedField(null);
    setSelectedLots([]);
    setDialogType('add-harvest');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar cosecha
  const handleEditHarvest = useCallback((harvest: ControllerHarvest): void => {
    setSelectedHarvest(harvest);
    setSelectedField(null);
    setSelectedLots([]);
    setDialogType('edit-harvest');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de cosecha
  const handleViewHarvest = useCallback((harvest: ControllerHarvest): void => {
    setSelectedHarvest(harvest);
    setDialogType('view-harvest');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para completar cosecha
  const handleCompleteHarvest = useCallback((harvest: ControllerHarvest): void => {
    setSelectedHarvest(harvest);
    setDialogType('complete-harvest');
    setDialogOpen(true);
  }, []);

  // NUEVO: Función para detectar cambios entre cosechas
  const detectHarvestChanges = useCallback((oldHarvest: ControllerHarvest, newHarvest: Partial<ControllerHarvest>): HarvestChange[] => {
    const changes: HarvestChange[] = [];
    
    const fieldsToMonitor: Record<string, string> = {
      crop: 'Cultivo',
      totalArea: 'Superficie total',
      estimatedYield: 'Rendimiento estimado',
      harvestMethod: 'Método de cosecha',
      workers: 'Trabajadores',
      targetWarehouse: 'Almacén destino',
      qualityNotes: 'Notas de calidad',
      weatherConditions: 'Condiciones climáticas'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = (oldHarvest as any)[field];
      const newValue = (newHarvest as any)[field];
      
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatHarvestValue(oldValue, field),
          newValue: formatHarvestValue(newValue, field),
          type: getHarvestChangeType(field, oldValue, newValue)
        });
      }
    }
    
    // Cambios en estado
    if (oldHarvest.status !== newHarvest.status) {
      const statusMap: Record<string, string> = {
        'pending': 'Pendiente',
        'scheduled': 'Programada',
        'in_progress': 'En proceso',
        'completed': 'Completada',
        'cancelled': 'Cancelada'
      };
      changes.push({
        field: 'status',
        label: 'Estado',
        oldValue: statusMap[oldHarvest.status || ''] || oldHarvest.status || 'Sin estado',
        newValue: statusMap[newHarvest.status || ''] || newHarvest.status || 'Sin estado',
        type: 'status'
      });
    }
    
    // Cambios en fecha planificada
    const oldDate = oldHarvest.plannedDate 
      ? new Date(oldHarvest.plannedDate.seconds ? oldHarvest.plannedDate.seconds * 1000 : oldHarvest.plannedDate)
      : null;
    const newDate = newHarvest.plannedDate 
      ? new Date(newHarvest.plannedDate.seconds ? newHarvest.plannedDate.seconds * 1000 : newHarvest.plannedDate)
      : null;
      
    if (oldDate && newDate && oldDate.getTime() !== newDate.getTime()) {
      changes.push({
        field: 'plannedDate',
        label: 'Fecha planificada',
        oldValue: oldDate.toLocaleDateString('es-ES'),
        newValue: newDate.toLocaleDateString('es-ES'),
        type: 'date'
      });
    }
    
    // Cambios en productos seleccionados
    const oldProductsCount = oldHarvest.selectedProducts?.length || 0;
    const newProductsCount = newHarvest.selectedProducts?.length || 0;
    
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
  const formatHarvestValue = (value: any, field: string): string => {
    if (value == null) return 'Sin definir';
    
    switch (field) {
      case 'totalArea':
        return `${value} ha`;
      case 'estimatedYield':
        return `${value} kg/ha`;
      case 'targetWarehouse':
        const warehouse = warehouses.find(w => w.id === value);
        return warehouse ? warehouse.name : 'Almacén desconocido';
      default:
        return String(value);
    }
  };

  // NUEVO: Función para determinar el tipo de cambio
  const getHarvestChangeType = (field: string, oldValue: any, newValue: any): string => {
    switch (field) {
      case 'totalArea':
      case 'estimatedYield':
        const oldNum = Number(oldValue) || 0;
        const newNum = Number(newValue) || 0;
        if (newNum > oldNum) return 'increase';
        if (newNum < oldNum) return 'decrease';
        return 'update';
      case 'targetWarehouse':
        return 'warehouse';
      default:
        return 'update';
    }
  };

  // NUEVO: Función para generar resumen de cambios
  const generateHarvestChangesSummary = (changes: HarvestChange[]): string => {
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
        case 'warehouse':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (🏢)`);
          break;
        default:
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue}`);
      }
    });
    
    return summaryParts.join(', ');
  };

  // Confirmar eliminación de cosecha con logging
  const handleDeleteHarvest = useCallback(async (harvestId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta cosecha? Esta acción no se puede deshacer.')) {
      try {
        // Obtener datos de la cosecha antes de eliminarla
        const harvestToDelete = harvests.find(h => h.id === harvestId);
        
        await deleteHarvest(harvestId);
        
        // NUEVO: Registrar actividad de eliminación
        if (harvestToDelete) {
          const fieldName = fields.find(f => f.id === harvestToDelete.fieldId)?.name || 'Campo desconocido';
          const warehouseName = warehouses.find(w => w.id === harvestToDelete.targetWarehouse)?.name || 'Almacén desconocido';
          
          await logHarvest('delete', {
            id: harvestId,
            crop: harvestToDelete.crop || 'Sin cultivo',
            field: { name: fieldName }
          }, {
            area: harvestToDelete.totalArea,
            areaUnit: harvestToDelete.areaUnit,
            estimatedYield: harvestToDelete.estimatedYield,
            yieldUnit: harvestToDelete.yieldUnit,
            plannedDate: formatSafeDate(harvestToDelete.plannedDate),
            harvestMethod: harvestToDelete.harvestMethod,
            targetWarehouse: warehouseName,
            productsCount: harvestToDelete.selectedProducts?.length || 0,
            status: harvestToDelete.status,
            deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
            reason: 'Eliminación manual desde panel de cosechas'
          });
        }
        
        // Cerrar el diálogo si estaba abierto para esta cosecha
        if (selectedHarvest && selectedHarvest.id === harvestId) {
          setDialogOpen(false);
        }
        
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar cosecha:', err);
        setError('Error al eliminar cosecha: ' + err.message);
      }
    }
  }, [harvests, fields, warehouses, deleteHarvest, logHarvest, currentUser, selectedHarvest, loadData, formatSafeDate]);

  // Guardar cosecha (crear o actualizar)
  const handleSaveHarvest = useCallback(async (harvestData: Partial<ControllerHarvest>): Promise<boolean> => {
    try {
      setError('');
      let harvestId: string;
      
      const fieldName = fields.find(f => f.id === harvestData.fieldId)?.name || 'Campo desconocido';
      const warehouseName = warehouses.find(w => w.id === harvestData.targetWarehouse)?.name || 'Almacén desconocido';
      
      if (dialogType === 'add-harvest') {
        // Convertir datos para el contexto - debe coincidir exactamente con HarvestData interface
        const contextHarvestData: any = {
          crop: harvestData.crop || '',
          fieldId: harvestData.fieldId || '',
          selectedLots: harvestData.selectedLots || [],
          totalArea: harvestData.totalArea || 0,
          estimatedYield: harvestData.estimatedYield || 0,
          harvestedProducts: harvestData.harvestedProducts || []
        };
        
        // Agregar campos opcionales solo si están definidos
        if (harvestData.harvestNumber !== undefined) contextHarvestData.harvestNumber = harvestData.harvestNumber;
        if (harvestData.plannedDate !== undefined) contextHarvestData.plannedDate = harvestData.plannedDate;
        if (harvestData.areaUnit !== undefined) contextHarvestData.areaUnit = harvestData.areaUnit;
        if (harvestData.yieldUnit !== undefined) contextHarvestData.yieldUnit = harvestData.yieldUnit;
        if (harvestData.harvestMethod !== undefined) contextHarvestData.harvestMethod = harvestData.harvestMethod;
        if (harvestData.selectedProducts !== undefined) contextHarvestData.selectedProducts = harvestData.selectedProducts;
        if (harvestData.machinery !== undefined) contextHarvestData.machinery = harvestData.machinery;
        if (harvestData.workers !== undefined) contextHarvestData.workers = harvestData.workers;
        if (harvestData.targetWarehouse !== undefined) contextHarvestData.targetWarehouse = harvestData.targetWarehouse;
        if (harvestData.destination !== undefined) contextHarvestData.destination = harvestData.destination;
        if (harvestData.qualityNotes !== undefined) contextHarvestData.qualityNotes = harvestData.qualityNotes;
        if (harvestData.weatherConditions !== undefined) contextHarvestData.weatherConditions = harvestData.weatherConditions;
        
        // Crear nueva cosecha
        harvestId = await addHarvest(contextHarvestData);
        
        // NUEVO: Registrar actividad de creación
        await logHarvest('create', {
          id: harvestId,
          crop: harvestData.crop || 'Sin cultivo',
          field: { name: fieldName }
        }, {
          area: harvestData.totalArea,
          areaUnit: harvestData.areaUnit,
          estimatedYield: harvestData.estimatedYield,
          yieldUnit: harvestData.yieldUnit,
          plannedDate: formatSafeDate(harvestData.plannedDate),
          harvestMethod: harvestData.harvestMethod,
          targetWarehouse: warehouseName,
          productsCount: harvestData.selectedProducts?.length || 0,
          machineryCount: harvestData.machinery?.length || 0,
          workers: harvestData.workers,
          qualityNotes: harvestData.qualityNotes,
          weatherConditions: harvestData.weatherConditions,
          createdBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
        
      } else if (dialogType === 'edit-harvest' && selectedHarvest) {
        // Convertir datos para el contexto - Partial<HarvestData>
        const contextHarvestData: any = {};
        
        // Solo incluir campos que están definidos
        if (harvestData.harvestNumber !== undefined) contextHarvestData.harvestNumber = harvestData.harvestNumber;
        if (harvestData.crop !== undefined) contextHarvestData.crop = harvestData.crop;
        if (harvestData.fieldId !== undefined) contextHarvestData.fieldId = harvestData.fieldId;
        if (harvestData.selectedLots !== undefined) contextHarvestData.selectedLots = harvestData.selectedLots;
        if (harvestData.totalArea !== undefined) contextHarvestData.totalArea = harvestData.totalArea;
        if (harvestData.areaUnit !== undefined) contextHarvestData.areaUnit = harvestData.areaUnit;
        if (harvestData.estimatedYield !== undefined) contextHarvestData.estimatedYield = harvestData.estimatedYield;
        if (harvestData.yieldUnit !== undefined) contextHarvestData.yieldUnit = harvestData.yieldUnit;
        if (harvestData.plannedDate !== undefined) contextHarvestData.plannedDate = harvestData.plannedDate;
        if (harvestData.harvestMethod !== undefined) contextHarvestData.harvestMethod = harvestData.harvestMethod;
        if (harvestData.selectedProducts !== undefined) contextHarvestData.selectedProducts = harvestData.selectedProducts;
        if (harvestData.machinery !== undefined) contextHarvestData.machinery = harvestData.machinery;
        if (harvestData.workers !== undefined) contextHarvestData.workers = harvestData.workers;
        if (harvestData.targetWarehouse !== undefined) contextHarvestData.targetWarehouse = harvestData.targetWarehouse;
        if (harvestData.destination !== undefined) contextHarvestData.destination = harvestData.destination;
        if (harvestData.qualityNotes !== undefined) contextHarvestData.qualityNotes = harvestData.qualityNotes;
        if (harvestData.weatherConditions !== undefined) contextHarvestData.weatherConditions = harvestData.weatherConditions;
        if (harvestData.harvestedProducts !== undefined) contextHarvestData.harvestedProducts = harvestData.harvestedProducts;
        
        // Actualizar cosecha existente
        harvestId = await updateHarvest(selectedHarvest.id, contextHarvestData);
        
        // NUEVO: Registrar actividad de actualización
        const changes = detectHarvestChanges(selectedHarvest, harvestData);
        
        await logHarvest('update', {
          id: selectedHarvest.id,
          crop: harvestData.crop || selectedHarvest.crop || 'Sin cultivo',
          field: { name: fieldName }
        }, {
          area: harvestData.totalArea,
          areaUnit: harvestData.areaUnit,
          estimatedYield: harvestData.estimatedYield,
          yieldUnit: harvestData.yieldUnit,
          plannedDate: formatSafeDate(harvestData.plannedDate),
          harvestMethod: harvestData.harvestMethod,
          targetWarehouse: warehouseName,
          previousArea: selectedHarvest.totalArea,
          previousEstimatedYield: selectedHarvest.estimatedYield,
          changes: changes,
          changesCount: changes.length,
          changesSummary: changes.length > 0 ? 
            generateHarvestChangesSummary(changes) : 
            'Sin cambios detectados',
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedHarvest(null);
      await loadData();
      return true;
      
    } catch (err: any) {
      console.error('Error al guardar cosecha:', err);
      setError('Error al guardar cosecha: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedHarvest, addHarvest, updateHarvest, logHarvest, currentUser, loadData, fields, warehouses, formatSafeDate, detectHarvestChanges]);

  // Completar cosecha con logging detallado
  const handleCompleteHarvestSubmit = useCallback(async (completionData: any): Promise<boolean> => {
    try {
      if (!selectedHarvest) return false;
      
      setError('');
      
      await completeHarvest(selectedHarvest.id, completionData);
      
      // NUEVO: Registrar actividad de completar cosecha con detalles completos
      const fieldName = fields.find(f => f.id === selectedHarvest.fieldId)?.name || 'Campo desconocido';
      const targetWarehouseName = warehouses.find(w => w.id === selectedHarvest.targetWarehouse)?.name || 'Almacén desconocido';
      
      // Calcular totales de productos cosechados
      const productsHarvestedCount = completionData.harvestedProducts?.length || 0;
      const totalHarvestedProducts = completionData.harvestedProducts?.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 0;
      
      // Calcular eficiencia de cosecha
      const harvestEfficiency = selectedHarvest.estimatedYield && completionData.actualYield 
        ? ((completionData.actualYield / selectedHarvest.estimatedYield) * 100).toFixed(1)
        : 0;
      
      await logHarvest('complete', {
        id: selectedHarvest.id,
        crop: selectedHarvest.crop || 'Sin cultivo',
        field: { name: fieldName }
      }, {
        area: selectedHarvest.totalArea,
        areaUnit: selectedHarvest.areaUnit,
        estimatedYield: selectedHarvest.estimatedYield,
        actualYield: completionData.actualYield,
        yieldUnit: completionData.yieldUnit || selectedHarvest.yieldUnit,
        totalHarvested: completionData.totalHarvested,
        totalHarvestedUnit: completionData.totalHarvestedUnit,
        harvestDate: completionData.harvestDate,
        destination: completionData.destination,
        targetWarehouse: targetWarehouseName,
        productsHarvestedCount: productsHarvestedCount,
        totalHarvestedProducts: totalHarvestedProducts,
        harvestEfficiency: harvestEfficiency,
        qualityNotes: completionData.qualityNotes,
        weatherConditions: completionData.weatherConditions,
        completedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
        completionDate: new Date().toLocaleDateString('es-ES'),
        completionNotes: completionData.completionNotes || 'Sin notas adicionales'
      });
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedHarvest(null);
      await loadData();
      return true;
      
    } catch (err: any) {
      console.error('Error al completar cosecha:', err);
      setError('Error al completar cosecha: ' + err.message);
      throw err;
    }
  }, [selectedHarvest, completeHarvest, logHarvest, currentUser, fields, warehouses, loadData]);

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
    setSelectedHarvest(null);
    setSelectedField(null);
    setSelectedLots([]);
  }, []);

  // Obtener cultivos únicos para filtros
  const getUniqueCrops = useCallback((): string[] => {
    const crops = new Set<string>();
    
    harvests.forEach(harvest => {
      if (harvest.crop) {
        crops.add(harvest.crop);
      }
    });
    
    return Array.from(crops).sort();
  }, [harvests]);

  // Opciones para filtros
  const filterOptions: FilterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'pending', label: 'Pendiente' },
      { value: 'scheduled', label: 'Programada' },
      { value: 'in_progress', label: 'En proceso' },
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
    harvests: filteredHarvestsList,
    fields: Array.isArray(fields) ? fields : [],
    products: Array.isArray(products) ? products : [],
    warehouses: Array.isArray(warehouses) ? warehouses : [],
    loading,
    error,
    selectedHarvest,
    selectedField,
    selectedLots,
    dialogOpen,
    dialogType,
    filterOptions,
    handleAddHarvest,
    handleEditHarvest,
    handleViewHarvest,
    handleDeleteHarvest,
    handleCompleteHarvest,
    handleSaveHarvest,
    handleCompleteHarvestSubmit,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

export default useHarvestsController;