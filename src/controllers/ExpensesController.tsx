// src/controllers/ExpensesController.tsx - Controlador para gastos con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useExpenses } from '../contexts/ExpenseContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';

// Interfaces para TypeScript - Redefinidas para evitar conflictos
interface ControllerExpense {
  id: string;
  expenseNumber?: string;
  type: 'product' | 'misc';
  date: any;
  amount?: number;
  totalAmount?: number;
  category?: string;
  productCategory?: string;
  productName?: string;
  productId?: string;
  supplier?: string;
  description?: string;
  quantitySold?: number;
  unitPrice?: number;
  saleReason?: string;
  notes?: string;
  createdBy?: string;
  stockAdjusted?: boolean;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

interface Filters {
  type: string;
  category: string;
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
  types: FilterOption[];
  categories: FilterOption[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface Statistics {
  totalExpenses: number;
  productExpenses: number;
  miscExpenses: number;
  totalAmount: number;
  totalProductsSold: number;
  thisMonthExpenses: number;
  thisMonthAmount: number;
}

interface ExpenseChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  type?: string;
}

interface UseExpensesControllerReturn {
  expenses: ControllerExpense[];
  products: any[];
  loading: boolean;
  error: string;
  selectedExpense: ControllerExpense | null;
  dialogOpen: boolean;
  dialogType: string;
  filterOptions: FilterOptions;
  statistics: Statistics;
  handleAddExpense: () => void;
  handleEditExpense: (expense: ControllerExpense) => void;
  handleViewExpense: (expense: ControllerExpense) => void;
  handleDeleteExpense: (expenseId: string) => Promise<void>;
  handleSaveExpense: (expenseData: Partial<ControllerExpense>) => Promise<boolean>;
  handleFilterChange: (filterName: string, value: any) => void;
  handleSearch: (searchTerm: string) => void;
  handleCloseDialog: () => void;
  refreshData: () => Promise<void>;
}

const useExpensesController = (): UseExpensesControllerReturn => {
  const {
    expenses: stockExpenses,
    loading: expensesLoading,
    error: expensesError,
    loadExpenses,
    addExpense,
    updateExpense,
    deleteExpense
  } = useExpenses();
  
  const {
    products = [],
    loading: productsLoading,
    error: productsError,
    loadProducts
  } = useStock();

  const { currentUser } = useAuth();
  const { logExpense } = useActivityLogger();

  // Convertir gastos del stock a nuestro tipo local
  const expenses: ControllerExpense[] = stockExpenses.map(expense => {
    const expenseAny = expense as any;
    
    const baseExpense: ControllerExpense = {
      id: expenseAny.id || '',
      expenseNumber: expenseAny.expenseNumber,
      type: expenseAny.type || 'misc',
      date: expenseAny.date,
      amount: expenseAny.amount,
      totalAmount: expenseAny.totalAmount,
      category: expenseAny.category,
      productCategory: expenseAny.productCategory,
      productName: expenseAny.productName,
      productId: expenseAny.productId,
      supplier: expenseAny.supplier,
      description: expenseAny.description,
      quantitySold: expenseAny.quantitySold,
      unitPrice: expenseAny.unitPrice,
      saleReason: expenseAny.saleReason,
      notes: expenseAny.notes,
      createdBy: expenseAny.createdBy,
      stockAdjusted: expenseAny.stockAdjusted,
      createdAt: expenseAny.createdAt,
      updatedAt: expenseAny.updatedAt
    };
    
    return baseExpense;
  });

  // Estados locales
  const [selectedExpense, setSelectedExpense] = useState<ControllerExpense | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>(''); // 'add-expense', 'edit-expense', 'view-expense'
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    category: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredExpensesList, setFilteredExpensesList] = useState<ControllerExpense[]>([]);

  // Cargar datos necesarios
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      
      // Cargar productos y gastos
      await Promise.all([
        products.length === 0 ? loadProducts() : Promise.resolve(),
        loadExpenses()
      ]);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadProducts, loadExpenses, products.length]);

  // Actualizar estado de carga y error
  useEffect(() => {
    const isLoading = expensesLoading || productsLoading;
    setLoading(isLoading);
    
    // Establecer mensaje de error si lo hay
    if (expensesError) {
      setError(expensesError);
    } else if (productsError) {
      setError(productsError);
    } else {
      setError('');
    }
  }, [expensesLoading, productsLoading, expensesError, productsError]);

  // Cargar datos al iniciar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar gastos según filtros aplicados
  const getFilteredExpenses = useCallback((): ControllerExpense[] => {
    if (!Array.isArray(expenses) || expenses.length === 0) return [];
    
    return expenses.filter((expense: ControllerExpense) => {
      // Filtro por tipo
      if (filters.type !== 'all' && expense.type !== filters.type) {
        return false;
      }
      
      // Filtro por categoría
      if (filters.category !== 'all') {
        const expenseCategory = expense.type === 'product' ? 
          expense.productCategory : expense.category;
        if (expenseCategory !== filters.category) {
          return false;
        }
      }
      
      // Filtro por rango de fechas
      if (filters.dateRange.start || filters.dateRange.end) {
        const expenseDate = expense.date 
          ? new Date(expense.date.seconds ? expense.date.seconds * 1000 : expense.date)
          : null;
          
        if (!expenseDate) return false;
        
        if (filters.dateRange.start && expenseDate < filters.dateRange.start) {
          return false;
        }
        
        if (filters.dateRange.end && expenseDate > filters.dateRange.end) {
          return false;
        }
      }
      
      // Filtro por término de búsqueda
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const searchableFields = [
          expense.expenseNumber,
          expense.description,
          expense.productName,
          expense.supplier,
          expense.notes,
          expense.category,
          expense.productCategory
        ].filter(Boolean);
        
        const matchesSearch = searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm)
        );
        
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [expenses, filters]);

  // Actualizar lista filtrada cuando cambien los gastos o filtros
  useEffect(() => {
    setFilteredExpensesList(getFilteredExpenses());
  }, [getFilteredExpenses]);

  // Abrir diálogo para agregar gasto
  const handleAddExpense = useCallback((): void => {
    setSelectedExpense(null);
    setDialogType('add-expense');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar gasto
  const handleEditExpense = useCallback((expense: ControllerExpense): void => {
    setSelectedExpense(expense);
    setDialogType('edit-expense');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver gasto
  const handleViewExpense = useCallback((expense: ControllerExpense): void => {
    setSelectedExpense(expense);
    setDialogType('view-expense');
    setDialogOpen(true);
  }, []);

  // Eliminar gasto
  const handleDeleteExpense = useCallback(async (expenseId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.')) {
      try {
        setError('');
        
        // Buscar el gasto antes de eliminarlo para el logging
        const expenseToDelete = expenses.find((exp: ControllerExpense) => exp.id === expenseId);
        
        await deleteExpense(expenseId);
        
        // NUEVO: Registrar actividad de eliminación
        if (expenseToDelete) {
          await logExpense('delete', {
            id: expenseId,
            expenseNumber: expenseToDelete.expenseNumber || 'Sin número',
            type: expenseToDelete.type
          }, {
            amount: expenseToDelete.type === 'product' ? expenseToDelete.totalAmount : expenseToDelete.amount,
            category: expenseToDelete.type === 'product' ? expenseToDelete.productCategory : expenseToDelete.category,
            productName: expenseToDelete.productName,
            supplier: expenseToDelete.supplier,
            description: expenseToDelete.description,
            deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
          });
        }
        
        if (selectedExpense && selectedExpense.id === expenseId) {
          setDialogOpen(false);
        }
        
        // Recargar datos
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar gasto:', err);
        setError('Error al eliminar gasto: ' + err.message);
      }
    }
  }, [expenses, deleteExpense, logExpense, currentUser, selectedExpense, loadData]);

  // NUEVO: Función para detectar cambios entre gastos
  const detectExpenseChanges = useCallback((currentExpense: ControllerExpense, newData: Partial<ControllerExpense>): ExpenseChange[] => {
    const changes: ExpenseChange[] = [];
    
    const fieldsToMonitor: Record<string, string> = {
      description: 'Descripción',
      supplier: 'Proveedor',
      productName: 'Producto',
      quantitySold: 'Cantidad vendida',
      unitPrice: 'Precio unitario',
      notes: 'Notas',
      saleReason: 'Razón de venta'
    };
    
    for (const [field, label] of Object.entries(fieldsToMonitor)) {
      const oldValue = (currentExpense as any)[field];
      const newValue = (newData as any)[field];
      
      if (oldValue !== newValue && !(oldValue == null && newValue == null)) {
        changes.push({
          field,
          label,
          oldValue: formatExpenseValue(oldValue, field),
          newValue: formatExpenseValue(newValue, field),
          type: getExpenseChangeType(field, oldValue, newValue)
        });
      }
    }
    
    // Cambios en monto
    const oldAmount = currentExpense.type === 'product' ? currentExpense.totalAmount : currentExpense.amount;
    const newAmount = newData.type === 'product' ? newData.totalAmount : newData.amount;
    if (oldAmount !== newAmount) {
      changes.push({
        field: 'amount',
        label: 'Monto',
        oldValue: `$${oldAmount || 0}`,
        newValue: `$${newAmount || 0}`,
        type: (newAmount || 0) > (oldAmount || 0) ? 'increase' : 'decrease'
      });
    }
    
    // Cambios en categoría
    const oldCategory = currentExpense.type === 'product' ? currentExpense.productCategory : currentExpense.category;
    const newCategory = newData.type === 'product' ? newData.productCategory : newData.category;
    if (oldCategory !== newCategory) {
      changes.push({
        field: 'category',
        label: 'Categoría',
        oldValue: oldCategory || 'Sin categoría',
        newValue: newCategory || 'Sin categoría',
        type: 'category'
      });
    }
    
    // Cambios en fecha
    const oldDate = currentExpense.date 
      ? new Date(currentExpense.date.seconds ? currentExpense.date.seconds * 1000 : currentExpense.date)
      : null;
    const newDate = newData.date 
      ? new Date(newData.date.seconds ? newData.date.seconds * 1000 : newData.date)
      : null;
      
    if (oldDate && newDate && oldDate.getTime() !== newDate.getTime()) {
      changes.push({
        field: 'date',
        label: 'Fecha',
        oldValue: oldDate.toLocaleDateString('es-ES'),
        newValue: newDate.toLocaleDateString('es-ES'),
        type: 'date'
      });
    }
    
    return changes;
  }, []);

  // NUEVO: Función para formatear valores según el tipo de campo
  const formatExpenseValue = (value: any, field: string): string => {
    if (value == null) return 'Sin definir';
    
    switch (field) {
      case 'quantitySold':
        return `${value} unidades`;
      case 'unitPrice':
        return `$${value}`;
      default:
        return String(value);
    }
  };

  // NUEVO: Función para determinar el tipo de cambio
  const getExpenseChangeType = (field: string, oldValue: any, newValue: any): string => {
    switch (field) {
      case 'quantitySold':
      case 'unitPrice':
        const oldNum = Number(oldValue) || 0;
        const newNum = Number(newValue) || 0;
        if (newNum > oldNum) return 'increase';
        if (newNum < oldNum) return 'decrease';
        return 'update';
      default:
        return 'update';
    }
  };

  // NUEVO: Función para generar resumen de cambios
  const generateExpenseChangesSummary = (changes: ExpenseChange[]): string => {
    const summaryParts: string[] = [];
    
    changes.forEach(change => {
      switch (change.type) {
        case 'increase':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬆️)`);
          break;
        case 'decrease':
          summaryParts.push(`${change.label}: ${change.oldValue} → ${change.newValue} (⬇️)`);
          break;
        case 'category':
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

  // Guardar gasto (crear o actualizar)
  const handleSaveExpense = useCallback(async (expenseData: Partial<ControllerExpense>): Promise<boolean> => {
    try {
      setError('');
      let expenseId: string;
      
      if (dialogType === 'add-expense') {
        // Convertir datos para el contexto
        const contextExpenseData = {
          expenseNumber: expenseData.expenseNumber,
          type: expenseData.type || 'misc',
          date: expenseData.date,
          amount: expenseData.amount,
          totalAmount: expenseData.totalAmount,
          category: expenseData.category,
          productCategory: expenseData.productCategory,
          productName: expenseData.productName,
          productId: expenseData.productId,
          supplier: expenseData.supplier,
          description: expenseData.description,
          quantitySold: expenseData.quantitySold,
          unitPrice: expenseData.unitPrice,
          saleReason: expenseData.saleReason,
          notes: expenseData.notes
        };
        
        // Crear nuevo gasto
        expenseId = await addExpense(contextExpenseData);
        
        // NUEVO: Registrar actividad de creación
        await logExpense('create', {
          id: expenseId,
          expenseNumber: expenseData.expenseNumber || 'Generado automáticamente',
          type: expenseData.type || 'misc'
        }, {
          amount: expenseData.type === 'product' ? expenseData.totalAmount : expenseData.amount,
          category: expenseData.type === 'product' ? expenseData.productCategory : expenseData.category,
          productName: expenseData.productName,
          productId: expenseData.productId,
          supplier: expenseData.supplier,
          description: expenseData.description,
          quantitySold: expenseData.quantitySold,
          unitPrice: expenseData.unitPrice,
          saleReason: expenseData.saleReason,
          createdBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
          notes: expenseData.notes,
          stockAdjusted: expenseData.type === 'product' && (expenseData.quantitySold || 0) > 0
        });
        
      } else if (dialogType === 'edit-expense' && selectedExpense) {
        // Convertir datos para el contexto
        const contextExpenseData = {
          expenseNumber: expenseData.expenseNumber,
          type: expenseData.type,
          date: expenseData.date,
          amount: expenseData.amount,
          totalAmount: expenseData.totalAmount,
          category: expenseData.category,
          productCategory: expenseData.productCategory,
          productName: expenseData.productName,
          productId: expenseData.productId,
          supplier: expenseData.supplier,
          description: expenseData.description,
          quantitySold: expenseData.quantitySold,
          unitPrice: expenseData.unitPrice,
          saleReason: expenseData.saleReason,
          notes: expenseData.notes
        };
        
        // Actualizar gasto existente
        expenseId = await updateExpense(selectedExpense.id, contextExpenseData);
        
        // NUEVO: Registrar actividad de actualización con detección de cambios
        const changes = detectExpenseChanges(selectedExpense, expenseData);
        
        await logExpense('update', {
          id: selectedExpense.id,
          expenseNumber: expenseData.expenseNumber || 'Sin número',
          type: expenseData.type || selectedExpense.type
        }, {
          amount: expenseData.type === 'product' ? expenseData.totalAmount : expenseData.amount,
          previousAmount: selectedExpense.type === 'product' ? selectedExpense.totalAmount : selectedExpense.amount,
          category: expenseData.type === 'product' ? expenseData.productCategory : expenseData.category,
          productName: expenseData.productName,
          supplier: expenseData.supplier,
          description: expenseData.description,
          changes: changes,
          changesCount: changes.length,
          changesSummary: changes.length > 0 ? 
            generateExpenseChangesSummary(changes) : 
            'Sin cambios detectados',
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
          notes: expenseData.notes
        });
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedExpense(null);
      await loadData();
      return true;
      
    } catch (err: any) {
      console.error('Error al guardar gasto:', err);
      setError('Error al guardar gasto: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedExpense, addExpense, updateExpense, logExpense, currentUser, loadData, detectExpenseChanges]);

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
    setSelectedExpense(null);
  }, []);

  // Obtener categorías únicas para filtros
  const getUniqueCategories = useCallback((): string[] => {
    const categories = new Set<string>();
    
    // Categorías de productos
    products.forEach((product: any) => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    
    // Categorías de gastos varios
    expenses.forEach((expense: ControllerExpense) => {
      if (expense.type === 'misc' && expense.category) {
        categories.add(expense.category);
      }
    });
    
    return Array.from(categories).sort();
  }, [products, expenses]);

  // Calcular estadísticas de gastos
  const getStatistics = useCallback((): Statistics => {
    const totalExpenses = expenses.length;
    const productExpenses = expenses.filter((e: ControllerExpense) => e.type === 'product').length;
    const miscExpenses = expenses.filter((e: ControllerExpense) => e.type === 'misc').length;
    
    const totalAmount = expenses.reduce((sum: number, expense: ControllerExpense) => {
      if (expense.type === 'product') {
        return sum + (expense.totalAmount || 0);
      } else {
        return sum + (expense.amount || 0);
      }
    }, 0);
    
    const totalProductsSold = expenses
      .filter((e: ControllerExpense) => e.type === 'product')
      .reduce((sum: number, expense: ControllerExpense) => sum + (expense.quantitySold || 0), 0);
    
    // Estadísticas del mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthExpenses = expenses.filter((expense: ControllerExpense) => {
      const expenseDate = expense.date
        ? new Date(expense.date.seconds ? expense.date.seconds * 1000 : expense.date)
        : null;
      return expenseDate && 
             expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
    
    const thisMonthAmount = thisMonthExpenses.reduce((sum: number, expense: ControllerExpense) => {
      if (expense.type === 'product') {
        return sum + (expense.totalAmount || 0);
      } else {
        return sum + (expense.amount || 0);
      }
    }, 0);
    
    return {
      totalExpenses,
      productExpenses,
      miscExpenses,
      totalAmount,
      totalProductsSold,
      thisMonthExpenses: thisMonthExpenses.length,
      thisMonthAmount
    };
  }, [expenses]);

  // Opciones para filtros
  const filterOptions: FilterOptions = {
    types: [
      { value: 'all', label: 'Todos los tipos' },
      { value: 'product', label: 'Ventas de productos' },
      { value: 'misc', label: 'Gastos varios' }
    ],
    categories: [
      { value: 'all', label: 'Todas las categorías' },
      ...getUniqueCategories().map(cat => ({ value: cat, label: cat }))
    ],
    dateRange: {
      start: null,
      end: null
    }
  };

  return {
    expenses: filteredExpensesList,
    products: Array.isArray(products) ? products : [],
    loading,
    error,
    selectedExpense,
    dialogOpen,
    dialogType,
    filterOptions,
    statistics: getStatistics(),
    handleAddExpense,
    handleEditExpense,
    handleViewExpense,
    handleDeleteExpense,
    handleSaveExpense,
    handleFilterChange,
    handleSearch,
    handleCloseDialog,
    refreshData: loadData
  };
};

export default useExpensesController;