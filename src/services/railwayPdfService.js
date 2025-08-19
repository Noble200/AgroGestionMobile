// src/services/railwayPdfService.js - Servicio para manejar PDFs en Railway (Frontend)
// Usa IPC para comunicarse con el proceso principal de Electron

class RailwayPdfService {
  
  // Obtener el API de Electron para IPC
  static getElectronAPI() {
    if (window.electronAPI) {
      return window.electronAPI;
    }
    
    // Fallback si no está disponible
    console.warn('⚠️ Electron API no disponible, usando fallback');
    return {
      railwayTestConnection: async () => ({ success: false, error: 'Electron API no disponible' }),
      railwaySavePdf: async () => ({ success: false, error: 'Electron API no disponible' }),
      railwayDownloadPdf: async () => ({ success: false, error: 'Electron API no disponible' }),
      railwayPdfExists: async () => ({ success: false, error: 'Electron API no disponible' }),
      railwayGetPdfMetadata: async () => ({ success: false, error: 'Electron API no disponible' }),
      railwayDeletePdf: async () => ({ success: false, error: 'Electron API no disponible' })
    };
  }

  // Guardar PDF en Railway
  static async savePdf(fumigationData, pdfBuffer, hasMapImage = false) {
    try {
      console.log('📤 Guardando PDF en Railway (Frontend)...', {
        fumigationId: fumigationData.id,
        pdfSize: pdfBuffer.length,
        hasMapImage
      });

      const electronAPI = this.getElectronAPI();
      
      // Convertir buffer a array para envío IPC
      const pdfArray = Array.from(pdfBuffer);
      
      const result = await electronAPI.railwaySavePdf(fumigationData, pdfArray, hasMapImage);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log('✅ PDF guardado exitosamente en Railway (Frontend):', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ Error guardando PDF en Railway (Frontend):', error);
      throw new Error(`Error guardando PDF: ${error.message}`);
    }
  }

  // Obtener PDF desde Railway
  static async downloadPdf(fumigationId) {
    try {
      console.log('📥 Descargando PDF desde Railway (Frontend):', fumigationId);

      const electronAPI = this.getElectronAPI();
      const result = await electronAPI.railwayDownloadPdf(fumigationId);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // ✅ NO usar Buffer.from() - directamente usar el array
      const pdfArray = result.data.pdfBuffer; // Ya es un array del backend
      
      console.log('✅ PDF descargado exitosamente (Frontend):', {
        fumigationId,
        size: result.data.metadata.size,
        arrayLength: pdfArray.length
      });

      return {
        success: true,
        pdfBuffer: pdfArray, // ← Devolver array, no Buffer
        metadata: result.data.metadata
      };

    } catch (error) {
      console.error('❌ Error descargando PDF desde Railway (Frontend):', error);
      throw new Error(`Error descargando PDF: ${error.message}`);
    }
  }

  // Verificar si existe PDF para una fumigación
  static async pdfExists(fumigationId) {
    try {
      const electronAPI = this.getElectronAPI();
      const result = await electronAPI.railwayPdfExists(fumigationId);
      
      if (!result.success) {
        console.error('Error verificando PDF:', result.error);
        return null;
      }
      
      return result.data;

    } catch (error) {
      console.error('❌ Error verificando existencia de PDF (Frontend):', error);
      return null;
    }
  }

  // Obtener metadatos del PDF sin descargar el archivo
  static async getPdfMetadata(fumigationId) {
    try {
      const electronAPI = this.getElectronAPI();
      const result = await electronAPI.railwayGetPdfMetadata(fumigationId);
      
      if (!result.success) {
        console.error('Error obteniendo metadatos:', result.error);
        return null;
      }
      
      return result.data;

    } catch (error) {
      console.error('❌ Error obteniendo metadatos (Frontend):', error);
      return null;
    }
  }

  // Eliminar PDF de Railway
  static async deletePdf(fumigationId) {
    try {
      console.log('🗑️ Eliminando PDF de Railway (Frontend):', fumigationId);

      const electronAPI = this.getElectronAPI();
      const result = await electronAPI.railwayDeletePdf(fumigationId);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('✅ PDF eliminado exitosamente de Railway (Frontend)');
      return result.data;

    } catch (error) {
      console.error('❌ Error eliminando PDF (Frontend):', error);
      throw new Error(`Error eliminando PDF: ${error.message}`);
    }
  }

  // Listar todos los PDFs (para administración)
  static async listAllPdfs(limit = 50, offset = 0) {
    try {
      // Por ahora no implementamos esta función via IPC
      // Se puede agregar más tarde si es necesaria
      console.warn('⚠️ listAllPdfs no implementado en versión IPC');
      return {
        success: false,
        error: 'Función no implementada en versión IPC'
      };
    } catch (error) {
      console.error('❌ Error listando PDFs (Frontend):', error);
      throw new Error(`Error listando PDFs: ${error.message}`);
    }
  }

  // Verificar conexión a Railway
  static async testConnection() {
    try {
      const electronAPI = this.getElectronAPI();
      const result = await electronAPI.railwayTestConnection();
      
      if (!result.success) {
        console.error('❌ Test de conexión falló:', result.error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error en test de conexión (Frontend):', error);
      return false;
    }
  }
}

module.exports = RailwayPdfService;