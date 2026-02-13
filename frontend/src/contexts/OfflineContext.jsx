/**
 * SkiFlow Rental Offline Context
 * 
 * Contexto de React para gestionar el estado offline de la aplicación.
 * Proporciona:
 * - Estado de conexión (online/offline)
 * - Estado de sincronización
 * - Funciones para operaciones offline-first
 * - Indicadores de operaciones pendientes
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { syncService } from '@/lib/syncService';
import { db, getPendingSyncOperations, getLocalDbStats } from '@/lib/offlineDb';
import { toast } from 'sonner';

const OfflineContext = createContext(null);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline debe usarse dentro de OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  // Estados
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dbStats, setDbStats] = useState(null);

  // Inicialización
  useEffect(() => {
    const init = async () => {
      // Escuchar cambios de conexión
      const unsubConnection = syncService.onConnectionChange((online) => {
        setIsOnline(online);
        if (online) {
          toast.success('Conexión restaurada', {
            description: 'Sincronizando datos pendientes...'
          });
        } else {
          toast.warning('Sin conexión', {
            description: 'Los cambios se guardarán localmente'
          });
        }
      });

      // Escuchar estado de sincronización
      const unsubSync = syncService.onSyncStatusChange((status) => {
        if (status.type === 'syncing') {
          setIsSyncing(true);
          setSyncProgress(status);
        } else if (status.type === 'complete') {
          setIsSyncing(false);
          setSyncProgress(null);
          if (status.synced > 0) {
            toast.success(`${status.synced} operaciones sincronizadas`);
          }
          updatePendingCount();
        } else if (status.type === 'error') {
          setIsSyncing(false);
          toast.error('Error de sincronización', {
            description: status.error
          });
        } else if (status.type === 'downloading') {
          setIsSyncing(true);
          setSyncProgress(status);
        }
      });

      // Escuchar mensajes del Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_REQUIRED') {
            syncService.syncPendingOperations();
          }
        });
      }

      // Actualizar estado inicial
      await updatePendingCount();
      await updateDbStats();
      setIsInitialized(true);

      return () => {
        unsubConnection();
        unsubSync();
      };
    };

    init();
  }, []);

  // Actualizar contador de operaciones pendientes
  const updatePendingCount = useCallback(async () => {
    const pending = await getPendingSyncOperations();
    setPendingCount(pending.length);
    
    const stats = await syncService.getStats();
    setLastSyncTime(stats.lastSync);
  }, []);

  // Actualizar estadísticas de la BD local
  const updateDbStats = useCallback(async () => {
    const stats = await getLocalDbStats();
    setDbStats(stats);
  }, []);

  // Descargar datos iniciales
  const downloadInitialData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[OfflineContext] No hay token para descargar datos');
      return false;
    }

    const result = await syncService.downloadAllData(token);
    if (result) {
      await updateDbStats();
      toast.success('Datos sincronizados', {
        description: 'La app está lista para uso offline'
      });
    }
    return result;
  }, [updateDbStats]);

  // Sincronizar operaciones pendientes manualmente
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.warning('Sin conexión', {
        description: 'No se puede sincronizar sin internet'
      });
      return { synced: 0, failed: 0 };
    }

    const result = await syncService.syncPendingOperations();
    await updatePendingCount();
    return result;
  }, [isOnline, updatePendingCount]);

  // Crear alquiler (con soporte offline)
  const createRental = useCallback(async (rentalData) => {
    const token = localStorage.getItem('token');
    const result = await syncService.createRental(rentalData, token);
    
    if (result.offline) {
      toast.info('Alquiler guardado offline', {
        description: 'Se sincronizará cuando vuelva la conexión'
      });
    }
    
    await updatePendingCount();
    return result;
  }, [updatePendingCount]);

  // Procesar devolución (con soporte offline)
  const processReturn = useCallback(async (rentalId, returnData) => {
    const token = localStorage.getItem('token');
    const result = await syncService.processReturn(rentalId, returnData, token);
    
    if (result.offline) {
      toast.info('Devolución guardada offline', {
        description: 'Se sincronizará cuando vuelva la conexión'
      });
    }
    
    await updatePendingCount();
    return result;
  }, [updatePendingCount]);

  // Guardar cliente (con soporte offline)
  const saveCustomer = useCallback(async (customerData, isNew = true) => {
    const token = localStorage.getItem('token');
    const result = await syncService.saveCustomer(customerData, token, isNew);
    
    if (result.offline) {
      toast.info('Cliente guardado offline', {
        description: 'Se sincronizará cuando vuelva la conexión'
      });
    }
    
    await updatePendingCount();
    return result;
  }, [updatePendingCount]);

  // Lecturas locales rápidas
  const getCustomers = useCallback((search) => syncService.getCustomers(search), []);
  const getItems = useCallback((filters) => syncService.getItems(filters), []);
  const getRentals = useCallback((filters) => syncService.getRentals(filters), []);
  const getTariffs = useCallback(() => syncService.getTariffs(), []);
  const getPacks = useCallback(() => syncService.getPacks(), []);
  const getSources = useCallback(() => syncService.getSources(), []);
  const getItemTypes = useCallback(() => syncService.getItemTypes(), []);

  const value = {
    // Estado
    isOnline,
    isSyncing,
    syncProgress,
    pendingCount,
    lastSyncTime,
    isInitialized,
    dbStats,

    // Acciones
    downloadInitialData,
    syncNow,
    updatePendingCount,
    updateDbStats,

    // Operaciones CRUD offline-first
    createRental,
    processReturn,
    saveCustomer,

    // Lecturas locales
    getCustomers,
    getItems,
    getRentals,
    getTariffs,
    getPacks,
    getSources,
    getItemTypes
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
