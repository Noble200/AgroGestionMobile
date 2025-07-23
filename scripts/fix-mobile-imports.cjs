// scripts/fix-mobile-imports.mjs
import fs from 'fs';
import path from 'path';

console.log('🔧 === CORRIGIENDO IMPORTS PARA VERSIÓN MÓVIL ===\n');

// Función para procesar archivos JS
function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Archivo no encontrado: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changes = 0;

    // 1. Remover imports de CSS que no existen en móvil
    const cssImports = content.match(/import\s+['"][^'"]*\.css['"];?\s*\n?/g);
    if (cssImports) {
      cssImports.forEach(cssImport => {
        content = content.replace(cssImport, '');
        changes++;
      });
    }

    // 2. Corregir imports de componentes que pueden haber cambiado de ubicación
    const componentImports = [
      {
        from: /import.*from\s+['"]\.\.\/components\/ui\/.*['"];?/g,
        to: '' // Remover por ahora, los recrearemos
      },
      {
        from: /import.*from\s+['"]\.\.\/styles\/.*['"];?/g,
        to: '' // Remover imports de estilos
      }
    ];

    componentImports.forEach(fix => {
      const matches = content.match(fix.from);
      if (matches) {
        content = content.replace(fix.from, fix.to);
        changes += matches.length;
      }
    });

    // 3. Asegurar que imports relativos sean correctos
    content = content.replace(
      /from\s+['"]\.\.\/api\//g,
      "from '../api/"
    );
    content = content.replace(
      /from\s+['"]\.\.\/contexts\//g,
      "from '../contexts/"
    );
    content = content.replace(
      /from\s+['"]\.\.\/utils\//g,
      "from '../utils/"
    );

    // 4. Limpiar líneas vacías excesivas
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} - ${changes} cambios realizados`);
      return true;
    } else {
      console.log(`ℹ️  ${filePath} - Sin cambios necesarios`);
      return false;
    }

  } catch (error) {
    console.log(`❌ Error procesando ${filePath}: ${error.message}`);
    return false;
  }
}

// Archivos a procesar
const filesToFix = [
  // Servicios API
  'src/api/firebase.js',
  'src/api/usersService.js',
  'src/api/stockService.js',
  
  // Contextos
  'src/contexts/AuthContext.js',
  'src/contexts/UsersContext.js',
  'src/contexts/ActivityContext.js',
  'src/contexts/StockContext.js',
  'src/contexts/HarvestContext.js',
  'src/contexts/FumigationContext.js',
  'src/contexts/TransferContext.js',
  'src/contexts/PurchaseContext.js',
  'src/contexts/ExpenseContext.js',
  'src/contexts/ReportsContext.js',
  
  // Controllers (si existen)
  'src/controllers/ProductController.js',
  'src/controllers/UserController.js',
  'src/controllers/AuthController.js',
  
  // Utils
  'src/utils/validation.js',
  'src/utils/dateUtils.js',
  'src/utils/formatters.js'
];

console.log('📁 Procesando archivos copiados de la versión web:\n');

let totalProcessed = 0;
let totalChanged = 0;

filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    totalProcessed++;
    if (fixImportsInFile(file)) {
      totalChanged++;
    }
  }
});

console.log(`\n📊 Resumen:`);
console.log(`   📄 Archivos procesados: ${totalProcessed}`);
console.log(`   🔧 Archivos modificados: ${totalChanged}`);

// Crear archivo temporal para CSS móvil
console.log('\n🎨 Creando archivos CSS temporales para móvil...');

const tempCssContent = `/* Estilos temporales para móvil */
.mobile-container {
  padding: 1rem;
}

.mobile-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
}

.mobile-button {
  width: 100%;
  padding: 12px;
  border-radius: 6px;
  border: none;
  background: #3880ff;
  color: white;
  font-size: 16px;
}
`;

// Crear directorio de estilos si no existe
if (!fs.existsSync('src/styles')) {
  fs.mkdirSync('src/styles', { recursive: true });
}

fs.writeFileSync('src/styles/mobile.css', tempCssContent, 'utf8');
console.log('✅ Archivo CSS temporal creado: src/styles/mobile.css');

console.log('\n🎉 Corrección de imports completada!');
console.log('\n📝 Próximos pasos:');
console.log('   1. Ejecutar: npm start');
console.log('   2. Verificar que no hay errores de compilación');
console.log('   3. Crear las primeras páginas móviles');