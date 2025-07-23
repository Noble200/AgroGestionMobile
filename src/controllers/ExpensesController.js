// src/controllers/ExpensesController.js - Controlador para gastos con logging de actividades
import { useState, useEffect, useCallback } from 'react';
import { useExpenses } from '../contexts/ExpenseContext';
import { useStock } from '../contexts/StockContext';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger'; // NUEVO: Hook para logging

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
  const { logExpense } = useActivityLogger(); // NUEVO: Hook de logging

  // Estados locales
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'add-expense', 'edit-expense', 'view-expense'
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    dateRange: { start: null, end: null },
    searchTerm: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredExpensesList, setFilteredExpensesList] = useState([]);

  // Cargar datos necesarios
  const loadData = useCallback(async () => {
    try {
      setError('');
      
      // Cargar productos y gastos
      await Promise.all([
        products.length === 0 ? loadProducts() : Promise.resolve(),
        loadExpenses()
      ]);
    } catch (err) {
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
  const getFilteredExpenses = useCallback(() => {
    if (!Array.isArray(expenses) || expenses.length === 0) return [];
    
    return expenses.filter(expense => {
      // Filtro por tipo
      if (filters.type !== 'all' && expense.type !== filters.type) {
        return false;
      }
      
      // Filtro por categoría
      if (filters.category !== 'all') {
        const expenseCategory = expense.type === 'product' ? expense.productCategory : expense.category;
        if (expenseCategory !== filters.category) {
          return false;
        }
      }
      
      // Filtro por fecha
      if (filters.dateRange.start || filters.dateRange.end) {
        const expenseDate = expense.date
          ? new Date(expense.date.seconds ? expense.date.seconds * 1000 : expense.date)
          : null;
        
        if (!expenseDate) return false;
        
        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          if (expenseDate < startDate) return false;
        }
        
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999); // Ajustar al final del día
          if (expenseDate > endDate) return false;
        }
      }
      
      // Búsqueda por texto
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          (expense.expenseNumber && expense.expenseNumber.toLowerCase().includes(term)) ||
          (expense.productName && expense.productName.toLowerCase().includes(term)) ||
          (expense.description && expense.description.toLowerCase().includes(term)) ||
          (expense.supplier && expense.supplier.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [expenses, filters]);

  // Actualizar gastos filtrados cuando cambian los filtros o gastos
  useEffect(() => {
    setFilteredExpensesList(getFilteredExpenses());
  }, [getFilteredExpenses]);

  // Abrir diálogo para añadir gasto
  const handleAddExpense = useCallback(() => {
    setSelectedExpense(null);
    setDialogType('add-expense');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para editar gasto
  const handleEditExpense = useCallback((expense) => {
    setSelectedExpense(expense);
    setDialogType('edit-expense');
    setDialogOpen(true);
  }, []);

  // Abrir diálogo para ver detalles de gasto
  const handleViewExpense = useCallback((expense) => {
    setSelectedExpense(expense);
    setDialogType('view-expense');
    setDialogOpen(true);
  }, []);

  // MODIFICADO: Confirmar eliminación de gasto con logging
  const handleDeleteExpense = useCallback(async (expenseId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.')) {
      try {
        // Obtener datos del gasto antes de eliminarlo
        const expenseToDelete = expenses.find(e => e.id === expenseId);
        
        await deleteExpense(expenseId);
        
        // NUEVO: Registrar actividad de eliminación
        if (expenseToDelete) {
          await logExpense('delete', {
            id: expenseId,
            expenseNumber: expenseToDelete.expenseNumber,
            type: expenseToDelete.type
          }, {
            amount: expenseToDelete.type === 'product' ? expenseToDelete.totalAmount : expenseToDelete.amount,
            category: expenseToDelete.type === 'product' ? expenseToDelete.productCategory : expenseToDelete.category,
            productName: expenseToDelete.productName,
            supplier: expenseToDelete.supplier,
            description: expenseToDelete.description,
            quantitySold: expenseToDelete.quantitySold,
            deletedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido',
            reason: 'Eliminación manual desde panel de gastos'
          });
        }
        
        // Cerrar el diálogo si estaba abierto para este gasto
        if (selectedExpense && selectedExpense.id === expenseId) {
          setDialogOpen(false);
        }
      } catch (err) {
        console.error('Error al eliminar gasto:', err);
        setError('Error al eliminar gasto: ' + err.message);
      }
    }
  }, [deleteExpense, selectedExpense, expenses, logExpense, currentUser]);

  // MODIFICADO: Guardar gasto con logging
  const handleSaveExpense = useCallback(async (expenseData) => {
    try {
      let expenseId;
      
      if (dialogType === 'add-expense') {
        // Crear nuevo gasto
        expenseId = await addExpense(expenseData);
        
        // NUEVO: Registrar actividad de creación
        await logExpense('create', {
          id: expenseId,
          expenseNumber: expenseData.expenseNumber,
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
          stockAdjusted: expenseData.type === 'product' && expenseData.quantitySold > 0
        });
        
      } else if (dialogType === 'edit-expense' && selectedExpense) {
        // Actualizar gasto existente
        expenseId = await updateExpense(selectedExpense.id, expenseData);
        
        // NUEVO: Registrar actividad de actualización con detección de cambios
        const changes = detectExpenseChanges(selectedExpense, expenseData);
        
        await logExpense('update', {
          id: selectedExpense.id,
          expenseNumber: expenseData.expenseNumber,
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
          changesSummary: changes.length > 0 ? changes.join(', ') : 'Sin cambios significativos',
          updatedBy: currentUser?.displayName || currentUser?.email || 'Usuario desconocido'
        });
      }
      
      setDialogOpen(false);
      await loadExpenses();
      return true;
    } catch (err) {
      console.error('Error al guardar gasto:', err);
      setError('Error al guardar gasto: ' + err.message);
      throw err;
    }
  }, [dialogType, selectedExpense, addExpense, updateExpense, loadExpenses, currentUser, logExpense]);

  // NUEVO: Función para detectar cambios en gastos
  const detectExpenseChanges = useCallback((oldExpense, newExpense) => {
    const changes = [];
    
    // Cambios en tipo de gasto
    if (oldExpense.type !== newExpense.type) {
      const typeMap = {
        'product': 'Venta de producto',
        'misc': 'Gasto varios'
      };
      changes.push(`Tipo: ${typeMap[oldExpense.type]} → ${typeMap[newExpense.type]}`);
    }
    
    // Cambios en descripción o producto
    if (oldExpense.type === 'product' && newExpense.type === 'product') {
      if (oldExpense.productName !== newExpense.productName) {
        changes.push(`Producto: ${oldExpense.productName} → ${newExpense.productName}`);
      }
      if (oldExpense.quantitySold !== newExpense.quantitySold) {
        changes.push(`Cantidad: ${oldExpense.quantitySold} → ${newExpense.quantitySold}`);
      }
      if (oldExpense.unitPrice !== newExpense.unitPrice) {
        changes.push(`Precio unitario: $${oldExpense.unitPrice?.toLocaleString()} → $${newExpense.unitPrice?.toLocaleString()}`);
      }
      if (oldExpense.totalAmount !== newExpense.totalAmount) {
        changes.push(`Total: $${oldExpense.totalAmount?.toLocaleString()} → $${newExpense.totalAmount?.toLocaleString()}`);
      }
    } else if (oldExpense.type === 'misc' && newExpense.type === 'misc') {
      if (oldExpense.description !== newExpense.description) {
        changes.push(`Descripción: ${oldExpense.description} → ${newExpense.description}`);
      }
      if (oldExpense.amount !== newExpense.amount) {
        changes.push(`Importe: $${oldExpense.amount?.toLocaleString()} → $${newExpense.amount?.toLocaleString()}`);
      }
      if (oldExpense.supplier !== newExpense.supplier) {
        changes.push(`Proveedor: ${oldExpense.supplier || 'Sin proveedor'} → ${newExpense.supplier || 'Sin proveedor'}`);
      }
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
    setSelectedExpense(null);
  }, []);

  // Obtener categorías únicas para filtros
  const getUniqueCategories = useCallback(() => {
    const categories = new Set();
    
    // Categorías de productos
    products.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    
    // Categorías de gastos varios
    expenses.forEach(expense => {
      if (expense.type === 'misc' && expense.category) {
        categories.add(expense.category);
      }
    });
    
    return Array.from(categories).sort();
  }, [products, expenses]);

  // Calcular estadísticas de gastos
  const getStatistics = useCallback(() => {
    const totalExpenses = expenses.length;
    const productExpenses = expenses.filter(e => e.type === 'product').length;
    const miscExpenses = expenses.filter(e => e.type === 'misc').length;
    
    const totalAmount = expenses.reduce((sum, expense) => {
      if (expense.type === 'product') {
        return sum + (expense.totalAmount || 0);
      } else {
        return sum + (expense.amount || 0);
      }
    }, 0);
    
    const totalProductsSold = expenses
      .filter(e => e.type === 'product')
      .reduce((sum, expense) => sum + (expense.quantitySold || 0), 0);
    
    // Estadísticas del mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthExpenses = expenses.filter(expense => {
      const expenseDate = expense.date
        ? new Date(expense.date.seconds ? expense.date.seconds * 1000 : expense.date)
        : null;
      return expenseDate && 
             expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
    
    const thisMonthAmount = thisMonthExpenses.reduce((sum, expense) => {
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