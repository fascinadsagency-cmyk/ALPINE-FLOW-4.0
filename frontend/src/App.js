import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { OfflineProvider, useOffline } from "@/contexts/OfflineContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NewRental from "@/pages/NewRental";
import Returns from "@/pages/Returns";
import Customers from "@/pages/Customers";
import Inventory from "@/pages/Inventory";
import Tariffs from "@/pages/Tariffs";
import Reports from "@/pages/Reports";
import Maintenance from "@/pages/Maintenance";
import CashRegister from "@/pages/CashRegister";
import Integrations from "@/pages/Integrations";
import ActiveRentals from "@/pages/ActiveRentals";
import Providers from "@/pages/Providers";
import Settings from "@/pages/Settings";
import Layout from "@/components/Layout";

// ============================================================
// SERVICE WORKER REGISTRATION CON AUTO-RELOAD
// ============================================================
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('[App] Service Worker no soportado');
    return;
  }

  try {
    // Registrar el Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Nunca usar caché del navegador para sw.js
    });
    
    console.log('[App] Service Worker registrado:', registration.scope);
    
    // Forzar verificación de actualizaciones
    registration.update();
    
    // Verificar actualizaciones periódicamente (cada 30 segundos en desarrollo)
    setInterval(() => {
      registration.update();
    }, 30000);

    // Escuchar cuando hay un nuevo Service Worker instalado
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('[App] Nueva versión del SW detectada, estado:', newWorker?.state);
      
      if (!newWorker) return;
      
      newWorker.addEventListener('statechange', () => {
        console.log('[App] SW nuevo estado:', newWorker.state);
        
        // Cuando el nuevo SW está instalado y hay un SW controlando
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[App] Nueva versión lista, recargando...');
          
          // Notificar al usuario y recargar
          toast.info('Nueva versión disponible. Actualizando...', {
            duration: 2000
          });
          
          // Forzar al nuevo SW a tomar control
          newWorker.postMessage('skipWaiting');
          
          // Recargar la página después de un breve delay
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      });
    });

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[App] Mensaje del SW:', event.data);
      
      if (event.data.type === 'SW_UPDATED') {
        console.log('[App] SW actualizado a versión:', event.data.version);
        // El SW ya se activó, recargar para usar la nueva versión
        window.location.reload();
      }
      
      if (event.data.type === 'CACHE_CLEARED') {
        console.log('[App] Caché limpiada');
        toast.success('Caché limpiada');
      }
    });

    // Si ya hay un SW esperando, activarlo
    if (registration.waiting) {
      console.log('[App] SW esperando, activando...');
      registration.waiting.postMessage('skipWaiting');
    }

  } catch (error) {
    console.error('[App] Error registrando Service Worker:', error);
  }
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500">Cargando...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Componente que descarga datos iniciales después del login
const DataInitializer = ({ children }) => {
  const { user } = useAuth();
  const { downloadInitialData, isInitialized } = useOffline();
  
  useEffect(() => {
    if (user && isInitialized) {
      // Descargar datos en segundo plano después del login
      downloadInitialData();
    }
  }, [user, isInitialized, downloadInitialData]);
  
  return children;
};

function AppRoutes() {
  return (
    <DataInitializer>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="nuevo-alquiler" element={<NewRental />} />
          <Route path="alquileres-activos" element={<ActiveRentals />} />
          <Route path="devoluciones" element={<Returns />} />
          <Route path="clientes" element={<Customers />} />
          <Route path="proveedores" element={<Providers />} />
          <Route path="inventario" element={<Inventory />} />
          <Route path="tarifas" element={<Tariffs />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="mantenimiento" element={<Maintenance />} />
          <Route path="caja" element={<CashRegister />} />
          <Route path="integraciones" element={<Integrations />} />
          <Route path="configuracion" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DataInitializer>
  );
}

function App() {
  // Registrar Service Worker al montar
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <OfflineProvider>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </OfflineProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
