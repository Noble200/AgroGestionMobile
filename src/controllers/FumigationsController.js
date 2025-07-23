// src/controllers/FumigationsController.js - MODIFICADO: Con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useFumigations } from '../contexts/FumigationContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger'; // NUEVO: Hook para logging

const useFumigationsController = () => {
  const {
    fumigations,
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
  const { logFumigation } = useActivityLogger(); // NUEVO: Hook de logging

  // Estados locales
  const [selectedFumigation, setSelectedFumigation] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [selectedLots, setSelectedLots] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'add-fumigation', 'edit-fumigation', 'view-fumigation', 'complete-fumigation'
  const [filters, setFilters] = useState({
    status: 'all',
    crop: 'all',
    field: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredFumigationsList, setFilteredFumigationsList] = useState([]);

  // Cargar campos, productos y fumigaciones al iniciar
  const loadData = useCallback(async () => {
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
    } catch (err) {
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

  // Filtrar fumigaciones según filtros aplicados
  const getFilteredFumigations = useCallback(() => {
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
        field: field ? { id: field.id, name: field.name } : { id: fumigation.fieldId, name: 'Campo desconocido' }
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
  const handleAddFumigation = useCallback(() => {
    setSelectedFumigation(null);
    setSelectedField(null);
    setSelectedLots([]);
    setDialogType('add-fumigation');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para añadir fumigación desde un campo específico
  const handleAddFumigationFromField = useCallback((field, lots = []) => {
    setSelectedFumigation(null);
    setSelectedField(field);
    setSelectedLots(lots);
    setDialogType('add-fumigation');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar fumigación
  const handleEditFumigation = useCallback((fumigation) => {
    setSelectedFumigation(fumigation);
    setSelectedField(null);
    setSelectedLots([]);
    setDialogType('edit-fumigation');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de fumigación
  const handleViewFumigation = useCallback((fumigation) => {
    setSelectedFumigation(fumigation);
    setDialogType('view-fumigation');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para completar fumigación
  const handleCompleteFumigation = useCallback((fumigation) => {
    setSelectedFumigation(fumigation);
    setDialogType('complete-fumigation');
    setDialogOpen(true);
  }, []);

  // MODIFICADO: Confirmar eliminación de fumigación con logging
  const handleDeleteFumigation = useCallback(async (fumigationId) => {
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
            orderNumber: fumigationToDelete.orderNumber,
            establishment: fumigationToDelete.establishment,
            crop: fumigationToDelete.crop
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
      } catch (err) {
        console.error('Error al eliminar fumigación:', err);
        setError('Error al eliminar fumigación: ' + err.message);
      }
    }
  }, [deleteFumigation, selectedFumigation, fumigations, fields, logFumigation, currentUser]);

  // MODIFICADO: Guardar fumigación con logging
  const handleSaveFumigation = useCallback(async (fumigationData) => {
    try {
      let fumigationId;
      const fieldName = fields.find(f => f.id === fumigationData.fieldId)?.name || 'Campo desconocido';
      
      if (dialogType === 'add-fumigation') {
        // Crear nueva fumigación
        fumigationId = await addFumigation(fumigationData);
        
        // NUEVO: Registrar actividad de creación
        await logFumigation('create', {
          id: fumigationId,
          orderNumber: fumigationData.orderNumber,
          establishment: fumigationData.establishment,
          crop: fumigationData.crop
        }, {
          fieldName: fieldName,
          fieldId: fumigationData.fieldId,
          surface: fumigationData.totalSurface,
          surfaceUnit: fumigationData.surfaceUnit,
          applicator: fumigationData.applicator,
          applicationDate: formatSafeDate(fumigationData.applicationDate),
          lotsCount: fumigationData.lots?.length || 0,
          lotNames: fumigationData.lots?.map(lot => lot.name).join(', ') || 'Sin lotes',
          productsCount: fumigationData.selectedProducts?.length || 0,
          flowRate: fumigationData.flowRate,
          applicationMethod: fumigationData.applicationMethod,
          totalVolume: ((fumigationData.flowRate || 80) * (fumigationData.totalSurface || 0)).toFixed(1),
          status: fumigationData.status || 'pending',
          createdBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
        
      } else if (dialogType === 'edit-fumigation' && selectedFumigation) {
        // Actualizar fumigación existente
        fumigationId = await updateFumigation(selectedFumigation.id, fumigationData);
        
        // NUEVO: Registrar actividad de actualización
        const changes = detectFumigationChanges(selectedFumigation, fumigationData);
        
        await logFumigation('update', {
          id: selectedFumigation.id,
          orderNumber: fumigationData.orderNumber,
          establishment: fumigationData.establishment,
          crop: fumigationData.crop
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
          previousProductsCount: selectedFumigation.selectedProducts?.length || 0,
          newProductsCount: fumigationData.selectedProducts?.length || 0,
          changes: changes,
          changesCount: changes.length,
          changesSummary: changes.join(', '),
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      setDialogOpen(false);
      await loadFumigations();
      return true;
    } catch (err) {
      console.error('Error al guardar fumigación:', err);
      setError('Error al guardar fumigación: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedFumigation, addFumigation, updateFumigation, loadFumigations, fields, logFumigation, currentUser]);

  // NUEVO: Función para detectar cambios en fumigaciones
  const detectFumigationChanges = useCallback((oldFumigation, newFumigation) => {
    const changes = [];
    
    // Campos a monitorear con sus nombres legibles
    const fieldsToMonitor = {
      establishment: 'Establecimiento',
      applicator: 'Aplicador',
      crop: 'Cultivo',
      totalSurface: 'Superficie',
      flowRate: 'Caudal',
      applicationMethod: 'Método de aplicación',
      status: 'Estado'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = oldFumigation[field];
      const newValue = newFumigation[field];
      
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        if (field === 'totalSurface') {
          changes.push(`${label}: ${oldValue || 0} ha → ${newValue || 0} ha`);
        } else if (field === 'flowRate') {
          changes.push(`${label}: ${oldValue || 80} L/ha → ${newValue || 80} L/ha`);
        } else if (field === 'status') {
          const statusMap = {
            'pending': 'Pendiente',
            'scheduled': 'Programada',
            'in_progress': 'En proceso',
            'completed': 'Completada',
            'cancelled': 'Cancelada'
          };
          changes.push(`${label}: ${statusMap[oldValue] || oldValue} → ${statusMap[newValue] || newValue}`);
        } else {
          changes.push(`${label}: ${oldValue || 'Sin definir'} → ${newValue || 'Sin definir'}`);
        }
      }
    }
    
    // Verificar cambio en productos seleccionados
    const oldProductsCount = oldFumigation.selectedProducts?.length || 0;
    const newProductsCount = newFumigation.selectedProducts?.length || 0;
    
    if (oldProductsCount !== newProductsCount) {
      changes.push(`Productos: ${oldProductsCount} → ${newProductsCount}`);
    }
    
    // Verificar cambio en lotes
    const oldLotsCount = oldFumigation.lots?.length || 0;
    const newLotsCount = newFumigation.lots?.length || 0;
    
    if (oldLotsCount !== newLotsCount) {
      changes.push(`Lotes: ${oldLotsCount} → ${newLotsCount}`);
    }
    
    // Verificar cambio de fecha
    const oldDate = formatSafeDate(oldFumigation.applicationDate);
    const newDate = formatSafeDate(newFumigation.applicationDate);
    
    if (oldDate !== newDate) {
      changes.push(`Fecha de aplicación: ${oldDate || 'Sin fecha'} → ${newDate || 'Sin fecha'}`);
    }
    
    return changes;
  }, []);

  // MODIFICADO: Completar fumigación con logging detallado
  const handleCompleteFumigationSubmit = useCallback(async (completionData) => {
    try {
      if (!selectedFumigation) return;
      
      await completeFumigation(selectedFumigation.id, completionData);
      
      // NUEVO: Registrar actividad de completar fumigación con detalles
      const fieldName = fields.find(f => f.id === selectedFumigation.fieldId)?.name || 'Campo desconocido';
      const duration = calculateDuration(completionData.startDateTime, completionData.endDateTime);
      const productsUsed = selectedFumigation.selectedProducts || [];
      
      await logFumigation('complete', {
        id: selectedFumigation.id,
        orderNumber: selectedFumigation.orderNumber,
        establishment: selectedFumigation.establishment,
        crop: selectedFumigation.crop
      }, {
        fieldName: fieldName,
        fieldId: selectedFumigation.fieldId,
        surface: selectedFumigation.totalSurface,
        surfaceUnit: selectedFumigation.surfaceUnit,
        applicator: selectedFumigation.applicator,
        applicationDate: formatSafeDate(selectedFumigation.applicationDate),
        startTime: completionData.startDateTime ? formatDateTime(completionData.startDateTime) : null,
        endTime: completionData.endDateTime ? formatDateTime(completionData.endDateTime) : null,
        duration: duration,
        productsUsed: productsUsed.length,
        productsNames: productsUsed.map(p => {
          const product = products.find(prod => prod.id === p.productId);
          return product ? product.name : 'Producto desconocido';
        }).join(', '),
        totalProductsQuantity: productsUsed.reduce((sum, p) => sum + (p.totalQuantity || 0), 0),
        flowRate: selectedFumigation.flowRate,
        totalVolume: ((selectedFumigation.flowRate || 80) * (selectedFumigation.totalSurface || 0)).toFixed(1),
        weatherConditions: {
          temperature: completionData.weatherConditions?.temperature ? `${completionData.weatherConditions.temperature}°C` : null,
          humidity: completionData.weatherConditions?.humidity ? `${completionData.weatherConditions.humidity}%` : null,
          windSpeed: completionData.weatherConditions?.windSpeed ? `${completionData.weatherConditions.windSpeed} km/h` : null,
          windDirection: completionData.weatherConditions?.windDirection || null
        },
        completionNotes: completionData.completionNotes || null,
        stockDeducted: true,
        completedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
        completionDate: new Date()
      });
      
      setDialogOpen(false);
      await loadFumigations();
      return true;
    } catch (err) {
      console.error('Error al completar fumigación:', err);
      setError('Error al completar fumigación: ' + err.message);
      throw err;
    }
  }, [selectedFumigation, completeFumigation, loadFumigations, fields, products, logFumigation, currentUser]);

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

  // Cerrar diálogo
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setSelectedFumigation(null);
    setSelectedField(null);
    setSelectedLots([]);
  }, []);

  // Opciones para filtros
  const filterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'pending', label: 'Pendiente' },
      { value: 'scheduled', label: 'Programada' },
      { value: 'in_progress', label: 'En proceso' },
      { value: 'completed', label: 'Completada' },
      { value: 'cancelled', label: 'Cancelada' }
    ],
    crops: [
      { value: 'all', label: 'Todos los cultivos' },
      { value: 'maiz', label: 'Maíz' },
      { value: 'soja', label: 'Soja' },
      { value: 'trigo', label: 'Trigo' },
      { value: 'girasol', label: 'Girasol' },
      { value: 'alfalfa', label: 'Alfalfa' },
      { value: 'otro', label: 'Otro' }
    ],
    dateRange: {
      start: null,
      end: null
    }
  };

  return {
    fumigations: filteredFumigationsList,
    fields,
    products,
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

// NUEVO: Funciones auxiliares para el logging

// Función para formatear fechas de manera segura
function formatSafeDate(dateInput) {
  try {
    if (!dateInput) return null;
    
    let date;
    
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (dateInput?.seconds) {
      // Timestamp de Firebase
      date = new Date(dateInput.seconds * 1000);
    } else if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      return null;
    }
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.warn('Error al formatear fecha:', error);
    return null;
  }
}

// Función para formatear fecha y hora
function formatDateTime(dateInput) {
  try {
    if (!dateInput) return null;
    
    let date;
    
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (dateInput?.seconds) {
      date = new Date(dateInput.seconds * 1000);
    } else if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      return null;
    }
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error al formatear fecha y hora:', error);
    return null;
  }
}

// Función para calcular duración entre dos fechas
function calculateDuration(startDate, endDate) {
  try {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }
    
    const duration = Math.round((end - start) / (1000 * 60)); // minutos
    
    if (duration <= 0) return null;
    
    if (duration >= 60) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return `${hours}h ${minutes}min`;
    } else {
      return `${duration} min`;
    }
  } catch (error) {
    console.warn('Error al calcular duración:', error);
    return null;
  }
}

export default useFumigationsController;