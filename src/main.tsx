// src/main.tsx - MAIN DEFINITIVO CON TODOS LOS CONTEXT PROVIDERS
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Importar todos los Context Providers necesarios
// Ajusta las extensiones según tu proyecto (.tsx o .js)
import { AuthProvider } from './contexts/AuthContext';
import { StockProvider } from './contexts/StockContext';
import { UsersProvider } from './contexts/UsersContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { FumigationProvider } from './contexts/FumigationContext';
import { TransferProvider } from './contexts/TransferContext';
import { HarvestProvider } from './contexts/HarvestContext';
import { PurchaseProvider } from './contexts/PurchaseContext';
import { ExpenseProvider } from './contexts/ExpenseContext';
import { ReportsProvider } from './contexts/ReportsContext';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    {/* 
      ORDEN IMPORTANTE: AuthProvider debe ir PRIMERO porque los demás dependen de él
      Los demás pueden ir en cualquier orden
    */}
    <AuthProvider>
      <UsersProvider>
        <ActivityProvider>
          <StockProvider>
            <FumigationProvider>
              <TransferProvider>
                <HarvestProvider>
                  <PurchaseProvider>
                    <ExpenseProvider>
                      <ReportsProvider>
                        <App />
                      </ReportsProvider>
                    </ExpenseProvider>
                  </PurchaseProvider>
                </HarvestProvider>
              </TransferProvider>
            </FumigationProvider>
          </StockProvider>
        </ActivityProvider>
      </UsersProvider>
    </AuthProvider>
  </React.StrictMode>
);