// src/controllers/ExpensesController.tsx - Controlador para gastos con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useExpenses } from '../contexts/ExpenseContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';

// Tipos TypeScript
interface FilterOptions {
  type: string;
  category: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchTerm: string;
}

interface FilterSelectOption {
  value: string;
  label: string;
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

interface ExpenseData {
  expenseNumber?: string;
  type: 'product' | 'misc';
  date: Date | any;
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
}

interface Expense extends ExpenseData {
  id: string;
  createdBy?: string;
  stockAdjusted?: boolean;
}

const useExpensesController = () => {
  const {
    expenses,
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

  // Estados locales
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogType, setDialogType] = useState<string>(''); // 'add-expense', 'edit-expense', 'view-expense'
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    category: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filteredExpensesList, setFilteredExpensesList] = useState<Expense[]>([]);

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
  const getFilteredExpenses = useCallback((): Expense[] => {
    if (!Array.isArray(expenses) || expenses.length === 0) return [];
    
    return expenses.filter((expense: Expense) => {
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
  const handleAddExpense = useCallback(() => {
    setSelectedExpense(null);
    setDialogType('add-expense');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar gasto
  const handleEditExpense = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setDialogType('edit-expense');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver gasto
  const handleViewExpense = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setDialogType('view-expense');
    setDialogOpen(true);
  }, []);

  // Eliminar gasto
  const handleDeleteExpense = useCallback(async (expenseId: string): Promise<void> => {
    try {
      setError('');
      
      // Buscar el gasto antes de eliminarlo para el logging
      const expenseToDelete = expenses.find((exp: Expense) => exp.id === expenseId);
      
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
          deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      // Recargar datos
      await loadData();
    } catch (err: any) {
      console.error('Error al eliminar gasto:', err);
      setError('Error al eliminar gasto: ' + err.message);
    }
  }, [expenses, deleteExpense, logExpense, currentUser, loadData]);

  // Detectar cambios entre gastos para logging
  const detectExpenseChanges = useCallback((oldExpense: Expense, newExpense: ExpenseData): string[] => {
    const changes: string[] = [];
    
    // Cambios en monto
    const oldAmount = oldExpense.type === 'product' ? oldExpense.totalAmount : oldExpense.amount;
    const newAmount = newExpense.type === 'product' ? newExpense.totalAmount : newExpense.amount;
    if (oldAmount !== newAmount) {
      changes.push(`Monto: $${oldAmount || 0} → $${newAmount || 0}`);
    }
    
    // Cambios en descripción
    if (oldExpense.description !== newExpense.description) {
      changes.push(`Descripción: ${oldExpense.description || 'Sin descripción'} → ${newExpense.description || 'Sin descripción'}`);
    }
    
    // Cambios en proveedor (solo para gastos varios)
    if (oldExpense.supplier !== newExpense.supplier) {
      changes.push(`Proveedor: ${oldExpense.supplier || 'Sin proveedor'} → ${newExpense.supplier || 'Sin proveedor'}`);
    }
    
    // Cambios en producto (solo para ventas)
    if (oldExpense.productName !== newExpense.productName) {
      changes.push(`Producto: ${oldExpense.productName || 'Sin producto'} → ${newExpense.productName || 'Sin producto'}`);
    }
    
    // Cambios en cantidad vendida
    if (oldExpense.quantitySold !== newExpense.quantitySold) {
      changes.push(`Cantidad: ${oldExpense.quantitySold || 0} → ${newExpense.quantitySold || 0}`);
    }
    
    // Cambios en categoría
    const oldCategory = oldExpense.type === 'product' ? oldExpense.productCategory : oldExpense.category;
    const newCategory = newExpense.type === 'product' ? newExpense.productCategory : newExpense.category;
    if (oldCategory !== newCategory) {
      changes.push(`Categoría: ${oldCategory || 'Sin categoría'} → ${newCategory || 'Sin categoría'}`);
    }
    
    // Cambios en fecha
    const oldDate = oldExpense.date 
      ? new Date(oldExpense.date.seconds ? oldExpense.date.seconds * 1000 : oldExpense.date)
      : null;
    const newDate = newExpense.date 
      ? new Date(newExpense.date.seconds ? newExpense.date.seconds * 1000 : newExpense.date)
      : null;
      
    if (oldDate && newDate && oldDate.getTime() !== newDate.getTime()) {
      changes.push(`Fecha: ${oldDate.toLocaleDateString('es-ES')} → ${newDate.toLocaleDateString('es-ES')}`);
    }
    
    return changes;
  }, []);

  // Guardar gasto (crear o actualizar)
  const handleSaveExpense = useCallback(async (expenseData: ExpenseData): Promise<void> => {
    try {
      setError('');
      let expenseId: string;
      
      if (dialogType === 'add-expense') {
        // Crear nuevo gasto
        expenseId = await addExpense(expenseData);
        
        // Registrar actividad de creación
        await logExpense('create', {
          id: expenseId,
          expenseNumber: expenseData.expenseNumber || 'Generado automáticamente',
          type: expenseData.type
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
        // Actualizar gasto existente
        expenseId = await updateExpense(selectedExpense.id, expenseData);
        
        // Registrar actividad de actualización con detección de cambios
        const changes = detectExpenseChanges(selectedExpense, expenseData);
        
        await logExpense('update', {
          id: selectedExpense.id,
          expenseNumber: expenseData.expenseNumber || 'Sin número',
          type: expenseData.type
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
            `${changes.length} cambio${changes.length > 1 ? 's' : ''}: ${changes.join(', ')}` : 
            'Sin cambios detectados',
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
          notes: expenseData.notes
        });
      }
      
      // Cerrar diálogo y recargar datos
      setDialogOpen(false);
      setSelectedExpense(null);
      await loadData();
      
    } catch (err: any) {
      console.error('Error al guardar gasto:', err);
      setError('Error al guardar gasto: ' + err.message);
    }
  }, [dialogType, selectedExpense, addExpense, updateExpense, logExpense, currentUser, loadData, detectExpenseChanges]);

  // Cambiar filtros
  const handleFilterChange = useCallback((filterName: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Buscar por texto
  const handleSearch = useCallback((searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      searchTerm
    }));
  }, []);

  // Cerrar diálogo
  const handleCloseDialog = useCallback(() => {
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
    expenses.forEach((expense: Expense) => {
      if (expense.type === 'misc' && expense.category) {
        categories.add(expense.category);
      }
    });
    
    return Array.from(categories).sort();
  }, [products, expenses]);

  // Calcular estadísticas de gastos
  const getStatistics = useCallback((): Statistics => {
    const totalExpenses = expenses.length;
    const productExpenses = expenses.filter((e: Expense) => e.type === 'product').length;
    const miscExpenses = expenses.filter((e: Expense) => e.type === 'misc').length;
    
    const totalAmount = expenses.reduce((sum: number, expense: Expense) => {
      if (expense.type === 'product') {
        return sum + (expense.totalAmount || 0);
      } else {
        return sum + (expense.amount || 0);
      }
    }, 0);
    
    const totalProductsSold = expenses
      .filter((e: Expense) => e.type === 'product')
      .reduce((sum: number, expense: Expense) => sum + (expense.quantitySold || 0), 0);
    
    // Estadísticas del mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthExpenses = expenses.filter((expense: Expense) => {
      const expenseDate = expense.date
        ? new Date(expense.date.seconds ? expense.date.seconds * 1000 : expense.date)
        : null;
      return expenseDate && 
             expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
    
    const thisMonthAmount = thisMonthExpenses.reduce((sum: number, expense: Expense) => {
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
  const filterOptions = {
    types: [
      { value: 'all', label: 'Todos los tipos' },
      { value: 'product', label: 'Ventas de productos' },
      { value: 'misc', label: 'Gastos varios' }
    ] as FilterSelectOption[],
    categories: [
      { value: 'all', label: 'Todas las categorías' },
      ...getUniqueCategories().map(cat => ({ value: cat, label: cat }))
    ] as FilterSelectOption[],
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