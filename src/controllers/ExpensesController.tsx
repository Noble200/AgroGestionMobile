// src/controllers/ExpensesController.tsx - Controlador para gastos con logging de actividades
import { useState, useEffect, useCallback, useMemo } from 'react';
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
    products,
    loading: productsLoading,
    error: productsError,
    loadProducts
  } = useStock();

  const { currentUser } = useAuth();
  const { logExpense } = useActivityLogger();

  // Estados locales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<ControllerExpense | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    category: 'all',
    dateRange: {
      start: null,
      end: null
    },
    searchTerm: ''
  });

  // Convertir gastos del contexto al formato del controlador
  const expenses: ControllerExpense[] = useMemo(() => {
    if (!Array.isArray(stockExpenses)) return [];
    return stockExpenses.map((expense: any) => ({
      ...expense,
      id: expense.id || '',
      type: expense.type || 'misc',
      date: expense.date,
      amount: expense.amount,
      totalAmount: expense.totalAmount,
      category: expense.category,
      productCategory: expense.productCategory,
      productName: expense.productName,
      productId: expense.productId,
      supplier: expense.supplier,
      description: expense.description,
      quantitySold: expense.quantitySold,
      unitPrice: expense.unitPrice,
      saleReason: expense.saleReason,
      notes: expense.notes,
      createdBy: expense.createdBy,
      stockAdjusted: expense.stockAdjusted,
      expenseNumber: expense.expenseNumber,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt
    }));
  }, [stockExpenses]);

  // Función para cargar datos
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError('');
      await Promise.all([
        products.length === 0 ? loadProducts() : Promise.resolve(),
        loadExpenses()
      ]);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  }, [loadProducts, loadExpenses]); // CORREGIDO: eliminado products.length

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

  // CORREGIDO: Filtrar gastos con useMemo en lugar de useEffect
  const filteredExpenses = useMemo((): ControllerExpense[] => {
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
  }, [expenses, filters]); // CORREGIDO: useMemo con dependencias específicas

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

  // Función para detectar cambios en gastos
  const detectExpenseChanges = useCallback((oldExpense: ControllerExpense, newData: Partial<ControllerExpense>): ExpenseChange[] => {
    const changes: ExpenseChange[] = [];
    
    // Detectar cambios en importe
    const oldAmount = oldExpense.type === 'product' ? oldExpense.totalAmount : oldExpense.amount;
    const newAmount = newData.type === 'product' ? newData.totalAmount : newData.amount;
    
    if (oldAmount !== newAmount) {
      changes.push({
        field: 'amount',
        label: 'Importe',
        oldValue: oldAmount?.toString() || '0',
        newValue: newAmount?.toString() || '0',
        type: (newAmount || 0) > (oldAmount || 0) ? 'increase' : 'decrease'
      });
    }
    
    // Detectar cambios en categoría
    const oldCategory = oldExpense.type === 'product' ? oldExpense.productCategory : oldExpense.category;
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
    
    return changes;
  }, []);

  // Función para generar resumen de cambios
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
        
        // Registrar actividad de creación
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
        
        // Registrar actividad de actualización con detección de cambios
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

  // Eliminar gasto
  const handleDeleteExpense = useCallback(async (expenseId: string): Promise<void> => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.')) {
      try {
        setError('');
        
        // Buscar el gasto antes de eliminarlo para el logging
        const expenseToDelete = expenses.find((exp: ControllerExpense) => exp.id === expenseId);
        
        await deleteExpense(expenseId);
        
        // Registrar actividad de eliminación
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
            deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
            notes: expenseToDelete.notes
          });
        }
        
        await loadData();
      } catch (err: any) {
        console.error('Error al eliminar gasto:', err);
        setError('Error al eliminar gasto: ' + err.message);
        throw err;
      }
    }
  }, [deleteExpense, expenses, logExpense, currentUser, loadData]);

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
    expenses: filteredExpenses, // CORREGIDO: usar filteredExpenses calculado con useMemo
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