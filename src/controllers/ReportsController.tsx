// src/controllers/ReportsController.tsx - Controlador para gestión de reportes
import { useState, useEffect, useCallback } from 'react';
import { useReports } from '../contexts/ReportsContext';
import { useStock } from '../contexts/StockContext';
import { downloadReportPDF } from '../utils/reportsPdfGenerator';

// Interfaces para TypeScript
interface ReportFilters {
  startDate: string;
  endDate: string;
  status: string;
  category: string;
  field: string;
  warehouse: string;
  supplier: string;
  type: string;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  crop?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface AvailableOptions {
  categories: FilterOption[];
  suppliers: FilterOption[];
  crops: FilterOption[];
  statuses: FilterOption[];
  fields: FilterOption[];
  warehouses: FilterOption[];
}

interface ReportType {
  value: string;
  label: string;
  description: string;
  icon: string;
}

interface PreviewColumn {
  key: string;
  label: string;
  format?: string;
}

interface QueryFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  category?: string;
  field?: string;
  fieldId?: string;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  supplier?: string;
  type?: string;
  crop?: string;
}

interface UseReportsControllerReturn {
  selectedReportType: string;
  filters: ReportFilters;
  reportData: any[];
  reportTitle: string;
  previewOpen: boolean;
  loading: boolean;
  error: string;
  availableOptions: AvailableOptions;
  reportTypes: ReportType[];
  handleReportTypeChange: (reportType: string) => void;
  handleFilterChange: (filterName: string, value: string) => void;
  handleGeneratePreview: () => Promise<void>;
  handleDownloadPDF: () => Promise<void>;
  handleClosePreview: () => void;
  handleClearFilters: () => void;
  getApplicableFilters: () => string[];
  getPreviewColumns: () => PreviewColumn[];
  getNestedValue: (obj: any, path: string) => any;
  formatValue: (value: any, format?: string) => string;
  fields: any[];
  warehouses: any[];
}

const useReportsController = (): UseReportsControllerReturn => {
  const {
    loading: reportsLoading,
    error: reportsError,
    getProductsReport,
    getTransfersReport,
    getFumigationsReport,
    getHarvestsReport,
    getPurchasesReport,
    getExpensesReport,
    getActivitiesReport,
    getInventoryReport
  } = useReports();

  const {
    fields = [],
    warehouses = [],
    loadFields,
    loadWarehouses
  } = useStock();

  // Estados locales
  const [selectedReportType, setSelectedReportType] = useState<string>('products');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    status: 'all',
    category: 'all',
    field: 'all',
    warehouse: 'all',
    supplier: 'all',
    type: 'all',
    sourceWarehouse: 'all',
    targetWarehouse: 'all',
    crop: 'all'
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportTitle, setReportTitle] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // CORREGIDO: Inicializar availableOptions con valores por defecto
  const [availableOptions, setAvailableOptions] = useState<AvailableOptions>({
    categories: [{ value: 'all', label: 'Todas las categorías' }],
    suppliers: [{ value: 'all', label: 'Todos los proveedores' }],
    crops: [{ value: 'all', label: 'Todos los cultivos' }],
    statuses: [{ value: 'all', label: 'Todos los estados' }],
    fields: [{ value: 'all', label: 'Todos los campos' }],
    warehouses: [{ value: 'all', label: 'Todos los almacenes' }]
  });

  // Tipos de reportes disponibles
  const reportTypes: ReportType[] = [
    { 
      value: 'products', 
      label: 'Reporte de Productos',
      description: 'Inventario completo con stock, costos y valorización',
      icon: 'fas fa-box'
    },
    { 
      value: 'transfers', 
      label: 'Reporte de Transferencias',
      description: 'Movimientos de productos entre almacenes',
      icon: 'fas fa-exchange-alt'
    },
    { 
      value: 'fumigations', 
      label: 'Reporte de Fumigaciones',
      description: 'Aplicaciones fitosanitarias realizadas',
      icon: 'fas fa-spray-can'
    },
    { 
      value: 'harvests', 
      label: 'Reporte de Cosechas',
      description: 'Cosechas planificadas y realizadas',
      icon: 'fas fa-tractor'
    },
    { 
      value: 'purchases', 
      label: 'Reporte de Compras',
      description: 'Compras realizadas a proveedores',
      icon: 'fas fa-shopping-cart'
    },
    { 
      value: 'expenses', 
      label: 'Reporte de Gastos',
      description: 'Gastos y ventas registradas',
      icon: 'fas fa-receipt'
    },
    { 
      value: 'activities', 
      label: 'Reporte de Actividades',
      description: 'Resumen general de todas las actividades',
      icon: 'fas fa-list-alt'
    },
    { 
      value: 'inventory', 
      label: 'Reporte de Inventario',
      description: 'Campos, lotes y almacenes disponibles',
      icon: 'fas fa-warehouse'
    }
  ];

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          loadFields(),
          loadWarehouses()
        ]);
      } catch (error: any) {
        console.error('Error al cargar datos iniciales:', error);
      }
    };

    loadInitialData();
  }, [loadFields, loadWarehouses]);

  // Actualizar título del reporte según el tipo seleccionado
  useEffect(() => {
    const reportType = reportTypes.find(rt => rt.value === selectedReportType);
    if (reportType) {
      setReportTitle(reportType.label);
    }
  }, [selectedReportType]);

  // Obtener opciones de filtros según el tipo de reporte y datos disponibles
  const getFilterOptions = useCallback((): AvailableOptions => {
    const options: AvailableOptions = {
      categories: [{ value: 'all', label: 'Todas las categorías' }],
      suppliers: [{ value: 'all', label: 'Todos los proveedores' }],
      crops: [{ value: 'all', label: 'Todos los cultivos' }],
      statuses: [{ value: 'all', label: 'Todos los estados' }],
      fields: [
        { value: 'all', label: 'Todos los campos' },
        ...(Array.isArray(fields) ? fields.map((field: any) => ({ value: field.id, label: field.name })) : [])
      ],
      warehouses: [
        { value: 'all', label: 'Todos los almacenes' },
        ...(Array.isArray(warehouses) ? warehouses.map((warehouse: any) => ({ value: warehouse.id, label: warehouse.name })) : [])
      ]
    };

    // Añadir estados específicos según el tipo de reporte
    switch (selectedReportType) {
      case 'products':
        options.statuses.push(
          { value: 'low', label: 'Stock bajo' },
          { value: 'empty', label: 'Sin stock' },
          { value: 'ok', label: 'Stock normal' }
        );
        break;
      case 'transfers':
        options.statuses.push(
          { value: 'pending', label: 'Pendiente' },
          { value: 'approved', label: 'Aprobada' },
          { value: 'shipped', label: 'Enviada' },
          { value: 'completed', label: 'Completada' },
          { value: 'cancelled', label: 'Cancelada' }
        );
        break;
      case 'fumigations':
      case 'harvests':
        options.statuses.push(
          { value: 'pending', label: 'Pendiente' },
          { value: 'scheduled', label: 'Programada' },
          { value: 'in_progress', label: 'En Proceso' },
          { value: 'completed', label: 'Completada' },
          { value: 'cancelled', label: 'Cancelada' }
        );
        break;
      case 'purchases':
        options.statuses.push(
          { value: 'pending', label: 'Pendiente' },
          { value: 'approved', label: 'Aprobada' },
          { value: 'partial_delivered', label: 'Entrega Parcial' },
          { value: 'completed', label: 'Completada' },
          { value: 'cancelled', label: 'Cancelada' }
        );
        break;
      case 'expenses':
        options.statuses.push(
          { value: 'product', label: 'Venta de producto' },
          { value: 'misc', label: 'Gasto varios' }
        );
        break;
    }

    return options;
  }, [selectedReportType, fields, warehouses]);

  // Actualizar opciones disponibles cuando cambie el tipo de reporte
  useEffect(() => {
    const newOptions = getFilterOptions();
    setAvailableOptions(newOptions);
  }, [getFilterOptions]);

  // Cambiar tipo de reporte
  const handleReportTypeChange = useCallback((reportType: string): void => {
    setSelectedReportType(reportType);
    setReportData([]);
    setPreviewOpen(false);
    
    // Resetear filtros específicos
    setFilters(prev => ({
      ...prev,
      status: 'all',
      category: 'all',
      field: 'all',
      warehouse: 'all',
      supplier: 'all',
      type: 'all',
      sourceWarehouse: 'all',
      targetWarehouse: 'all',
      crop: 'all'
    }));
  }, []);

  // Cambiar filtros
  const handleFilterChange = useCallback((filterName: string, value: string): void => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Obtener los filtros aplicables según el tipo de reporte
  const getApplicableFilters = useCallback((): string[] => {
    const baseFilters = ['startDate', 'endDate'];
    
    switch (selectedReportType) {
      case 'products':
        return [...baseFilters, 'status', 'category', 'field', 'warehouse'];
      case 'transfers':
        return [...baseFilters, 'status', 'sourceWarehouse', 'targetWarehouse'];
      case 'fumigations':
        return [...baseFilters, 'status', 'field', 'crop'];
      case 'harvests':
        return [...baseFilters, 'status', 'field', 'crop'];  
      case 'purchases':
        return [...baseFilters, 'status', 'supplier'];
      case 'expenses':
        return [...baseFilters, 'type', 'category'];
      case 'activities':
        return [...baseFilters, 'type'];
      case 'inventory':
        return ['field', 'warehouse'];
      default:
        return baseFilters;
    }
  }, [selectedReportType]);

  // Generar vista previa del reporte
  const handleGeneratePreview = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Generando vista previa para:', selectedReportType);
      console.log('Filtros aplicados:', filters);
      
      let data: any[] = [];
      
      // Preparar filtros para la consulta
      const queryFilters: QueryFilters = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
        field: filters.field !== 'all' ? filters.field : undefined,
        fieldId: filters.field !== 'all' ? filters.field : undefined,
        sourceWarehouse: filters.sourceWarehouse !== 'all' ? filters.sourceWarehouse : undefined,
        targetWarehouse: filters.targetWarehouse !== 'all' ? filters.targetWarehouse : undefined,
        supplier: filters.supplier !== 'all' ? filters.supplier : undefined,
        type: filters.type !== 'all' ? filters.type : undefined,
        crop: filters.crop !== 'all' ? filters.crop : undefined
      };
      
      // Obtener datos según el tipo de reporte
      switch (selectedReportType) {
        case 'products':
          data = await getProductsReport(queryFilters);
          break;
        case 'transfers':
          data = await getTransfersReport(queryFilters);
          break;
        case 'fumigations':
          data = await getFumigationsReport(queryFilters);
          break;
        case 'harvests':
          data = await getHarvestsReport(queryFilters);
          break;
        case 'purchases':
          data = await getPurchasesReport(queryFilters);
          break;
        case 'expenses':
          data = await getExpensesReport(queryFilters);
          break;
        case 'activities':
          data = await getActivitiesReport(queryFilters);
          break;
        case 'inventory':
          const inventoryData = await getInventoryReport();
          data = Array.isArray(inventoryData) ? inventoryData : [];
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }
      
      console.log('Datos obtenidos:', data.length || 0, 'registros');
      
      setReportData(data);
      setPreviewOpen(true);
      
    } catch (err: any) {
      console.error('Error al generar vista previa:', err);
      setError('Error al generar vista previa: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [
    selectedReportType, 
    filters, 
    getProductsReport,
    getTransfersReport,
    getFumigationsReport,
    getHarvestsReport,
    getPurchasesReport,
    getExpensesReport,
    getActivitiesReport,
    getInventoryReport
  ]);

  // Generar y descargar PDF
  const handleDownloadPDF = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      
      if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
        // Si no hay datos en preview, generar primero
        await handleGeneratePreview();
        return;
      }
      
      console.log('Generando PDF para:', selectedReportType);
      
      // Preparar filtros para el PDF
      const pdfFilters: QueryFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status !== 'all' ? filters.status : undefined,
        category: filters.category !== 'all' ? filters.category : undefined
      };
      
      // Generar nombre del archivo
      const reportType = reportTypes.find(rt => rt.value === selectedReportType);
      const fileName: string = `${reportType?.label || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Descargar PDF
      await downloadReportPDF(
        selectedReportType,
        reportData,
        pdfFilters,
        reportTitle,
        null
      );
      
      console.log('PDF descargado exitosamente');
      
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      setError('Error al generar PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedReportType, reportData, filters, reportTitle, handleGeneratePreview, reportTypes]);

  // Cerrar vista previa
  const handleClosePreview = useCallback((): void => {
    setPreviewOpen(false);
  }, []);

  // Limpiar filtros
  const handleClearFilters = useCallback((): void => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    setFilters({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      status: 'all',
      category: 'all',
      field: 'all',
      warehouse: 'all',
      supplier: 'all',
      type: 'all',
      sourceWarehouse: 'all',
      targetWarehouse: 'all',
      crop: 'all'
    });
    
    setReportData([]);
    setPreviewOpen(false);
  }, []);

  // Funciones para formatear datos de preview
  const getPreviewColumns = useCallback((): PreviewColumn[] => {
    switch (selectedReportType) {
      case 'products':
        return [
          { key: 'name', label: 'Nombre' },
          { key: 'category', label: 'Categoría' },
          { key: 'stock', label: 'Stock' },
          { key: 'unit', label: 'Unidad' },
          { key: 'minStock', label: 'Stock Mín.' },
          { key: 'cost', label: 'Costo', format: 'currency' }
        ];
      case 'transfers':
        return [
          { key: 'transferNumber', label: 'Número' },
          { key: 'requestDate', label: 'Fecha', format: 'date' },
          { key: 'sourceWarehouse.name', label: 'Origen' },
          { key: 'targetWarehouse.name', label: 'Destino' },
          { key: 'status', label: 'Estado', format: 'status' }
        ];
      case 'fumigations':
        return [
          { key: 'orderNumber', label: 'Orden' },
          { key: 'applicationDate', label: 'Fecha', format: 'date' },
          { key: 'establishment', label: 'Establecimiento' },
          { key: 'crop', label: 'Cultivo' },
          { key: 'totalSurface', label: 'Superficie (ha)' },
          { key: 'status', label: 'Estado', format: 'status' }
        ];
      case 'harvests':
        return [
          { key: 'field.name', label: 'Campo' },
          { key: 'crop', label: 'Cultivo' },
          { key: 'plannedDate', label: 'Fecha Planificada', format: 'date' },
          { key: 'actualDate', label: 'Fecha Real', format: 'date' },
          { key: 'expectedYield', label: 'Rendimiento Esperado' },
          { key: 'status', label: 'Estado', format: 'status' }
        ];
      case 'purchases':
        return [
          { key: 'purchaseNumber', label: 'Número' },
          { key: 'purchaseDate', label: 'Fecha', format: 'date' },
          { key: 'supplier', label: 'Proveedor' },
          { key: 'totalAmount', label: 'Monto Total', format: 'currency' },
          { key: 'status', label: 'Estado', format: 'status' }
        ];
      case 'expenses':
        return [
          { key: 'expenseNumber', label: 'Número' },
          { key: 'date', label: 'Fecha', format: 'date' },
          { key: 'type', label: 'Tipo', format: 'expenseType' },
          { key: 'description', label: 'Descripción' },
          { key: 'amount', label: 'Monto', format: 'currency' }
        ];
      case 'activities':
        return [
          { key: 'createdAt', label: 'Fecha', format: 'datetime' },
          { key: 'entity', label: 'Entidad', format: 'activityType' },
          { key: 'type', label: 'Acción' },
          { key: 'entityName', label: 'Elemento' },
          { key: 'userName', label: 'Usuario' }
        ];
      case 'inventory':
        return [
          { key: 'name', label: 'Nombre' },
          { key: 'type', label: 'Tipo' },
          { key: 'location', label: 'Ubicación' },
          { key: 'capacity', label: 'Capacidad' },
          { key: 'status', label: 'Estado', format: 'status' }
        ];
      default:
        return [];
    }
  }, [selectedReportType]);

  // Obtener valor anidado de un objeto usando notación de punto
  const getNestedValue = useCallback((obj: any, path: string): any => {
    if (!obj || typeof obj !== 'object') return '';
    
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : '';
    }, obj);
  }, []);

  // Formatear valores según el tipo
  const formatValue = useCallback((value: any, format?: string): string => {
    if (value == null || value === undefined) return '';
    
    switch (format) {
      case 'date':
        if (value.seconds) {
          return new Date(value.seconds * 1000).toLocaleDateString('es-ES');
        }
        return new Date(value).toLocaleDateString('es-ES');
      case 'datetime':
        if (value.seconds) {
          return new Date(value.seconds * 1000).toLocaleString('es-ES');
        }
        return new Date(value).toLocaleString('es-ES');
      case 'currency':
        return new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS'
        }).format(Number(value) || 0);
      case 'status':
        const statusMap: Record<string, string> = {
          'pending': 'Pendiente',
          'approved': 'Aprobado',
          'shipped': 'Enviado',
          'completed': 'Completado',
          'cancelled': 'Cancelado',
          'scheduled': 'Programado',
          'in_progress': 'En Proceso',
          'partial_delivered': 'Entrega Parcial'
        };
        return statusMap[value] || value;
      case 'expenseType':
        return value === 'product' ? 'Venta' : 'Gasto';
      case 'activityType':
        const typeMap: Record<string, string> = {
          'transfer': 'Transferencia',
          'fumigation': 'Fumigación',
          'harvest': 'Cosecha',
          'purchase': 'Compra',
          'expense': 'Gasto'
        };
        return typeMap[value] || value;
      default:
        return String(value);
    }
  }, []);

  // Estados de loading y error combinados
  const isLoading = loading || reportsLoading;
  const currentError = error || reportsError;

  return {
    // Estados
    selectedReportType,
    filters,
    reportData,
    reportTitle,
    previewOpen,
    loading: isLoading,
    error: currentError || '',
    availableOptions,
    reportTypes,
    
    // Funciones
    handleReportTypeChange,
    handleFilterChange,
    handleGeneratePreview,
    handleDownloadPDF,
    handleClosePreview,
    handleClearFilters,
    getApplicableFilters,
    getPreviewColumns,
    getNestedValue,
    formatValue,
    
    // Datos auxiliares
    fields,
    warehouses
  };
};

export default useReportsController;
