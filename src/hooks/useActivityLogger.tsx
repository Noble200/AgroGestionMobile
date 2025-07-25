// src/hooks/useActivityLogger.tsx
import { useCallback } from 'react';
import { useActivities } from '../contexts/ActivityContext';

// Interfaces para TypeScript
interface EntityData {
  id?: string;
  _id?: string;
  uid?: string;
  name?: string;
  transferNumber?: string;
  orderNumber?: string;
  expenseNumber?: string;
  purchaseNumber?: string;
  username?: string;
  displayName?: string;
  title?: string;
  description?: string;
  [key: string]: any;
}

interface AdditionalData {
  [key: string]: any;
}

interface Metadata {
  [key: string]: any;
}

interface Product extends EntityData {
  category?: string;
  stock?: number;
  minStock?: number;
  unit?: string;
  warehouseId?: string;
  fieldId?: string;
  cost?: number;
}

interface Transfer extends EntityData {
  transferNumber?: string;
  sourceWarehouse?: { name?: string };
  targetWarehouse?: { name?: string };
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  status?: string;
  transferDate?: any;
  productCount?: number;
}

interface Fumigation extends EntityData {
  orderNumber?: string;
  crop?: string;
  fieldId?: string;
  field?: { name?: string };
  status?: string;
  applicationDate?: any;
  selectedProducts?: any[];
}

interface Harvest extends EntityData {
  harvestNumber?: string;
  crop?: string;
  fieldId?: string;
  field?: { name?: string };
  status?: string;
  harvestDate?: any;
  estimatedYield?: number;
  yieldUnit?: string;
}

interface Purchase extends EntityData {
  purchaseNumber?: string;
  supplier?: string;
  status?: string;
  purchaseDate?: any;
  deliveries?: any[];
}

interface Expense extends EntityData {
  expenseNumber?: string;
  type?: string;
  amount?: number;
  totalAmount?: number;
  category?: string;
  productCategory?: string;
  productName?: string;
  quantitySold?: number;
  supplier?: string;
  date?: any;
}

interface Field extends EntityData {
  location?: string;
  area?: number;
  areaUnit?: string;
  owner?: string;
  lots?: any[];
  status?: string;
  soilType?: string;
}

interface Warehouse extends EntityData {
  type?: string;
  location?: string;
  capacity?: number;
  capacityUnit?: string;
  fieldId?: string;
  status?: string;
  storageCondition?: string;
  supervisor?: string;
}

interface User extends EntityData {
  username?: string;
  email?: string;
  role?: string;
  permissions?: { [key: string]: any };
  displayName?: string;
}

// Descripciones de acciones
const actionDescriptions: { [key: string]: string } = {
  // Productos
  'product-create': 'Creó un producto',
  'product-update': 'Actualizó un producto',
  'product-delete': 'Eliminó un producto',
  'product-stock-adjust': 'Ajustó stock de producto',
  'product-stock-increase': 'Aumentó stock de producto',
  'product-stock-decrease': 'Redujo stock de producto',
  
  // Transferencias
  'transfer-create': 'Creó una transferencia',
  'transfer-update': 'Actualizó una transferencia',
  'transfer-delete': 'Eliminó una transferencia',
  'transfer-complete': 'Completó una transferencia',
  'transfer-cancel': 'Canceló una transferencia',
  'transfer-approve': 'Aprobó una transferencia',
  
  // Fumigaciones
  'fumigation-create': 'Creó una fumigación',
  'fumigation-update': 'Actualizó una fumigación',
  'fumigation-delete': 'Eliminó una fumigación',
  'fumigation-complete': 'Completó una fumigación',
  'fumigation-cancel': 'Canceló una fumigación',
  
  // Cosechas
  'harvest-create': 'Creó una cosecha',
  'harvest-update': 'Actualizó una cosecha',
  'harvest-delete': 'Eliminó una cosecha',
  'harvest-complete': 'Completó una cosecha',
  'harvest-cancel': 'Canceló una cosecha',
  
  // Compras
  'purchase-create': 'Creó una compra',
  'purchase-update': 'Actualizó una compra',
  'purchase-delete': 'Eliminó una compra',
  'purchase-complete': 'Completó una compra',
  'purchase-cancel': 'Canceló una compra',
  'purchase-delivery-add': 'Añadió entrega a compra',
  
  // Gastos
  'expense-create': 'Creó un gasto',
  'expense-update': 'Actualizó un gasto',
  'expense-delete': 'Eliminó un gasto',
  
  // Campos
  'field-create': 'Creó un campo',
  'field-update': 'Actualizó un campo',
  'field-delete': 'Eliminó un campo',
  'field-lot-add': 'Añadió lote a campo',
  'field-lot-remove': 'Eliminó lote de campo',
  
  // Almacenes
  'warehouse-create': 'Creó un almacén',
  'warehouse-update': 'Actualizó un almacén',
  'warehouse-delete': 'Eliminó un almacén',
  'warehouse-activate': 'Activó un almacén',
  'warehouse-deactivate': 'Desactivó un almacén',
  
  // Usuarios
  'user-create': 'Creó un usuario',
  'user-update': 'Actualizó un usuario',
  'user-delete': 'Eliminó un usuario',
  'user-permissions-update': 'Actualizó permisos de usuario',
  'user-login': 'Inició sesión',
  'user-logout': 'Cerró sesión',
  
  // Sistema
  'system-backup': 'Realizó respaldo del sistema',
  'system-restore': 'Restauró respaldo del sistema',
  'system-maintenance': 'Realizó mantenimiento del sistema'
};

export const useActivityLogger = () => {
  const { logActivity } = useActivities();

  // Función principal para registrar actividades con timestamp del servidor
  const log = useCallback(async (action: string, entityData: EntityData, additionalData: AdditionalData = {}) => {
    try {
      console.log('🔄 ActivityLogger - Registrando actividad:', {
        action,
        entity: entityData?.name || entityData?.id,
        timestamp: new Date().toISOString() // Para debug, pero se usará serverTimestamp en Firebase
      });
      
      // Extraer el tipo de entidad y acción del string de acción
      const [entity, actionType] = action.split('-');
      
      // Validar datos mínimos
      if (!entity || !actionType) {
        console.warn('⚠️ ActivityLogger - Acción malformada:', action);
        return;
      }
      
      // Preparar la descripción y metadata
      const description = generateDescription(action, entityData, additionalData);
      const metadata = cleanMetadata({
        ...additionalData,
        // No incluir timestamp local, Firebase usará serverTimestamp()
        userAgent: navigator.userAgent,
        originalData: sanitizeEntityData(entityData)
      });

      console.log('✅ ActivityLogger - Datos de actividad preparados');
      
      // Llamar a logActivity con los parámetros correctos según tu ActivityContext
      await logActivity(
        actionType,           // type: string
        description,          // action: string (descripción de la acción)
        entity,              // entity: string
        entityData,          // entityData?: any
        metadata             // metadata?: any
      );
      
      console.log('🎉 ActivityLogger - Actividad registrada exitosamente');
      
    } catch (error) {
      console.error('❌ ActivityLogger - Error al registrar actividad:', error);
      // No interrumpir la operación principal
    }
  }, [logActivity]);

  // Métodos específicos para cada tipo de entidad
  const logProduct = useCallback((action: string, product: Product, additionalData: AdditionalData = {}) => {
    return log(`product-${action}`, product, {
      category: product.category,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      warehouseId: product.warehouseId,
      fieldId: product.fieldId,
      cost: product.cost,
      ...additionalData
    });
  }, [log]);

  const logTransfer = useCallback((action: string, transfer: Transfer, additionalData: AdditionalData = {}) => {
    return log(`transfer-${action}`, transfer, {
      transferNumber: transfer.transferNumber,
      sourceWarehouse: transfer.sourceWarehouse?.name,
      targetWarehouse: transfer.targetWarehouse?.name,
      sourceWarehouseId: transfer.sourceWarehouseId,
      targetWarehouseId: transfer.targetWarehouseId,
      status: transfer.status,
      transferDate: formatSafeDate(transfer.transferDate),
      productCount: transfer.productCount,
      ...additionalData
    });
  }, [log]);

  const logFumigation = useCallback((action: string, fumigation: Fumigation, additionalData: AdditionalData = {}) => {
    return log(`fumigation-${action}`, fumigation, {
      orderNumber: fumigation.orderNumber,
      crop: fumigation.crop,
      fieldId: fumigation.fieldId,
      fieldName: fumigation.field?.name,
      status: fumigation.status,
      applicationDate: formatSafeDate(fumigation.applicationDate),
      productCount: fumigation.selectedProducts?.length || 0,
      ...additionalData
    });
  }, [log]);

  const logHarvest = useCallback((action: string, harvest: Harvest, additionalData: AdditionalData = {}) => {
    return log(`harvest-${action}`, harvest, {
      harvestNumber: harvest.harvestNumber,
      crop: harvest.crop,
      fieldId: harvest.fieldId,
      fieldName: harvest.field?.name,
      status: harvest.status,
      harvestDate: formatSafeDate(harvest.harvestDate),
      estimatedYield: harvest.estimatedYield,
      yieldUnit: harvest.yieldUnit,
      ...additionalData
    });
  }, [log]);

  const logPurchase = useCallback((action: string, purchase: Purchase, additionalData: AdditionalData = {}) => {
    return log(`purchase-${action}`, purchase, {
      purchaseNumber: purchase.purchaseNumber,
      supplier: purchase.supplier,
      status: purchase.status,
      purchaseDate: formatSafeDate(purchase.purchaseDate),
      createdBy: purchase.createdBy,
      deliveriesCount: purchase.deliveries?.length || 0,
      ...additionalData
    });
  }, [log]);

  const logExpense = useCallback((action: string, expense: Expense, additionalData: AdditionalData = {}) => {
    return log(`expense-${action}`, expense, {
      expenseNumber: expense.expenseNumber,
      type: expense.type,
      amount: expense.amount || expense.totalAmount,
      category: expense.category || expense.productCategory,
      productName: expense.productName,
      quantitySold: expense.quantitySold,
      supplier: expense.supplier,
      date: formatSafeDate(expense.date),
      ...additionalData
    });
  }, [log]);

  const logField = useCallback((action: string, field: Field, additionalData: AdditionalData = {}) => {
    return log(`field-${action}`, field, {
      location: field.location,
      area: field.area,
      areaUnit: field.areaUnit,
      owner: field.owner,
      lotsCount: field.lots?.length || 0,
      status: field.status,
      soilType: field.soilType,
      ...additionalData
    });
  }, [log]);

  const logWarehouse = useCallback((action: string, warehouse: Warehouse, additionalData: AdditionalData = {}) => {
    return log(`warehouse-${action}`, warehouse, {
      type: warehouse.type,
      location: warehouse.location,
      capacity: warehouse.capacity,
      capacityUnit: warehouse.capacityUnit,
      fieldId: warehouse.fieldId,
      status: warehouse.status,
      storageCondition: warehouse.storageCondition,
      supervisor: warehouse.supervisor,
      ...additionalData
    });
  }, [log]);

  const logUser = useCallback((action: string, user: User, additionalData: AdditionalData = {}) => {
    return log(`user-${action}`, user, {
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions ? Object.keys(user.permissions) : [],
      displayName: user.displayName,
      ...additionalData
    });
  }, [log]);

  // Método para registrar actividades del sistema
  const logSystem = useCallback((action: string, data: AdditionalData = {}, additionalData: AdditionalData = {}) => {
    return log(`system-${action}`, {
      id: `system-${Date.now()}`,
      name: `Sistema - ${action}`
    }, {
      ...data,
      ...additionalData
    });
  }, [log]);

  // Métodos de conveniencia para acciones comunes
  const logBulkAction = useCallback(async (action: string, entities: EntityData[], additionalData: AdditionalData = {}) => {
    try {
      for (const entity of entities) {
        await log(action, entity, {
          ...additionalData,
          bulkOperation: true,
          totalItems: entities.length
        });
      }
    } catch (error) {
      console.error('Error en operación masiva:', error);
    }
  }, [log]);

  const logStockMovement = useCallback((product: Product, oldStock: number, newStock: number, reason: string = '') => {
    const difference = newStock - oldStock;
    const action = difference > 0 ? 'stock-increase' : 'stock-decrease';
    
    return logProduct('stock-adjust', product, {
      oldStock,
      newStock,
      difference: Math.abs(difference),
      reason,
      movementType: action
    });
  }, [logProduct]);

  const logStatusChange = useCallback((entity: EntityData, entityType: string, oldStatus: string, newStatus: string, reason: string = '') => {
    return log(`${entityType}-update`, entity, {
      oldStatus,
      newStatus,
      statusChange: true,
      reason,
      changeType: 'status'
    });
  }, [log]);

  return {
    // Método principal
    log,
    
    // Métodos por entidad
    logProduct,
    logTransfer,
    logFumigation,
    logHarvest,
    logPurchase,
    logExpense,
    logField,
    logWarehouse,
    logUser,
    logSystem,
    
    // Métodos de conveniencia
    logBulkAction,
    logStockMovement,
    logStatusChange
  };
};

// Funciones auxiliares

// Obtener ID de entidad de manera más robusta
function getEntityId(entityData: EntityData): string {
  return entityData?.id || 
         entityData?._id || 
         entityData?.uid ||
         entityData?.transferNumber ||
         entityData?.orderNumber ||
         entityData?.expenseNumber ||
         entityData?.purchaseNumber ||
         `temp-${Date.now()}`;
}

function getEntityName(entityData: EntityData): string {
  return entityData?.name || 
         entityData?.transferNumber || 
         entityData?.orderNumber || 
         entityData?.expenseNumber || 
         entityData?.purchaseNumber ||
         entityData?.username ||
         entityData?.displayName ||
         entityData?.title ||
         entityData?.description ||
         `Elemento ${getEntityId(entityData).substring(0, 8)}` ||
         'Entidad sin nombre';
}

// Limpiar metadata para evitar valores undefined
function cleanMetadata(metadata: Metadata): Metadata {
  const cleaned: Metadata = {};
  
  Object.keys(metadata).forEach(key => {
    const value = metadata[key];
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanMetadata(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
}

// Sanitizar datos de entidad para evitar información sensible
function sanitizeEntityData(entityData: EntityData): Partial<EntityData> {
  const { password, token, secret, apiKey, ...sanitized } = entityData;
  return sanitized;
}

// Formatear fechas de manera completamente segura
function formatSafeDate(dateInput: any): string | null {
  try {
    if (!dateInput) return null;
    
    let date: Date;
    
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (dateInput?.seconds) {
      // Timestamp de Firebase
      date = new Date(dateInput.seconds * 1000);
    } else if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      // Timestamp object con método toDate
      date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      return null;
    }
    
    // Verificar si la fecha es válida
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

function generateDescription(action: string, entityData: EntityData, additionalData: AdditionalData): string {
  const [entity, actionType] = action.split('-');
  
  try {
    switch (entity) {
      case 'product':
        return generateProductDescription(actionType, entityData, additionalData);
      case 'transfer':
        return generateTransferDescription(actionType, entityData, additionalData);
      case 'fumigation':
        return generateFumigationDescription(actionType, entityData, additionalData);
      case 'harvest':
        return generateHarvestDescription(actionType, entityData, additionalData);
      case 'purchase':
        return generatePurchaseDescription(actionType, entityData, additionalData);
      case 'expense':
        return generateExpenseDescription(actionType, entityData, additionalData);
      case 'field':
        return generateFieldDescription(actionType, entityData, additionalData);
      case 'warehouse':
        return generateWarehouseDescription(actionType, entityData, additionalData);
      case 'user':
        return generateUserDescription(actionType, entityData, additionalData);
      case 'system':
        return `Sistema - ${actionType}`;
      default:
        return `${actionType} ${entity} "${getEntityName(entityData)}"`;
    }
  } catch (error) {
    console.warn('Error al generar descripción:', error);
    return `${actionType} ${entity}`;
  }
}

function generateProductDescription(actionType: string, product: EntityData, data: AdditionalData): string {
  const name = product.name || 'producto';
  
  switch (actionType) {
    case 'create':
      return `Creó producto "${name}" en ${data.category || 'categoría general'}`;
    case 'stock-adjust':
      const movementType = data.movementType === 'stock-increase' ? 'aumentó' : 'redujo';
      return `${movementType.charAt(0).toUpperCase() + movementType.slice(1)} stock de "${name}" en ${data.difference || 0} ${data.unit || 'unidades'}`;
    case 'update':
      return `Actualizó producto "${name}"`;
    default:
      return `${actionType} producto "${name}"`;
  }
}

function generateTransferDescription(actionType: string, transfer: EntityData, data: AdditionalData): string {
  const transferNumber = transfer.transferNumber || 'transferencia';
  
  switch (actionType) {
    case 'create':
      return `Creó ${transferNumber} de ${data.sourceWarehouse || 'origen'} a ${data.targetWarehouse || 'destino'}`;
    case 'complete':
      return `Completó ${transferNumber}`;
    case 'cancel':
      return `Canceló ${transferNumber}`;
    default:
      return `${actionType} ${transferNumber}`;
  }
}

function generateFumigationDescription(actionType: string, fumigation: EntityData, data: AdditionalData): string {
  const orderNumber = fumigation.orderNumber || 'fumigación';
  
  switch (actionType) {
    case 'create':
      return `Creó ${orderNumber} para ${data.crop || 'cultivo'} en ${data.fieldName || 'campo'}`;
    case 'complete':
      return `Completó fumigación ${orderNumber}`;
    default:
      return `${actionType} fumigación ${orderNumber}`;
  }
}

function generateHarvestDescription(actionType: string, harvest: EntityData, data: AdditionalData): string {
  const harvestNumber = harvest.harvestNumber || 'cosecha';
  
  switch (actionType) {
    case 'create':
      return `Creó ${harvestNumber} de ${data.crop || 'cultivo'} en ${data.fieldName || 'campo'}`;
    case 'complete':
      return `Completó cosecha ${harvestNumber}`;
    default:
      return `${actionType} cosecha ${harvestNumber}`;
  }
}

function generatePurchaseDescription(actionType: string, purchase: EntityData, data: AdditionalData): string {
  const purchaseNumber = purchase.purchaseNumber || 'compra';
  
  switch (actionType) {
    case 'create':
      return `Creó ${purchaseNumber} a ${data.supplier || 'proveedor'}`;
    case 'delivery-add':
      return `Añadió entrega a ${purchaseNumber}`;
    default:
      return `${actionType} compra ${purchaseNumber}`;
  }
}

function generateExpenseDescription(actionType: string, expense: EntityData, data: AdditionalData): string {
  const number = expense.expenseNumber || 'gasto';
  
  switch (actionType) {
    case 'create':
      const type = data.type === 'product' ? 'venta' : 'gasto';
      return `Registró ${type} ${number} por ${(data.amount || 0).toLocaleString()}`;
    default:
      return `${actionType} gasto ${number}`;
  }
}

function generateFieldDescription(actionType: string, field: EntityData, data: AdditionalData): string {
  const name = field.name || 'campo';
  
  switch (actionType) {
    case 'create':
      return `Creó campo "${name}" (${data.area || 0} ${data.areaUnit || 'ha'})`;
    case 'lot-add':
      return `Añadió lote al campo "${name}"`;
    default:
      return `${actionType} campo "${name}"`;
  }
}

function generateWarehouseDescription(actionType: string, warehouse: EntityData, data: AdditionalData): string {
  const name = warehouse.name || 'almacén';
  
  switch (actionType) {
    case 'create':
      return `Creó ${data.type || 'almacén'} "${name}"`;
    case 'activate':
      return `Activó almacén "${name}"`;
    case 'deactivate':
      return `Desactivó almacén "${name}"`;
    default:
      return `${actionType} almacén "${name}"`;
  }
}

function generateUserDescription(actionType: string, user: EntityData, data: AdditionalData): string {
  const name = user.displayName || user.username || user.email || 'usuario';
  
  switch (actionType) {
    case 'create':
      return `Creó usuario "${name}" con rol ${data.role || 'usuario'}`;
    case 'login':
      return `Usuario "${name}" inició sesión`;
    case 'logout':
      return `Usuario "${name}" cerró sesión`;
    default:
      return `${actionType} usuario "${name}"`;
  }
}

export default useActivityLogger;