const { Client } = require('pg');

class ElectronRailwayService {
  constructor() {
    this.client = null;
    this.config = {
      host: 'ballast.proxy.rlwy.net',
      port: 52263,
      database: 'railway',
      user: 'postgres',
      password: 'ruxIcuiniuQhKaoAzQqSuJyAZPYcqfLB',
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };
  }

  // Conectar a Railway
  async connect() {
    try {
      if (!this.client) {
        this.client = new Client(this.config);
        await this.client.connect();
        console.log('✅ Electron conectado a Railway PostgreSQL');
      }
      return true;
    } catch (error) {
      console.error('❌ Error conectando a Railway desde Electron:', error);
      this.client = null;
      throw error;
    }
  }

  // Desconectar
  async disconnect() {
    try {
      if (this.client) {
        await this.client.end();
        this.client = null;
        console.log('✅ Electron desconectado de Railway');
      }
    } catch (error) {
      console.error('❌ Error desconectando de Railway:', error);
    }
  }

  // Ejecutar consulta con reconexión automática
  async executeQuery(query, params = []) {
    try {
      // Asegurar conexión
      if (!this.client) {
        await this.connect();
      }

      const result = await this.client.query(query, params);
      return result;
    } catch (error) {
      console.error('❌ Error ejecutando query:', error);
      
      // Intentar reconectar una vez si es error de conexión
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        try {
          console.log('🔄 Intentando reconectar...');
          this.client = null;
          await this.connect();
          const result = await this.client.query(query, params);
          return result;
        } catch (retryError) {
          console.error('❌ Error en reintento:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  // Guardar PDF en Railway
  async savePdf(fumigationData, pdfBuffer, hasMapImage = false) {
    let client = null;
    
    try {
      console.log('🔍 === INICIANDO DEBUG RAILWAY ===');
      console.log('🔍 Datos de fumigación RAW:', fumigationData);
      console.log('🔍 Tamaño PDF buffer:', pdfBuffer.length);
      console.log('🔍 Tiene imagen de mapa:', hasMapImage);
      
      // ARREGLAR EL PROCESAMIENTO DE FECHA
      let fumigationDate;
      
      if (fumigationData.date) {
        console.log('🔍 Fecha original:', fumigationData.date);
        console.log('🔍 Tipo de fecha:', typeof fumigationData.date);
        
        // Si es un objeto Firestore Timestamp con seconds
        if (fumigationData.date.seconds) {
          fumigationDate = new Date(fumigationData.date.seconds * 1000);
          console.log('🔍 Fecha desde Firestore seconds:', fumigationDate);
        } 
        // Si es un string de fecha
        else if (typeof fumigationData.date === 'string') {
          fumigationDate = new Date(fumigationData.date);
          console.log('🔍 Fecha desde string:', fumigationDate);
        }
        // Si ya es una instancia de Date
        else if (fumigationData.date instanceof Date) {
          fumigationDate = fumigationData.date;
          console.log('🔍 Fecha ya es Date:', fumigationDate);
        }
        // Si es un timestamp numérico
        else if (typeof fumigationData.date === 'number') {
          fumigationDate = new Date(fumigationData.date);
          console.log('🔍 Fecha desde timestamp:', fumigationDate);
        }
        // Fallback a fecha actual
        else {
          console.warn('⚠️ Formato de fecha desconocido, usando fecha actual');
          fumigationDate = new Date();
        }
      } else {
        console.warn('⚠️ No hay fecha, usando fecha actual');
        fumigationDate = new Date();
      }
      
      // Verificar que la fecha es válida
      if (isNaN(fumigationDate.getTime())) {
        console.error('❌ Fecha inválida, usando fecha actual');
        fumigationDate = new Date();
      }
      
      console.log('🔍 Fecha final procesada:', fumigationDate);
      console.log('🔍 Fecha en formato ISO:', fumigationDate.toISOString());
      
      console.log('🔍 Intentando conectar a Railway...');
      console.log('🔍 Credenciales:', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password ? '***OCULTO***' : 'NO DEFINIDO'
      });

      client = new Client(this.config);
      
      console.log('🔍 Cliente creado, intentando conectar...');
      await client.connect();
      console.log('✅ Conexión establecida exitosamente!');

      // Preparar query con fecha arreglada
      const query = `
        INSERT INTO public.fumigation_pdfs (
          fumigation_id, fumigation_date, field_name, crop, applicator,
          total_surface, surface_unit, pdf_data, pdf_size, has_map_image
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (fumigation_id) 
        DO UPDATE SET
          fumigation_date = EXCLUDED.fumigation_date,
          field_name = EXCLUDED.field_name,
          crop = EXCLUDED.crop,
          applicator = EXCLUDED.applicator,
          total_surface = EXCLUDED.total_surface,
          surface_unit = EXCLUDED.surface_unit,
          pdf_data = EXCLUDED.pdf_data,
          pdf_size = EXCLUDED.pdf_size,
          has_map_image = EXCLUDED.has_map_image,
          updated_at = NOW()
        RETURNING id, created_at, updated_at
      `;

      const values = [
        fumigationData.id,
        fumigationDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
        fumigationData.fieldName || null,
        fumigationData.crop || null,
        fumigationData.applicator || null,
        fumigationData.totalSurface || null,
        fumigationData.surfaceUnit || null,
        pdfBuffer,
        pdfBuffer.length,
        hasMapImage
      ];

      console.log('🔍 Valores para el query:', {
        fumigationId: values[0],
        date: values[1], // Esta debería ser una fecha válida ahora
        fieldName: values[2],
        crop: values[3],
        applicator: values[4],
        totalSurface: values[5],
        surfaceUnit: values[6],
        pdfSize: values[8],
        hasMapImage: values[9]
      });

      console.log('🔍 Ejecutando query en base de datos...');
      const result = await client.query(query, values);
      console.log('✅ Query ejecutado exitosamente!');
      console.log('🔍 Resultado de la base de datos:', result.rows[0]);

      await client.end();
      console.log('🔍 Conexión cerrada');

      console.log('🔍 === DEBUG RAILWAY COMPLETADO EXITOSAMENTE ===');
      
      return {
        success: true,
        id: result.rows[0].id,
        fumigationId: fumigationData.id,
        action: result.rows[0].created_at === result.rows[0].updated_at ? 'created' : 'updated',
        size: pdfBuffer.length
      };

    } catch (error) {
      console.error('🔍 === ERROR EN DEBUG RAILWAY ===');
      console.error('❌ Error completo:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Código de error SQL:', error.code);
      console.error('❌ Detalle del error:', error.detail);
      console.error('❌ Mensaje:', error.message);
      console.error('❌ Constraint violado:', error.constraint);
      console.error('🔍 === FIN ERROR DEBUG ===');

      if (client) {
        try {
          await client.end();
          console.log('🔍 Conexión cerrada después del error');
        } catch (closeError) {
          console.error('❌ Error cerrando conexión:', closeError);
        }
      }
      
      throw new Error(`Error guardando PDF: ${error.message}`);
    }
  }

  // Descargar PDF desde Railway
  async downloadPdf(fumigationId) {
    try {
      console.log('📥 Descargando PDF desde Railway (Electron):', fumigationId);

      const query = `
        SELECT pdf_data, pdf_size, has_map_image, created_at, updated_at,
               field_name, crop, applicator, total_surface, surface_unit
        FROM fumigation_pdfs 
        WHERE fumigation_id = $1
      `;

      const result = await this.executeQuery(query, [fumigationId]);

      if (result.rows.length === 0) {
        throw new Error('PDF no encontrado en Railway');
      }

      const pdfData = result.rows[0];
      
      console.log('✅ PDF descargado exitosamente desde Railway (Electron)');

      return {
        success: true,
        pdfBuffer: pdfData.pdf_data,
        metadata: {
          fumigationId,
          size: pdfData.pdf_size,
          hasMapImage: pdfData.has_map_image,
          createdAt: pdfData.created_at,
          updatedAt: pdfData.updated_at,
          fieldName: pdfData.field_name,
          crop: pdfData.crop,
          applicator: pdfData.applicator,
          totalSurface: pdfData.total_surface,
          surfaceUnit: pdfData.surface_unit
        }
      };

    } catch (error) {
      console.error('❌ Error descargando PDF desde Railway (Electron):', error);
      throw new Error(`Error descargando PDF: ${error.message}`);
    }
  }

  // Verificar si existe PDF
  async pdfExists(fumigationId) {
    try {
      const query = `
        SELECT id, created_at, updated_at, pdf_size, has_map_image
        FROM fumigation_pdfs 
        WHERE fumigation_id = $1
      `;

      const result = await this.executeQuery(query, [fumigationId]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('❌ Error verificando existencia de PDF:', error);
      return null;
    }
  }

  // Obtener metadatos del PDF
  async getPdfMetadata(fumigationId) {
    try {
      const query = `
        SELECT id, fumigation_id, fumigation_date, field_name, crop, applicator,
               total_surface, surface_unit, pdf_size, has_map_image, 
               created_at, updated_at
        FROM fumigation_pdfs 
        WHERE fumigation_id = $1
      `;

      const result = await this.executeQuery(query, [fumigationId]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('❌ Error obteniendo metadatos:', error);
      return null;
    }
  }

  // Test de conexión
  async testConnection() {
    try {
      const result = await this.executeQuery('SELECT NOW() as current_time');
      console.log('✅ Test de conexión Railway exitoso desde Electron:', result.rows[0].current_time);
      return true;
    } catch (error) {
      console.error('❌ Test de conexión falló desde Electron:', error.message);
      return false;
    }
  }

  // Eliminar PDF
  async deletePdf(fumigationId) {
    try {
      console.log('🗑️ Eliminando PDF de Railway (Electron):', fumigationId);

      const query = `DELETE FROM fumigation_pdfs WHERE fumigation_id = $1 RETURNING id`;
      const result = await this.executeQuery(query, [fumigationId]);

      if (result.rows.length === 0) {
        throw new Error('PDF no encontrado para eliminar');
      }

      console.log('✅ PDF eliminado exitosamente de Railway (Electron)');
      return { success: true, id: result.rows[0].id };

    } catch (error) {
      console.error('❌ Error eliminando PDF:', error);
      throw new Error(`Error eliminando PDF: ${error.message}`);
    }
  }
}

// Exportar instancia singleton
const railwayService = new ElectronRailwayService();

module.exports = railwayService;