// src/controllers/FieldsController.tsx - Controlador para campos con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useStock } from '../contexts/StockContext';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebase';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
interface ControllerLot {
  id: string;
  name: string;
  area?: number;
  areaUnit?: string;
  status?: string;
  soilType?: string;
  irrigationType?: string;
  notes?: string;
  crops?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

interface ControllerField {
  id: string;
  name: string;
  location: string;
  area: number;
  areaUnit: string;
  status: string;
  soilType: string;
  owner: string;
  irrigationType?: string;
  irrigationFrequency?: string;
  notes?: string;
  crops: string[];
  currentCrop?: string;
  lots: ControllerLot[];
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

interface Filters {
  status: string;
  soilType: string;
  searchTerm: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterOptions {
  status: FilterOption[];
  soilType: FilterOption[];
}

interface FieldChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  type?: string;
}

interface LotChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

interface UseFieldsControllerReturn {
  fields: ControllerField[];
  loading: boolean;
  error: string;
  selectedField: ControllerField | null;
  selectedLot: ControllerLot | null;
  dialogOpen: boolean;
  dialogType: string;
  filterOptions: FilterOptions;
  handleAddField: () => void;
  handleEditField: (field: ControllerField) => void;
  handleViewField: (field: ControllerField) => void;
  handleDeleteField: (fieldId: string) => Promise<void>;
  handleAddLot: (field: ControllerField) => void;
  handleEditLot: (field: ControllerField, lot: ControllerLot) => void;
  handleDeleteLot: (fieldId: string, lotId: string) => Promise<void>;
  handleSaveField: (fieldData: Partial<ControllerField>) => Promise<boolean>;
  handleSaveLot: (lotData: Partial<ControllerLot>) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: string) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  refreshData: () => Promise<void>;
}

const useFieldsController = (): UseFieldsControllerReturn => {
  const { 
    fields: stockFields, 
    loading: stockLoading, 
    error: stockError, 
    loadFields
  } = useStock();
  
  const { logField } = useActivityLogger();
  
  // Convertir campos del stock a nuestro tipo local
  const fields: ControllerField[] = stockFields.map(field => {
    const fieldAny = field as any; // Casting temporal para acceder a todas las propiedades
    
    const baseField: ControllerField = {
      id: fieldAny.id || '',
      name: fieldAny.name || '',
      location: fieldAny.location || '',
      area: fieldAny.area || 0,
      areaUnit: fieldAny.areaUnit || 'ha',
      status: fieldAny.status || 'active',
      soilType: fieldAny.soilType || '',
      owner: fieldAny.owner || '',
      irrigationType: fieldAny.irrigationType,
      irrigationFrequency: fieldAny.irrigationFrequency,
      notes: fieldAny.notes,
      crops: fieldAny.crops || [],
      currentCrop: fieldAny.currentCrop,
      lots: (fieldAny.lots || []).map((lot: any): ControllerLot => ({
        id: lot.id || '',
        name: lot.name || '',
        area: lot.area,
        areaUnit: lot.areaUnit,
        status: lot.status,
        soilType: lot.soilType,
        irrigationType: lot.irrigationType,
        notes: lot.notes,
        crops: lot.crops || [],
        createdAt: lot.createdAt,
        updatedAt: lot.updatedAt
      })),
      createdAt: fieldAny.createdAt,
      updatedAt: fieldAny.updatedAt
    };
    
    return baseField;
  });
  
  // Estados locales
  const [selectedField, setSelectedField] = useState<ControllerField | null>(null);
  const [selectedLot, setSelectedLot] = useState<ControllerLot | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>('');
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    soilType: 'all',
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredFieldsList, setFilteredFieldsList] = useState<ControllerField[]>([]);
  
  // MODIFICADO: Función para añadir un campo con logging
  const addField = useCallback(async (fieldData: Partial<ControllerField>): Promise<string> => {
    try {
      const fieldRef = await addDoc(collection(db, 'fields'), {
        ...fieldData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await logField('create', {
        id: fieldRef.id,
        name: fieldData.name || '',
        location: fieldData.location || ''
      }, {
        area: fieldData.area || 0,
        areaUnit: fieldData.areaUnit || 'ha',
        soilType: fieldData.soilType,
        owner: fieldData.owner,
        crops: fieldData.crops || [],
        irrigationType: fieldData.irrigationType,
        irrigationFrequency: fieldData.irrigationFrequency,
        status: fieldData.status || 'active',
        initialLotsCount: 0,
        notes: fieldData.notes
      });
      
      await loadFields();
      return fieldRef.id;
    } catch (error: any) {
      console.error('Error al añadir campo:', error);
      setError('Error al añadir campo: ' + error.message);
      throw error;
    }
  }, [loadFields, logField]);
  
  // MODIFICADO: Función para actualizar un campo con logging detallado
  const updateField = useCallback(async (fieldId: string, fieldData: Partial<ControllerField>): Promise<string> => {
    try {
      const currentField = fields.find(f => f.id === fieldId);
      
      if (!currentField) {
        throw new Error('Campo no encontrado');
      }
      
      await updateDoc(doc(db, 'fields', fieldId), {
        ...fieldData,
        updatedAt: serverTimestamp()
      });
      
      const changes = detectFieldChanges(currentField, fieldData);
      
      if (changes.length > 0) {
        await logField('update', {
          id: fieldId,
          name: fieldData.name || currentField.name,
          location: fieldData.location || currentField.location || ''
        }, {
          changes: changes,
          changesCount: changes.length,
          changesSummary: generateFieldChangesSummary(changes),
          area: fieldData.area || 0,
          areaUnit: fieldData.areaUnit || 'ha',
          lotsCount: fieldData.lots?.length || 0,
          previousLotsCount: currentField.lots?.length || 0,
          soilType: fieldData.soilType,
          previousSoilType: currentField.soilType,
          status: fieldData.status,
          previousStatus: currentField.status,
          crops: fieldData.crops || [],
          previousCrops: currentField.crops || []
        });
      }
      
      await loadFields();
      return fieldId;
    } catch (error: any) {
      console.error(`Error al actualizar campo ${fieldId}:`, error);
      setError('Error al actualizar campo: ' + error.message);
      throw error;
    }
  }, [loadFields, logField, fields]);
  
  // MODIFICADO: Función para eliminar un campo con logging
  const deleteField = useCallback(async (fieldId: string): Promise<boolean> => {
    try {
      const fieldToDelete = fields.find(f => f.id === fieldId);
      
      await deleteDoc(doc(db, 'fields', fieldId));
      
      if (fieldToDelete) {
        await logField('delete', {
          id: fieldId,
          name: fieldToDelete.name,
          location: fieldToDelete.location || ''
        }, {
          finalArea: fieldToDelete.area || 0,
          areaUnit: fieldToDelete.areaUnit || 'ha',
          finalLotsCount: fieldToDelete.lots?.length || 0,
          soilType: fieldToDelete.soilType,
          owner: fieldToDelete.owner,
          crops: fieldToDelete.crops || [],
          status: fieldToDelete.status,
          hadLots: (fieldToDelete.lots?.length || 0) > 0,
          lotsNames: fieldToDelete.lots?.map((lot: ControllerLot) => lot.name) || []
        });
      }
      
      await loadFields();
      return true;
    } catch (error: any) {
      console.error(`Error al eliminar campo ${fieldId}:`, error);
      setError('Error al eliminar campo: ' + error.message);
      throw error;
    }
  }, [loadFields, logField, fields]);

  // NUEVO: Función para detectar cambios entre campo actual y nuevos datos
  const detectFieldChanges = (currentField: ControllerField, newData: Partial<ControllerField>): FieldChange[] => {
    const changes: FieldChange[] = [];
    
    const fieldsToMonitor: Record<string, string> = {
      name: 'Nombre',
      area: 'Superficie',
      areaUnit: 'Unidad de superficie', 
      location: 'Ubicación',
      status: 'Estado',
      soilType: 'Tipo de suelo',
      owner: 'Propietario',
      irrigationType: 'Tipo de riego',
      irrigationFrequency: 'Frecuencia de riego',
      notes: 'Notas'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = (currentField as any)[field];
      const newValue = (newData as any)[field];
      
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatFieldValue(oldValue, field),
          newValue: formatFieldValue(newValue, field),
          type: getFieldChangeType(field, oldValue, newValue)
        });
      }
    }
    
    const oldCrops = currentField.crops || [];
    const newCrops = newData.crops || [];
    
    if (JSON.stringify(oldCrops.sort()) !== JSON.stringify(newCrops.sort())) {
      changes.push({
        field: 'crops',
        label: 'Cultivos',
        oldValue: oldCrops.length > 0 ? oldCrops.join(', ') : 'Sin cultivos',
        newValue: newCrops.length > 0 ? newCrops.join(', ') : 'Sin cultivos',
        type: 'crops'
      });
    }
    
    const oldLotsCount = currentField.lots?.length || 0;
    const newLotsCount = newData.lots?.length || 0;
    
    if (oldLotsCount !== newLotsCount) {
      changes.push({
        field: 'lotsCount',
        label: 'Cantidad de lotes',
        oldValue: `${oldLotsCount} lotes`,
        newValue: `${newLotsCount} lotes`,
        type: newLotsCount > oldLotsCount ? 'increase' : 'decrease'
      });
    }
    
    return changes;
  };

  // NUEVO: Función para formatear valores según el tipo de campo
  const formatFieldValue = (value: any, field: string): string => {
    if (value == null) return 'Sin definir';
    
    switch (field) {
      case 'area':
        return `${value} ha`;
      case 'status':
        const statusMap: Record<string, string> = {
          'active': 'Activo',
          'inactive': 'Inactivo',
          'prepared': 'Preparado',
          'sown': 'Sembrado',
          'fallow': 'En barbecho'
        };
        return statusMap[value] || value;
      case 'soilType':
        const soilTypeMap: Record<string, string> = {
          'sandy': 'Arenoso',
          'clay': 'Arcilloso',
          'loam': 'Franco',
          'silt': 'Limoso',
          'chalky': 'Calcáreo',
          'peat': 'Turboso'
        };
        return soilTypeMap[value] || value;
      case 'irrigationType':
        const irrigationMap: Record<string, string> = {
          'sprinkler': 'Aspersión',
          'drip': 'Goteo',
          'flood': 'Inundación',
          'furrow': 'Surco',
          'none': 'Sin riego'
        };
        return irrigationMap[value] || value;
      default:
        return String(value);
    }
  };

  // NUEVO: Función para determinar el tipo de cambio
  const getFieldChangeType = (field: string, oldValue: any, newValue: any): string => {
    switch (field) {
      case 'area':
        const oldArea = Number(oldValue) || 0;
        const newArea = Number(newValue) || 0;
        if (newArea > oldArea) return 'increase';
        if (newArea < oldArea) return 'decrease';
        return 'update';
      case 'status':
        return 'status';
      case 'location':
        return 'location';
      default:
        return 'update';
    }
  };

  // NUEVO: Función para generar resumen de cambios
  const generateFieldChangesSummary = (changes: FieldChange[]): string => {
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
        case 'location':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (📍)`);
          break;
        case 'crops':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (🌱)`);
          break;
        default:
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue}`);
      }
    });
    
    return summaryParts.join(', ');
  };
  
  // Función para cargar campos
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      await loadFields();
    } catch (err: any) {
      console.error('Error al cargar campos:', err);
      setError('Error al cargar campos: ' + err.message);
    }
  }, [loadFields]);
  
  // Actualizar estado de carga y error
  useEffect(() => {
    setLoading(stockLoading);
    if (stockError) {
      setError(stockError);
    }
  }, [stockLoading, stockError]);
  
  // Cargar campos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Filtrar campos según filtros aplicados
  const getFilteredFields = useCallback((): ControllerField[] => {
    if (!fields || fields.length === 0) return [];
    
    return fields.filter(field => {
      if (filters.status !== 'all' && field.status !== filters.status) {
        return false;
      }
      
      if (filters.soilType !== 'all' && field.soilType !== filters.soilType) {
        return false;
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          field.name.toLowerCase().includes(term) ||
          (field.location && field.location.toLowerCase().includes(term)) ||
          (field.owner && field.owner.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [fields, filters]);
  
  // Actualizar campos filtrados cuando cambian los filtros o los campos
  useEffect(() => {
    setFilteredFieldsList(getFilteredFields());
  }, [getFilteredFields]);
  
  // Convertir datos antiguos a formato nuevo al cargar campos
  useEffect(() => {
    if (fields && fields.length > 0) {
      fields.forEach(field => {
        if (field.currentCrop && (!field.crops || field.crops.length === 0)) {
          field.crops = [field.currentCrop];
        }
      });
    }
  }, [fields]);
  
  // Abrir diálogo para añadir campo
  const handleAddField = useCallback((): void => {
    setSelectedField(null);
    setDialogType('add-field');
    setDialogOpen(true);
  }, []);
  
  // Abrir diálogo para editar campo
  const handleEditField = useCallback((field: ControllerField): void => {
    setSelectedField(field);
    setDialogType('edit-field');
    setDialogOpen(true);
  }, []);
  
  // Abrir diálogo para ver detalles de un campo
  const handleViewField = useCallback((field: ControllerField): void => {
    setSelectedField(field);
    setDialogType('view-field');
    setDialogOpen(true);
  }, []);
  
  // Abrir diálogo para añadir lote a un campo
  const handleAddLot = useCallback((field: ControllerField): void => {
    setSelectedField(field);
    setSelectedLot(null);
    setDialogType('add-lot');
    setDialogOpen(true);
  }, []);
  
  // Abrir diálogo para editar lote
  const handleEditLot = useCallback((field: ControllerField, lot: ControllerLot): void => {
    setSelectedField(field);
    setSelectedLot(lot);
    setDialogType('edit-lot');
    setDialogOpen(true);
  }, []);
  
  // MODIFICADO: Confirmar eliminación de campo con logging
  const handleDeleteField = useCallback(async (fieldId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este campo? Esta acción no se puede deshacer.')) {
      try {
        await deleteField(fieldId);
        if (selectedField && selectedField.id === fieldId) {
          setDialogOpen(false);
        }
      } catch (err: any) {
        console.error('Error al eliminar campo:', err);
        setError('Error al eliminar campo: ' + err.message);
      }
    }
  }, [deleteField, selectedField]);
  
  // MODIFICADO: Guardar nuevo campo con logging
  const handleSaveField = useCallback(async (fieldData: Partial<ControllerField>): Promise<boolean> => {
    try {
      if (dialogType === 'add-field') {
        await addField(fieldData);
      } else if (dialogType === 'edit-field' && selectedField) {
        await updateField(selectedField.id, fieldData);
      }
      
      setDialogOpen(false);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al guardar campo:', err);
      setError('Error al guardar campo: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedField, addField, updateField, loadData]);
  
  // MODIFICADO: Guardar lote con logging
  const handleSaveLot = useCallback(async (lotData: Partial<ControllerLot>): Promise<boolean> => {
    try {
      if (!selectedField) return false;
      
      const currentLots = selectedField.lots || [];
      let updatedLots: ControllerLot[] = [];
      let lotAction = '';
      let lotInfo: any = {};
      
      if (dialogType === 'add-lot') {
        const newLot: ControllerLot = {
          ...lotData as ControllerLot,
          id: Date.now().toString(),
          createdAt: new Date()
        };
        updatedLots = [...currentLots, newLot];
        lotAction = 'lot-add';
        lotInfo = {
          lotName: newLot.name,
          lotArea: newLot.area || 0,
          lotAreaUnit: newLot.areaUnit || selectedField.areaUnit || 'ha',
          lotSoilType: newLot.soilType || selectedField.soilType,
          lotCrops: newLot.crops || [],
          newLotsCount: updatedLots.length,
          previousLotsCount: currentLots.length
        };
      } else if (dialogType === 'edit-lot' && selectedLot) {
        updatedLots = currentLots.map(lot => 
          lot.id === selectedLot.id 
            ? { ...lot, ...lotData, updatedAt: new Date() } 
            : lot
        );
        lotAction = 'lot-update';
        
        const lotChanges = detectLotChanges(selectedLot, lotData);
        
        lotInfo = {
          lotName: lotData.name,
          lotArea: lotData.area || 0,
          lotAreaUnit: lotData.areaUnit || selectedField.areaUnit || 'ha',
          previousLotName: selectedLot.name,
          lotChanges: lotChanges,
          lotChangesSummary: generateLotChangesSummary(lotChanges)
        };
      }
      
      await updateField(selectedField.id, {
        ...selectedField,
        lots: updatedLots
      });
      
      await logField(lotAction, {
        id: selectedField.id,
        name: selectedField.name,
        location: selectedField.location || ''
      }, lotInfo);
      
      setDialogOpen(false);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Error al guardar lote:', err);
      setError('Error al guardar lote: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedField, selectedLot, updateField, loadData, logField]);

  // NUEVO: Función para detectar cambios en lotes
  const detectLotChanges = (currentLot: ControllerLot, newLotData: Partial<ControllerLot>): LotChange[] => {
    const changes: LotChange[] = [];
    
    const fieldsToMonitor: Record<string, string> = {
      name: 'Nombre',
      area: 'Superficie',
      areaUnit: 'Unidad de superficie',
      status: 'Estado',
      soilType: 'Tipo de suelo',
      irrigationType: 'Tipo de riego',
      notes: 'Notas'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = (currentLot as any)[field];
      const newValue = (newLotData as any)[field];
      
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatFieldValue(oldValue, field),
          newValue: formatFieldValue(newValue, field)
        });
      }
    }
    
    const oldCrops = currentLot.crops || [];
    const newCrops = newLotData.crops || [];
    
    if (JSON.stringify(oldCrops.sort()) !== JSON.stringify(newCrops.sort())) {
      changes.push({
        field: 'crops',
        label: 'Cultivos',
        oldValue: oldCrops.length > 0 ? oldCrops.join(', ') : 'Sin cultivos',
        newValue: newCrops.length > 0 ? newCrops.join(', ') : 'Sin cultivos'
      });
    }
    
    return changes;
  };

  // NUEVO: Función para generar resumen de cambios en lotes
  const generateLotChangesSummary = (changes: LotChange[]): string => {
    return changes.map(change => 
      `${change.label}: ${change.oldValue} → ${change.newValue}`
    ).join(', ');
  };
  
  // MODIFICADO: Eliminar lote de un campo con logging
  const handleDeleteLot = useCallback(async (fieldId: string, lotId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este lote? Esta acción no se puede deshacer.')) {
      try {
        const field = fields.find(f => f.id === fieldId);
        if (!field || !field.lots) return;
        
        const lotToDelete = field.lots.find(lot => lot.id === lotId);
        const updatedLots = field.lots.filter(lot => lot.id !== lotId);
        
        await updateField(fieldId, {
          ...field,
          lots: updatedLots
        });
        
        if (lotToDelete) {
          await logField('lot-delete', {
            id: fieldId,
            name: field.name,
            location: field.location || ''
          }, {
            deletedLotName: lotToDelete.name,
            deletedLotArea: lotToDelete.area || 0,
            deletedLotAreaUnit: lotToDelete.areaUnit || field.areaUnit || 'ha',
            deletedLotSoilType: lotToDelete.soilType,
            deletedLotCrops: lotToDelete.crops || [],
            newLotsCount: updatedLots.length,
            previousLotsCount: field.lots.length
          });
        }
        
        if (selectedLot && selectedLot.id === lotId) {
          setDialogOpen(false);
        }
        
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar lote:', err);
        setError('Error al eliminar lote: ' + err.message);
      }
    }
  }, [fields, selectedLot, updateField, loadData, logField]);
  
  // Cambiar filtros
  const handleFilterChange = useCallback((filterName: string, value: string): void => {
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
    setSelectedField(null);
    setSelectedLot(null);
  }, []);
  
  // Opciones para filtros
  const filterOptions: FilterOptions = {
    status: [
      { value: 'all', label: 'Todos los estados' },
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
      { value: 'prepared', label: 'Preparado' },
      { value: 'sown', label: 'Sembrado' },
      { value: 'fallow', label: 'En barbecho' }
    ],
    soilType: [
      { value: 'all', label: 'Todos los tipos' },
      { value: 'sandy', label: 'Arenoso' },
      { value: 'clay', label: 'Arcilloso' },
      { value: 'loam', label: 'Franco' },
      { value: 'silt', label: 'Limoso' },
      { value: 'chalky', label: 'Calcáreo' },
      { value: 'peat', label: 'Turboso' }
    ]
  };
  
  return {
    fields: filteredFieldsList,
    loading,
    error,
    selectedField,
    selectedLot,
    dialogOpen,
    dialogType,
    filterOptions,
    handleAddField,
    handleEditField,
    handleViewField,
    handleDeleteField,
    handleAddLot,
    handleEditLot,
    handleDeleteLot,
    handleSaveField,
    handleSaveLot,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

export default useFieldsController;