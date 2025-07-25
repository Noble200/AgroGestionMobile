@echo off
echo 🌱 === INSTALANDO DEPENDENCIAS AGROGESTION MOBILE ===
echo.

echo 📦 Limpiando instalacion anterior...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo ✅ Limpieza completada

echo.
echo 📦 Instalando dependencias base...
call npm install

echo.
echo 📦 Instalando dependencias React...
call npm install react@^18.2.0 react-dom@^18.2.0 react-scripts@5.0.1

echo.
echo 📦 Instalando dependencias Ionic...
call npm install @ionic/react@^8.6.5 @ionic/react-router@^8.6.5

echo.
echo 📦 Instalando dependencias de routing...
call npm install react-router@^5.3.4 react-router-dom@^5.3.4

echo.
echo 📦 Instalando Capacitor...
call npm install @capacitor/core@^7.4.2 @capacitor/cli@^7.4.2 @capacitor/android@^7.4.2

echo.
echo 📦 Instalando iconos...
call npm install ionicons@^7.4.0

echo.
echo 📦 Instalando TypeScript...
call npm install --save-dev typescript @types/react @types/react-dom @types/node

echo.
echo 🔧 Verificando instalacion...
call npm list --depth=0

echo.
echo ✅ Instalacion completada!
echo.
echo 📋 Comandos disponibles:
echo   ionic serve          - Servir en navegador
echo   npm start           - Servir con React
echo   npx cap sync        - Sincronizar con Capacitor
echo   npx cap open android - Abrir Android Studio
echo.
pause