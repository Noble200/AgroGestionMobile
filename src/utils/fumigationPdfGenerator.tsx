// src/utils/fumigationPdfGenerator.tsx - Generador PDF EXACTO al documento original
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces para TypeScript
interface Fumigation {
  id?: string;
  orderNumber?: string;
  establishment?: string;
  applicator?: string;
  applicationDate?: any;
  crop?: string;
  totalSurface?: number;
  flowRate?: number;
  observations?: string;
  selectedProducts?: SelectedProduct[];
  lots?: Lot[];
  field?: {
    name?: string;
  };
  fieldId?: string;
  [key: string]: any;
}

interface SelectedProduct {
  productId: string;
  dosePerHa: number;
  doseUnit: string;
  totalQuantity: number;
  unit: string;
  [key: string]: any;
}

interface Product {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  [key: string]: any;
}

interface Lot {
  id: string;
  name: string;
  area?: number;
  [key: string]: any;
}

interface Observation {
  text: string;
  color: [number, number, number];
}

class FumigationPDFGenerator {
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
    this.margin = 15; // Reducido de 20 a 15 para más espacio
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = 0;
  }

  // Función principal para generar PDF de fumigación
  async generateFumigationOrder(fumigation: Fumigation, products: Product[] = [], mapImage: File | null = null): Promise<jsPDF> {
    try {
      this.doc = new jsPDF();
      this.currentY = this.margin;
      
      // Encabezado exacto al original
      this.addHeader(fumigation);
      
      // Información del establecimiento exacta
      this.addEstablishmentInfo(fumigation);
      
      // Tabla de productos exacta al original
      this.addProductsTable(fumigation, products);
      
      // Fechas de inicio y fin
      this.addTimeFields();
      
      // Observaciones exactas
      this.addObservations(fumigation);
      
      // Imagen al final con tamaño fijo
      if (mapImage) {
        await this.addMapAtBottom(mapImage);
      }
      
      return this.doc;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw new Error('Error al generar el PDF de fumigación: ' + (error as Error).message);
    }
  }

  // Encabezado EXACTO al original pero más compacto
  private addHeader(fumigation: Fumigation): void {
    if (!this.doc) return;

    autoTable(this.doc, {
      startY: this.currentY,
      body: [['ORDEN DE APLICACIÓN', `N° ${fumigation.orderNumber || '23'}`]],
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 14, // Reducido de 16 a 14
        halign: 'center',
        lineWidth: 2,
        lineColor: [0, 0, 0],
        cellPadding: 4 // Reducido de 6 a 4
      },
      columnStyles: {
        0: { cellWidth: this.contentWidth / 2 },
        1: { cellWidth: this.contentWidth / 2 }
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 2,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid'
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY;
  }

  // Información del establecimiento más compacta
  private addEstablishmentInfo(fumigation: Fumigation): void {
    if (!this.doc) return;

    const data = [
      ['FECHA:', this.formatDate(fumigation.applicationDate)],
      ['ESTABLECIMIENTO:', fumigation.establishment || 'El Charabón'],
      ['APLICADOR:', fumigation.applicator || 'Caiman']
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      body: data,
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 11, // Reducido de 12 a 11
        cellPadding: 3, // Reducido de 4 a 3
        lineWidth: 2,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 50 },
        1: { halign: 'center', cellWidth: this.contentWidth - 50 }
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 2,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid'
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY;
  }

  // Tabla de productos exacta al original pero más compacta
  private addProductsTable(fumigation: Fumigation, products: Product[]): void {
    if (!this.doc) return;

    const headers = [['CULTIVO', 'LOTE', 'SUPERFICIE\n(HA)', 'PRODUCTO', 'DOSIS', 'TOTAL']];
    const productData = this.prepareProductData(fumigation, products);

    autoTable(this.doc, {
      startY: this.currentY,
      head: headers,
      body: productData,
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 10, // Reducido de 11 a 10
        cellPadding: 3, // Reducido de 4 a 3
        lineWidth: 2,
        lineColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 9, // Reducido de 10 a 9
        cellPadding: 3, // Reducido de 4 a 3
        lineWidth: 2,
        lineColor: [0, 0, 0],
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center' }, // CULTIVO
        1: { halign: 'center' }, // LOTE
        2: { halign: 'center' }, // SUPERFICIE
        3: { halign: 'center' }, // PRODUCTO
        4: { halign: 'center' }, // DOSIS
        5: { halign: 'center' }  // TOTAL
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 2,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid',
      didParseCell: function(data: any) {
        // Aplicar verde solo a la celda del lote con contenido
        if (data.column.index === 1 && data.row.index >= 0 && data.cell.text[0] !== '') {
          data.cell.styles.fillColor = [144, 238, 144];
        }
      }
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY;
  }

  // Preparar datos de productos exacto al original
  private prepareProductData(fumigation: Fumigation, products: Product[]): string[][] {
    const rows: string[][] = [];
    
    if (!fumigation.selectedProducts || fumigation.selectedProducts.length === 0) {
      // Datos de ejemplo como en el original
      return [
        [
          'Soja',
          'Lotes 1A y 1B',
          '75',
          'Humectante',
          '40 cc/ha',
          '3,00 Lts'
        ],
        [
          '',
          '',
          '',
          'Bifentrin',
          '250 cc/ha',
          '18,75 Lts'
        ],
        [
          '',
          '',
          '',
          'Lambdacialotrina 25%',
          '40 cc/ha',
          '3,00 Lts'
        ]
      ];
    }

    // Datos reales de la fumigación
    fumigation.selectedProducts.forEach((selectedProduct: SelectedProduct, index: number) => {
      const productInfo = products.find(p => p.id === selectedProduct.productId);
      const productName = productInfo ? productInfo.name : 'Producto desconocido';
      
      if (index === 0) {
        // Primera fila con cultivo, lote y superficie
        rows.push([
          fumigation.crop || 'Soja',
          this.getLotsText(fumigation),
          (fumigation.totalSurface || 75).toString(),
          productName,
          this.formatDose(selectedProduct),
          this.formatTotal(selectedProduct)
        ]);
      } else {
        // Filas adicionales solo con productos
        rows.push([
          '',
          '',
          '',
          productName,
          this.formatDose(selectedProduct),
          this.formatTotal(selectedProduct)
        ]);
      }
    });

    return rows;
  }

  // Campos de fecha y hora más compactos
  private addTimeFields(): void {
    if (!this.doc) return;

    const timeData = [
      ['FECHA Y HORA DE INICIO', ''],
      ['FECHA Y HORA DE FIN', '']
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      body: timeData,
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 11, // Reducido de 12 a 11
        cellPadding: 6, // Reducido de 8 a 6
        lineWidth: 2,
        lineColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: this.contentWidth / 2 },
        1: { cellWidth: this.contentWidth / 2 }
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 2,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid'
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY;
  }

  // Observaciones más compactas
  private addObservations(fumigation: Fumigation): void {
    if (!this.doc) return;

    // Header de observaciones más compacto
    autoTable(this.doc, {
      startY: this.currentY,
      body: [['OBSERVACIONES:']],
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 11, // Reducido de 12 a 11
        cellPadding: 3, // Reducido de 4 a 3
        lineWidth: 2,
        lineColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 2,
      margin: { left: this.margin, right: this.margin },
      theme: 'grid'
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY;

    // Observaciones exactas del original
    const observations: Observation[] = [
      {
        text: `Mantener caudal mayor a ${fumigation.flowRate || 80} lts de caldo por hectárea.`,
        color: [255, 255, 255]
      },
      {
        text: 'No aplicar con alta insolación ni rocío',
        color: [255, 255, 255]
      },
      {
        text: 'La aplicación en color verde es para hacer en todo el lote',
        color: [144, 238, 144] // Verde exacto
      },
      {
        text: 'La aplicación en celeste es para hacer en cabeceras, la superficie es aproximada',
        color: [173, 216, 230] // Celeste exacto
      }
    ];

    // Agregar observaciones personalizadas
    if (fumigation.observations) {
      observations.push({
        text: fumigation.observations,
        color: [255, 255, 255]
      });
    }
    
    // Renderizar cada observación más compacta
    observations.forEach((obs: Observation) => {
      if (!this.doc) return;

      autoTable(this.doc, {
        startY: this.currentY,
        body: [[obs.text]],
        bodyStyles: {
          fillColor: obs.color,
          textColor: [0, 0, 0],
          fontSize: 9, // Reducido de 10 a 9
          cellPadding: 3, // Reducido de 4 a 3
          lineWidth: 2,
          lineColor: [0, 0, 0],
          halign: 'center'
        },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 2,
        margin: { left: this.margin, right: this.margin },
        theme: 'grid'
      });
      
      this.currentY = (this.doc as any).lastAutoTable.finalY;
    });
  }

  // Agregar mapa optimizado para una sola página
  private async addMapAtBottom(imageFile: File): Promise<void> {
    if (!this.doc) return;

    try {
      const imageDataUrl = await this.fileToDataURL(imageFile);
      
      // Calcular espacio disponible en la página
      const availableSpace = this.pageHeight - this.margin - this.currentY;
      
      // Tamaño de imagen adaptativo basado en el espacio disponible
      let imageHeight = Math.min(80, availableSpace - 10); // Máximo 80mm o espacio disponible
      let imageWidth = imageHeight * 1.4; // Mantener proporción aproximada
      
      // Asegurar que la imagen no sea más ancha que el contenido
      if (imageWidth > this.contentWidth) {
        imageWidth = this.contentWidth;
        imageHeight = imageWidth / 1.4;
      }
      
      // Solo añadir si hay espacio mínimo suficiente (al menos 30mm)
      if (availableSpace >= 35) {
        this.currentY += 5; // Pequeño espacio antes de la imagen
        
        // Centrar horizontalmente
        const imageX = (this.pageWidth - imageWidth) / 2;
        
        // Agregar la imagen con tamaño optimizado
        this.doc.addImage(
          imageDataUrl,
          'JPEG',
          imageX,
          this.currentY,
          imageWidth,
          imageHeight,
          undefined,
          'FAST'
        );
        
        this.currentY += imageHeight;
      }
      // Si no hay espacio suficiente, no agregar la imagen para mantener todo en una página
      
    } catch (error) {
      console.error('Error al agregar imagen:', error);
      // Continuar sin imagen si hay error
    }
  }

  // Convertir archivo a Data URL
  private fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // Obtener texto de lotes
  private getLotsText(fumigation: Fumigation): string {
    if (!fumigation.lots || fumigation.lots.length === 0) {
      return 'Lotes 1A y 1B';
    }
    return fumigation.lots.map(lot => lot.name).join(' y ');
  }

  // Formatear dosis exacto al original
  private formatDose(product: SelectedProduct): string {
    return `${product.dosePerHa} ${product.doseUnit}`;
  }

  // Formatear total exacto al original
  private formatTotal(product: SelectedProduct): string {
    const total = product.totalQuantity || 0;
    const unit = product.unit || 'L';
    
    if (unit === 'ml' || unit === 'cc') {
      if (total >= 1000) {
        return `${(total / 1000).toFixed(2).replace('.', ',')} Lts`;
      }
      return `${total.toFixed(0)} ${unit}`;
    } else if (unit === 'L') {
      return `${total.toFixed(2).replace('.', ',')} Lts`;
    } else if (unit === 'kg') {
      return `${total.toFixed(2).replace('.', ',')} Kg`;
    } else if (unit === 'g') {
      if (total >= 1000) {
        return `${(total / 1000).toFixed(2).replace('.', ',')} Kg`;
      }
      return `${total.toFixed(0)} g`;
    }
    
    return `${total.toFixed(2).replace('.', ',')} ${unit}`;
  }

  // Formatear fecha exacto al original
  private formatDate(date: any): string {
    if (!date) return '13 de marzo 2025';
    
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    return `${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Descargar PDF
  downloadPDF(fumigation: Fumigation, filename: string | null = null): void {
    if (!this.doc) {
      throw new Error('No hay documento PDF generado');
    }
    
    const defaultFilename = `Orden_Fumigacion_${fumigation.orderNumber || 'SIN_NUMERO'}_${new Date().toISOString().split('T')[0]}.pdf`;
    this.doc.save(filename || defaultFilename);
  }

  // Obtener blob del PDF
  getPDFBlob(): Blob {
    if (!this.doc) {
      throw new Error('No hay documento PDF generado');
    }
    return this.doc.output('blob');
  }

  // Obtener data URL del PDF
  getPDFDataURL(): string {
    if (!this.doc) {
      throw new Error('No hay documento PDF generado');
    }
    return this.doc.output('dataurlstring');
  }
}

// Exportar funciones
export const generateFumigationPDF = async (fumigation: Fumigation, products: Product[] = [], mapImage: File | null = null): Promise<FumigationPDFGenerator> => {
  const generator = new FumigationPDFGenerator();
  await generator.generateFumigationOrder(fumigation, products, mapImage);
  return generator;
};

export const downloadFumigationPDF = async (fumigation: Fumigation, products: Product[] = [], mapImage: File | null = null, filename: string | null = null): Promise<void> => {
  const generator = await generateFumigationPDF(fumigation, products, mapImage);
  generator.downloadPDF(fumigation, filename);
};

export default FumigationPDFGenerator;