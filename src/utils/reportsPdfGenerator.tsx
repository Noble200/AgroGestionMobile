// src/utils/reportsPdfGenerator.tsx - Generador de PDFs para reportes
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Declaración de tipo para autoTable si no existe
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Tipos específicos para jsPDF interno
interface PDFInternal {
  getCurrentPageInfo(): { pageNumber: number };
  getNumberOfPages(): number;
  [key: string]: any;
}

// Interfaces para TypeScript
interface ReportFilters {
  startDate?: string | Date;
  endDate?: string | Date;
  status?: string;
  category?: string;
  [key: string]: any;
}

interface Product {
  id?: string;
  name?: string;
  category?: string;
  stock?: number;
  minStock?: number;
  unit?: string;
  cost?: number;
  [key: string]: any;
}

interface Transfer {
  id?: string;
  transferNumber?: string;
  requestDate?: any;
  createdAt?: any;
  sourceWarehouse?: { name?: string };
  targetWarehouse?: { name?: string };
  products?: any[];
  status?: string;
  requestedBy?: string;
  [key: string]: any;
}

interface Fumigation {
  id?: string;
  orderNumber?: string;
  applicationDate?: any;
  establishment?: string;
  crop?: string;
  totalSurface?: number;
  applicator?: string;
  status?: string;
  [key: string]: any;
}

interface Harvest {
  id?: string;
  field?: { name?: string };
  crop?: string;
  plannedDate?: any;
  totalArea?: number;
  estimatedYield?: number;
  actualYield?: number;
  status?: string;
  [key: string]: any;
}

interface Purchase {
  id?: string;
  purchaseNumber?: string;
  purchaseDate?: any;
  supplier?: string;
  products?: any[];
  totalAmount?: number;
  status?: string;
  createdBy?: string;
  [key: string]: any;
}

interface Expense {
  id?: string;
  type?: 'product' | 'misc';
  productName?: string;
  description?: string;
  totalAmount?: number;
  amount?: number;
  createdBy?: string;
  [key: string]: any;
}

interface Activity {
  id?: string;
  date?: any;
  type?: string;
  title?: string;
  description?: string;
  status?: string;
  [key: string]: any;
}

interface Field {
  id?: string;
  name?: string;
  location?: string;
  area?: number;
  areaUnit?: string;
  lots?: any[];
  owner?: string;
  [key: string]: any;
}

interface Warehouse {
  id?: string;
  name?: string;
  type?: string;
  location?: string;
  capacity?: number;
  capacityUnit?: string;
  status?: string;
  [key: string]: any;
}

interface InventoryData {
  fields?: Field[];
  warehouses?: Warehouse[];
}

type ReportData = Product[] | Transfer[] | Fumigation[] | Harvest[] | Purchase[] | Expense[] | Activity[] | InventoryData;

class ReportsPDFGenerator {
  private doc: jsPDF | null;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;

  constructor() {
    this.doc = null;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 15;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;
  }

  // Función principal para generar reportes
  generateReport(reportType: string, data: ReportData, filters: ReportFilters = {}, title: string = 'Reporte'): jsPDF {
    try {
      this.doc = new jsPDF();
      this.currentY = this.margin;
      
      // Encabezado del reporte
      this.addReportHeader(title, filters);
      
      // Contenido específico según el tipo de reporte
      switch (reportType) {
        case 'products':
          this.addProductsReport(data as Product[]);
          break;
        case 'transfers':
          this.addTransfersReport(data as Transfer[]);
          break;
        case 'fumigations':
          this.addFumigationsReport(data as Fumigation[]);
          break;
        case 'harvests':
          this.addHarvestsReport(data as Harvest[]);
          break;
        case 'purchases':
          this.addPurchasesReport(data as Purchase[]);
          break;
        case 'expenses':
          this.addExpensesReport(data as Expense[]);
          break;
        case 'activities':
          this.addActivitiesReport(data as Activity[]);
          break;
        case 'inventory':
          this.addInventoryReport(data as InventoryData);
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }
      
      // Pie de página
      this.addReportFooter();
      
      return this.doc;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw new Error('Error al generar el PDF del reporte: ' + (error as Error).message);
    }
  }

  // Encabezado del reporte
  private addReportHeader(title: string, filters: ReportFilters): void {
    if (!this.doc) return;

    // Logo y título de la empresa
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('AgroGestión', this.margin, this.currentY);
    
    this.currentY += 8;
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Sistema de Gestión Agrícola', this.margin, this.currentY);
    
    this.currentY += 15;
    
    // Título del reporte
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    
    this.currentY += 10;
    
    // Información de filtros aplicados
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    let filtersText = `Generado el: ${new Date().toLocaleString('es-ES')}`;
    
    if (filters.startDate && filters.endDate) {
      filtersText += ` | Período: ${new Date(filters.startDate).toLocaleDateString('es-ES')} - ${new Date(filters.endDate).toLocaleDateString('es-ES')}`;
    }
    
    if (filters.status && filters.status !== 'all') {
      filtersText += ` | Estado: ${filters.status}`;
    }
    
    if (filters.category && filters.category !== 'all') {
      filtersText += ` | Categoría: ${filters.category}`;
    }
    
    this.doc.text(filtersText, this.margin, this.currentY);
    this.currentY += 15;
    
    // Línea separadora
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  // Reporte de productos
  private addProductsReport(products: Product[]): void {
    if (!products || products.length === 0) {
      this.addNoDataMessage('No se encontraron productos con los filtros aplicados.');
      return;
    }
    
    // Resumen estadístico
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length;
    const emptyStock = products.filter(p => (p.stock || 0) === 0).length;
    const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || 0)), 0);
    
    this.addSummarySection('Resumen de Productos', [
      ['Total de productos:', totalProducts.toString()],
      ['Con stock bajo:', lowStockProducts.toString()],
      ['Sin stock:', emptyStock.toString()],
      ['Valor total estimado:', this.formatCurrency(totalValue)]
    ]);
    
    // Tabla de productos
    const headers = [['Nombre', 'Categoría', 'Stock', 'Mín.', 'Unidad', 'Costo', 'Valor']];
    const rows = products.map(product => [
      product.name || '',
      product.category || '',
      (product.stock || 0).toString(),
      (product.minStock || 0).toString(),
      product.unit || '',
      this.formatCurrency(product.cost || 0),
      this.formatCurrency((product.stock || 0) * (product.cost || 0))
    ]);
    
    this.addDataTable(headers, rows, 'Lista de Productos');
  }

  // Reporte de transferencias
  private addTransfersReport(transfers: Transfer[]): void {
    if (!transfers || transfers.length === 0) {
      this.addNoDataMessage('No se encontraron transferencias con los filtros aplicados.');
      return;
    }
    
    // Resumen estadístico
    const totalTransfers = transfers.length;
    const pendingTransfers = transfers.filter(t => t.status === 'pending').length;
    const completedTransfers = transfers.filter(t => t.status === 'completed').length;
    const totalProducts = transfers.reduce((sum, t) => sum + (t.products?.length || 0), 0);
    
    this.addSummarySection('Resumen de Transferencias', [
      ['Total de transferencias:', totalTransfers.toString()],
      ['Pendientes:', pendingTransfers.toString()],
      ['Completadas:', completedTransfers.toString()],
      ['Total productos transferidos:', totalProducts.toString()]
    ]);
    
    // Tabla de transferencias
    const headers = [['Número', 'Fecha', 'Origen', 'Destino', 'Productos', 'Estado', 'Solicitado por']];
    const rows = transfers.map(transfer => [
      transfer.transferNumber || transfer.id?.substring(0, 8) || '',
      this.formatDate(transfer.requestDate || transfer.createdAt),
      transfer.sourceWarehouse?.name || 'Desconocido',
      transfer.targetWarehouse?.name || 'Desconocido',
      (transfer.products?.length || 0).toString(),
      this.getStatusText(transfer.status),
      transfer.requestedBy || ''
    ]);
    
    this.addDataTable(headers, rows, 'Lista de Transferencias');
  }

  // Reporte de fumigaciones
  private addFumigationsReport(fumigations: Fumigation[]): void {
    if (!fumigations || fumigations.length === 0) {
      this.addNoDataMessage('No se encontraron fumigaciones con los filtros aplicados.');
      return;
    }
    
    // Resumen estadístico
    const totalFumigations = fumigations.length;
    const completedFumigations = fumigations.filter(f => f.status === 'completed').length;
    const pendingFumigations = fumigations.filter(f => f.status === 'pending').length;
    const totalSurface = fumigations.reduce((sum, f) => sum + (f.totalSurface || 0), 0);
    
    this.addSummarySection('Resumen de Fumigaciones', [
      ['Total de fumigaciones:', totalFumigations.toString()],
      ['Completadas:', completedFumigations.toString()],
      ['Pendientes:', pendingFumigations.toString()],
      ['Superficie total:', `${totalSurface.toFixed(2)} ha`]
    ]);
    
    // Tabla de fumigaciones
    const headers = [['Orden', 'Fecha', 'Establecimiento', 'Cultivo', 'Superficie', 'Aplicador', 'Estado']];
    const rows = fumigations.map(fumigation => [
      fumigation.orderNumber || fumigation.id?.substring(0, 8) || '',
      this.formatDate(fumigation.applicationDate),
      fumigation.establishment || '',
      fumigation.crop || '',
      `${fumigation.totalSurface || 0} ha`,
      fumigation.applicator || '',
      this.getStatusText(fumigation.status)
    ]);
    
    this.addDataTable(headers, rows, 'Lista de Fumigaciones');
  }

  // Reporte de cosechas
  private addHarvestsReport(harvests: Harvest[]): void {
    if (!harvests || harvests.length === 0) {
      this.addNoDataMessage('No se encontraron cosechas con los filtros aplicados.');
      return;
    }
    
    // Resumen estadístico
    const totalHarvests = harvests.length;
    const completedHarvests = harvests.filter(h => h.status === 'completed').length;
    const pendingHarvests = harvests.filter(h => h.status === 'pending').length;
    const totalArea = harvests.reduce((sum, h) => sum + (h.totalArea || 0), 0);
    const totalHarvested = harvests.reduce((sum, h) => sum + (h.actualYield || 0), 0);
    
    this.addSummarySection('Resumen de Cosechas', [
      ['Total de cosechas:', totalHarvests.toString()],
      ['Completadas:', completedHarvests.toString()],
      ['Pendientes:', pendingHarvests.toString()],
      ['Área total:', `${totalArea.toFixed(2)} ha`],
      ['Total cosechado:', `${totalHarvested.toFixed(2)} kg`]
    ]);
    
    // Tabla de cosechas
    const headers = [['Campo', 'Cultivo', 'Fecha Plan.', 'Área', 'Rend. Est.', 'Rend. Real', 'Estado']];
    const rows = harvests.map(harvest => [
      harvest.field?.name || 'Campo desconocido',
      harvest.crop || '',
      this.formatDate(harvest.plannedDate),
      `${harvest.totalArea || 0} ha`,
      `${harvest.estimatedYield || 0} kg/ha`,
      `${harvest.actualYield || 0} kg/ha`,
      this.getStatusText(harvest.status)
    ]);
    
    this.addDataTable(headers, rows, 'Lista de Cosechas');
  }

  // Reporte de compras
  private addPurchasesReport(purchases: Purchase[]): void {
    if (!purchases || purchases.length === 0) {
      this.addNoDataMessage('No se encontraron compras con los filtros aplicados.');
      return;
    }
    
    // Resumen estadístico
    const totalPurchases = purchases.length;
    const completedPurchases = purchases.filter(p => p.status === 'completed').length;
    const pendingPurchases = purchases.filter(p => p.status === 'pending').length;
    const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalProducts = purchases.reduce((sum, p) => sum + (p.products?.length || 0), 0);
    
    this.addSummarySection('Resumen de Compras', [
      ['Total de compras:', totalPurchases.toString()],
      ['Completadas:', completedPurchases.toString()],
      ['Pendientes:', pendingPurchases.toString()],
      ['Monto total:', this.formatCurrency(totalAmount)],
      ['Total productos:', totalProducts.toString()]
    ]);
    
    // Tabla de compras
    const headers = [['Número', 'Fecha', 'Proveedor', 'Productos', 'Monto', 'Estado', 'Creado por']];
    const rows = purchases.map(purchase => [
      purchase.purchaseNumber || purchase.id?.substring(0, 8) || '',
      this.formatDate(purchase.purchaseDate),
      purchase.supplier || '',
      (purchase.products?.length || 0).toString(),
      this.formatCurrency(purchase.totalAmount || 0),
      this.getStatusText(purchase.status),
      purchase.createdBy || ''
    ]);
    
    this.addDataTable(headers, rows, 'Lista de Compras');
  }

  // Reporte de gastos
  private addExpensesReport(expenses: Expense[]): void {
    if (!expenses || expenses.length === 0) {
      this.addNoDataMessage('No se encontraron gastos con los filtros aplicados.');
      return;
    }
    
    // Resumen estadístico
    const totalExpenses = expenses.length;
    const productExpenses = expenses.filter(e => e.type === 'product').length;
    const miscExpenses = expenses.filter(e => e.type === 'misc').length;
    const totalAmount = expenses.reduce((sum, e) => {
      return sum + (e.type === 'product' ? (e.totalAmount || 0) : (e.amount || 0));
    }, 0);
    
    this.addSummarySection('Resumen de Gastos', [
      ['Total de gastos:', totalExpenses.toString()],
      ['Ventas de productos:', productExpenses.toString()],
      ['Gastos varios:', miscExpenses.toString()],
      ['Monto total:', this.formatCurrency(totalAmount)]
    ]);
    
    // Tabla de gastos
    const headers = [['Fecha', 'Tipo', 'Concepto', 'Monto', 'Creado por']];
    const rows = expenses.map(expense => [
      this.formatDate((expense as any).date),
      expense.type === 'product' ? 'Venta' : 'Gasto',
      expense.type === 'product' ? (expense.productName || '') : (expense.description || ''),
      this.formatCurrency(expense.type === 'product' ? (expense.totalAmount || 0) : (expense.amount || 0)),
      expense.createdBy || ''
    ]);
    
    this.addDataTable(headers, rows, 'Lista de Gastos');
  }

  // Reporte de actividades generales
  private addActivitiesReport(activities: Activity[]): void {
    if (!activities || activities.length === 0) {
      this.addNoDataMessage('No se encontraron actividades con los filtros aplicados.');
      return;
    }
    
    // Resumen estadístico por tipo
    const transfersCount = activities.filter(a => a.type === 'transfer').length;
    const fumigationsCount = activities.filter(a => a.type === 'fumigation').length;
    const harvestsCount = activities.filter(a => a.type === 'harvest').length;
    const purchasesCount = activities.filter(a => a.type === 'purchase').length;
    const expensesCount = activities.filter(a => a.type === 'expense').length;
    
    this.addSummarySection('Resumen de Actividades', [
      ['Total de actividades:', activities.length.toString()],
      ['Transferencias:', transfersCount.toString()],
      ['Fumigaciones:', fumigationsCount.toString()],
      ['Cosechas:', harvestsCount.toString()],
      ['Compras:', purchasesCount.toString()],
      ['Gastos:', expensesCount.toString()]
    ]);
    
    // Tabla de actividades
    const headers = [['Fecha', 'Tipo', 'Título', 'Descripción', 'Estado']];
    const rows = activities.map(activity => [
      this.formatDate(activity.date),
      this.getActivityTypeText(activity.type),
      activity.title || '',
      activity.description || '',
      this.getStatusText(activity.status)
    ]);
    
    this.addDataTable(headers, rows, 'Lista de Actividades');
  }

  // Reporte de inventario (campos y almacenes)
  private addInventoryReport(data: InventoryData): void {
    const { fields = [], warehouses = [] } = data;
    
    // Resumen de campos
    if (fields.length > 0) {
      const totalFields = fields.length;
      const totalArea = fields.reduce((sum, f) => sum + (f.area || 0), 0);
      const totalLots = fields.reduce((sum, f) => sum + (f.lots?.length || 0), 0);
      
      this.addSummarySection('Resumen de Campos', [
        ['Total de campos:', totalFields.toString()],
        ['Área total:', `${totalArea.toFixed(2)} ha`],
        ['Total de lotes:', totalLots.toString()]
      ]);
      
      // Tabla de campos
      const fieldsHeaders = [['Nombre', 'Ubicación', 'Área', 'Lotes', 'Propietario']];
      const fieldsRows = fields.map(field => [
        field.name || '',
        field.location || '',
        `${field.area || 0} ${field.areaUnit || 'ha'}`,
        (field.lots?.length || 0).toString(),
        field.owner || ''
      ]);
      
      this.addDataTable(fieldsHeaders, fieldsRows, 'Lista de Campos');
    }
    
    // Resumen de almacenes
    if (warehouses.length > 0) {
      const totalWarehouses = warehouses.length;
      const activeWarehouses = warehouses.filter(w => w.status === 'active').length;
      const totalCapacity = warehouses.reduce((sum, w) => sum + (w.capacity || 0), 0);
      
      this.addSummarySection('Resumen de Almacenes', [
        ['Total de almacenes:', totalWarehouses.toString()],
        ['Almacenes activos:', activeWarehouses.toString()],
        ['Capacidad total:', `${totalCapacity.toFixed(2)} ton`]
      ]);
      
      // Tabla de almacenes
      const warehousesHeaders = [['Nombre', 'Tipo', 'Ubicación', 'Capacidad', 'Estado']];
      const warehousesRows = warehouses.map(warehouse => [
        warehouse.name || '',
        warehouse.type || '',
        warehouse.location || '',
        `${warehouse.capacity || 0} ${warehouse.capacityUnit || 'ton'}`,
        this.getStatusText(warehouse.status)
      ]);
      
      this.addDataTable(warehousesHeaders, warehousesRows, 'Lista de Almacenes');
    }
  }

  // Añadir sección de resumen
  private addSummarySection(title: string, data: string[][]): void {
    if (!this.doc) return;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;
    
    this.doc.autoTable({
      startY: this.currentY,
      body: data,
      bodyStyles: {
        fillColor: [248, 249, 250],
        textColor: [33, 33, 33],
        fontSize: 10,
        cellPadding: 3
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: this.contentWidth - 60 }
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.5,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid'
    });
    
    this.currentY = this.doc.lastAutoTable.finalY + 10;
  }

  // Añadir tabla de datos
  private addDataTable(headers: string[][], rows: string[][], title: string): void {
    if (!this.doc) return;

    // Verificar si necesitamos una nueva página
    if (this.currentY > this.pageHeight - 80) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;
    
    this.doc.autoTable({
      startY: this.currentY,
      head: headers,
      body: rows,
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2.5
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.3,
      margin: { left: this.margin, right: this.margin },
      theme: 'striped',
      didDrawPage: (data: any) => {
        // Añadir número de página
        const doc = this.doc as any;
        const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
        this.doc!.setFontSize(8);
        this.doc!.setFont('helvetica', 'normal');
        this.doc!.text(
          `Página ${pageNumber}`,
          this.pageWidth - this.margin - 20,
          this.pageHeight - 10
        );
      }
    });
    
    this.currentY = this.doc.lastAutoTable.finalY + 15;
  }

  // Añadir mensaje cuando no hay datos
  private addNoDataMessage(message: string): void {
    if (!this.doc) return;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(message, this.margin, this.currentY);
    this.currentY += 20;
  }

  // Pie de página del reporte
  private addReportFooter(): void {
    if (!this.doc) return;

    const doc = this.doc as any;
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Línea separadora
      this.doc.setLineWidth(0.3);
      this.doc.line(this.margin, this.pageHeight - 25, this.pageWidth - this.margin, this.pageHeight - 25);
      
      // Información del pie
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        'Generado por AgroGestión - Sistema de Gestión Agrícola',
        this.margin,
        this.pageHeight - 15
      );
      
      this.doc.text(
        `Página ${i} de ${pageCount}`,
        this.pageWidth - this.margin - 30,
        this.pageHeight - 15
      );
    }
  }

  // Funciones de utilidad
  private formatDate(date: any): string {
    if (!date) return 'Sin fecha';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount || 0);
  }

  private getStatusText(status?: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendiente',
      'approved': 'Aprobado',
      'rejected': 'Rechazado',
      'shipped': 'Enviado',
      'completed': 'Completado',
      'cancelled': 'Cancelado',
      'scheduled': 'Programado',
      'in_progress': 'En Proceso',
      'active': 'Activo',
      'inactive': 'Inactivo',
      'partial_delivered': 'Entrega Parcial'
    };
    
    return statusMap[status || ''] || status || 'Desconocido';
  }

  private getActivityTypeText(type?: string): string {
    const typeMap: { [key: string]: string } = {
      'transfer': 'Transferencia',
      'fumigation': 'Fumigación',
      'harvest': 'Cosecha',
      'purchase': 'Compra',
      'expense': 'Gasto'
    };
    
    return typeMap[type || ''] || type || 'Desconocido';
  }

  // Métodos para descargar y obtener el PDF
  downloadPDF(filename: string | null = null): void {
    if (!this.doc) {
      throw new Error('No hay documento PDF generado');
    }
    
    const defaultFilename = `Reporte_AgroGestion_${new Date().toISOString().split('T')[0]}.pdf`;
    this.doc.save(filename || defaultFilename);
  }

  getPDFBlob(): Blob {
    if (!this.doc) {
      throw new Error('No hay documento PDF generado');
    }
    return this.doc.output('blob');
  }

  getPDFDataURL(): string {
    if (!this.doc) {
      throw new Error('No hay documento PDF generado');
    }
    return this.doc.output('dataurlstring');
  }
}

// Exportar funciones
export const generateReportPDF = async (reportType: string, data: ReportData, filters: ReportFilters = {}, title: string = 'Reporte'): Promise<ReportsPDFGenerator> => {
  const generator = new ReportsPDFGenerator();
  generator.generateReport(reportType, data, filters, title);
  return generator;
};

export const downloadReportPDF = async (reportType: string, data: ReportData, filters: ReportFilters = {}, title: string = 'Reporte', filename: string | null = null): Promise<void> => {
  const generator = await generateReportPDF(reportType, data, filters, title);
  generator.downloadPDF(filename);
};

export default ReportsPDFGenerator;