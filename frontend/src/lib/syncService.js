/**
 * AlpineFlow Sync Service
 * 
 * Servicio de sincronización bidireccional entre la base de datos local (IndexedDB)
 * y el servidor remoto. Maneja:
 * - Descarga inicial de datos
 * - Sincronización en segundo plano
 * - Cola de operaciones offline
 * - Resolución de conflictos
 * - Gestión de IDs temporales
 */
import { 
  db, 
  SYNC_STATUS, 
  SYNC_OPERATIONS, 
  ENTITIES,
  generateTempId,
  isTempId,
  addToSyncQueue,
  getPendingSyncOperations,
  updateSyncQueueStatus,
  removeSyncQueueItem,
  saveTempIdMapping,
  getRealId,
  setLastSyncTime,
  getLastSyncTime
} from './offlineDb';

const API = process.env.REACT_APP_BACKEND_URL;

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncListeners = [];
    this.connectionListeners = [];
    
    // Escuchar cambios de conexión
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  // ========== GESTIÓN DE CONEXIÓN ==========
  
  handleOnline() {
    console.log('[SyncService] Conexión restaurada');
    this.isOnline = true;
    this.notifyConnectionChange(true);
    
    // Iniciar sincronización automática
    this.syncPendingOperations();
  }

  handleOffline() {
    console.log('[SyncService] Conexión perdida - Modo offline activado');
    this.isOnline = false;
    this.notifyConnectionChange(false);
  }

  onConnectionChange(callback) {
    this.connectionListeners.push(callback);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
    };
  }

  notifyConnectionChange(isOnline) {
    this.connectionListeners.forEach(cb => cb(isOnline));
  }

  onSyncStatusChange(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  notifySyncStatus(status) {
    this.syncListeners.forEach(cb => cb(status));
  }

  // ========== DESCARGA INICIAL DE DATOS ==========

  async downloadAllData(token) {
    if (!this.isOnline) {
      console.log('[SyncService] Offline - usando datos locales');
      return false;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      this.notifySyncStatus({ type: 'downloading', progress: 0 });
      
      // Descargar en paralelo para mayor velocidad
      const [customers, items, rentals, tariffs, packs, sources, itemTypes] = await Promise.all([
        this.fetchWithRetry(`${API}/api/customers`, headers),
        this.fetchWithRetry(`${API}/api/items`, headers),
        this.fetchWithRetry(`${API}/api/rentals?include_all=true`, headers),
        this.fetchWithRetry(`${API}/api/tariffs`, headers),
        this.fetchWithRetry(`${API}/api/packs`, headers),
        this.fetchWithRetry(`${API}/api/sources`, headers),
        this.fetchWithRetry(`${API}/api/item-types`, headers)
      ]);

      this.notifySyncStatus({ type: 'downloading', progress: 50 });

      // Guardar en IndexedDB usando transacciones bulk
      await db.transaction('rw', 
        db.customers, db.items, db.rentals, db.tariffs, db.packs, db.sources, db.itemTypes,
        async () => {
          // Limpiar datos antiguos
          await db.customers.clear();
          await db.items.clear();
          await db.rentals.clear();
          await db.tariffs.clear();
          await db.packs.clear();
          await db.sources.clear();
          await db.itemTypes.clear();
          
          // Insertar nuevos datos
          if (customers?.length) await db.customers.bulkPut(customers);
          if (items?.length) await db.items.bulkPut(items);
          if (rentals?.length) await db.rentals.bulkPut(rentals);
          if (tariffs?.length) await db.tariffs.bulkPut(tariffs);
          if (packs?.length) await db.packs.bulkPut(packs);
          if (sources?.length) await db.sources.bulkPut(sources);
          if (itemTypes?.length) await db.itemTypes.bulkPut(itemTypes);
        }
      );

      // Actualizar timestamps de sincronización
      const now = new Date().toISOString();
      await Promise.all([
        setLastSyncTime('customers', now),
        setLastSyncTime('items', now),
        setLastSyncTime('rentals', now),
        setLastSyncTime('tariffs', now),
        setLastSyncTime('packs', now),
        setLastSyncTime('sources', now),
        setLastSyncTime('itemTypes', now)
      ]);

      this.notifySyncStatus({ type: 'complete', progress: 100 });
      console.log('[SyncService] Descarga completa:', {
        customers: customers?.length || 0,
        items: items?.length || 0,
        rentals: rentals?.length || 0
      });

      return true;
    } catch (error) {
      console.error('[SyncService] Error en descarga:', error);
      this.notifySyncStatus({ type: 'error', error: error.message });
      return false;
    }
  }

  async fetchWithRetry(url, headers, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  // ========== OPERACIONES CRUD CON SOPORTE OFFLINE ==========

  /**
   * Crear un alquiler (online u offline)
   */
  async createRental(rentalData, token) {
    const tempId = generateTempId('rental');
    const localRental = {
      ...rentalData,
      id: this.isOnline ? rentalData.id : tempId,
      _isTemp: !this.isOnline,
      _createdOffline: !this.isOnline,
      created_at: new Date().toISOString()
    };

    if (this.isOnline) {
      try {
        // Enviar al servidor
        const response = await fetch(`${API}/api/rentals`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rentalData)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const serverRental = await response.json();
        
        // Guardar en local con ID real del servidor
        await db.rentals.put(serverRental);
        
        // Actualizar estado de items a "rented"
        for (const item of serverRental.items || []) {
          await db.items.update(item.id || item.barcode, { status: 'rented' });
        }

        return { success: true, data: serverRental, offline: false };
      } catch (error) {
        console.error('[SyncService] Error creando alquiler online, guardando offline:', error);
        // Fallback a modo offline
        return this.createRentalOffline(localRental, tempId);
      }
    } else {
      return this.createRentalOffline(localRental, tempId);
    }
  }

  async createRentalOffline(localRental, tempId) {
    // Guardar en IndexedDB
    await db.rentals.put(localRental);
    
    // Actualizar estado de items localmente
    for (const item of localRental.items || []) {
      await db.items.update(item.id || item.barcode, { status: 'rented' });
    }
    
    // Añadir a cola de sincronización
    await addToSyncQueue(SYNC_OPERATIONS.CREATE, ENTITIES.RENTAL, localRental, tempId);
    
    console.log('[SyncService] Alquiler guardado offline:', tempId);
    return { success: true, data: localRental, offline: true, tempId };
  }

  /**
   * Procesar devolución (online u offline)
   */
  async processReturn(rentalId, returnData, token) {
    const realRentalId = await getRealId(rentalId);
    
    if (this.isOnline && !isTempId(realRentalId)) {
      try {
        const response = await fetch(`${API}/api/rentals/${realRentalId}/return`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(returnData)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        
        // Actualizar local
        await db.rentals.update(realRentalId, { status: 'returned', actual_return_date: new Date().toISOString() });
        
        // Actualizar items a "available"
        for (const item of returnData.items || []) {
          await db.items.update(item.id || item.barcode, { status: 'available' });
        }

        return { success: true, data: result, offline: false };
      } catch (error) {
        console.error('[SyncService] Error procesando devolución online:', error);
        return this.processReturnOffline(rentalId, returnData);
      }
    } else {
      return this.processReturnOffline(rentalId, returnData);
    }
  }

  async processReturnOffline(rentalId, returnData) {
    const tempId = generateTempId('return');
    
    // Actualizar rental local
    await db.rentals.update(rentalId, { 
      status: 'returned', 
      actual_return_date: new Date().toISOString(),
      _pendingSync: true
    });
    
    // Actualizar items localmente
    for (const item of returnData.items || []) {
      await db.items.update(item.id || item.barcode, { status: 'available' });
    }
    
    // Añadir a cola
    await addToSyncQueue(SYNC_OPERATIONS.CREATE, ENTITIES.RETURN, {
      rental_id: rentalId,
      ...returnData
    }, tempId);
    
    console.log('[SyncService] Devolución guardada offline:', tempId);
    return { success: true, offline: true, tempId };
  }

  /**
   * Crear/actualizar cliente (online u offline)
   */
  async saveCustomer(customerData, token, isNew = true) {
    const tempId = isNew ? generateTempId('customer') : null;
    const localCustomer = {
      ...customerData,
      id: customerData.id || tempId,
      _isTemp: isNew && !this.isOnline,
      updated_at: new Date().toISOString()
    };

    if (this.isOnline) {
      try {
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? `${API}/api/customers` : `${API}/api/customers/${customerData.id}`;
        
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(customerData)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const serverCustomer = await response.json();
        await db.customers.put(serverCustomer);
        
        return { success: true, data: serverCustomer, offline: false };
      } catch (error) {
        console.error('[SyncService] Error guardando cliente online:', error);
        return this.saveCustomerOffline(localCustomer, tempId, isNew);
      }
    } else {
      return this.saveCustomerOffline(localCustomer, tempId, isNew);
    }
  }

  async saveCustomerOffline(localCustomer, tempId, isNew) {
    await db.customers.put(localCustomer);
    
    await addToSyncQueue(
      isNew ? SYNC_OPERATIONS.CREATE : SYNC_OPERATIONS.UPDATE,
      ENTITIES.CUSTOMER,
      localCustomer,
      tempId
    );
    
    return { success: true, data: localCustomer, offline: true, tempId };
  }

  // ========== SINCRONIZACIÓN DE COLA PENDIENTE ==========

  async syncPendingOperations() {
    if (this.isSyncing || !this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notifySyncStatus({ type: 'syncing', progress: 0 });

    const pending = await getPendingSyncOperations();
    let synced = 0;
    let failed = 0;

    console.log(`[SyncService] Sincronizando ${pending.length} operaciones pendientes`);

    const token = localStorage.getItem('token');
    if (!token) {
      this.isSyncing = false;
      return { synced: 0, failed: pending.length };
    }

    for (let i = 0; i < pending.length; i++) {
      const operation = pending[i];
      
      try {
        await updateSyncQueueStatus(operation.id, SYNC_STATUS.SYNCING);
        
        const data = JSON.parse(operation.data);
        let result;

        switch (operation.entity) {
          case ENTITIES.RENTAL:
            result = await this.syncRental(operation, data, token);
            break;
          case ENTITIES.RETURN:
            result = await this.syncReturn(operation, data, token);
            break;
          case ENTITIES.CUSTOMER:
            result = await this.syncCustomer(operation, data, token);
            break;
          default:
            console.warn('[SyncService] Entidad no soportada:', operation.entity);
            result = { success: false };
        }

        if (result.success) {
          await removeSyncQueueItem(operation.id);
          synced++;
        } else {
          await updateSyncQueueStatus(operation.id, SYNC_STATUS.FAILED, result.error);
          failed++;
        }

      } catch (error) {
        console.error('[SyncService] Error sincronizando operación:', error);
        await updateSyncQueueStatus(operation.id, SYNC_STATUS.FAILED, error.message);
        failed++;
      }

      this.notifySyncStatus({ 
        type: 'syncing', 
        progress: Math.round(((i + 1) / pending.length) * 100),
        synced,
        failed,
        total: pending.length
      });
    }

    this.isSyncing = false;
    this.notifySyncStatus({ type: 'complete', synced, failed });
    
    console.log(`[SyncService] Sincronización completada: ${synced} OK, ${failed} fallidos`);
    return { synced, failed };
  }

  async syncRental(operation, data, token) {
    // Limpiar campos temporales antes de enviar
    const cleanData = { ...data };
    delete cleanData._isTemp;
    delete cleanData._createdOffline;
    delete cleanData._pendingSync;
    
    // Si el ID es temporal, no enviarlo (el servidor generará uno nuevo)
    if (isTempId(cleanData.id)) {
      delete cleanData.id;
    }

    const response = await fetch(`${API}/api/rentals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cleanData)
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const serverRental = await response.json();
    
    // Guardar mapeo de ID temporal a real
    if (operation.tempId) {
      await saveTempIdMapping(operation.tempId, serverRental.id, ENTITIES.RENTAL);
      
      // Actualizar el registro local con el ID real
      await db.rentals.delete(operation.tempId);
      await db.rentals.put(serverRental);
    }

    return { success: true, data: serverRental };
  }

  async syncReturn(operation, data, token) {
    const realRentalId = await getRealId(data.rental_id);
    
    if (isTempId(realRentalId)) {
      // El rental padre aún no se ha sincronizado
      return { success: false, error: 'Rental padre pendiente de sincronización' };
    }

    const response = await fetch(`${API}/api/rentals/${realRentalId}/return`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  }

  async syncCustomer(operation, data, token) {
    const cleanData = { ...data };
    delete cleanData._isTemp;
    
    const isNew = operation.operation === SYNC_OPERATIONS.CREATE;
    
    if (isNew && isTempId(cleanData.id)) {
      delete cleanData.id;
    }

    const method = isNew ? 'POST' : 'PUT';
    const url = isNew ? `${API}/api/customers` : `${API}/api/customers/${cleanData.id}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cleanData)
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const serverCustomer = await response.json();
    
    if (operation.tempId) {
      await saveTempIdMapping(operation.tempId, serverCustomer.id, ENTITIES.CUSTOMER);
      await db.customers.delete(operation.tempId);
      await db.customers.put(serverCustomer);
    }

    return { success: true, data: serverCustomer };
  }

  // ========== LECTURAS LOCALES (VELOCIDAD INSTANTÁNEA) ==========

  async getCustomers(search = '') {
    if (search) {
      return await db.customers
        .filter(c => 
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.dni?.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search)
        )
        .limit(50)
        .toArray();
    }
    return await db.customers.limit(100).toArray();
  }

  async getItems(filters = {}) {
    let query = db.items;
    
    if (filters.status) {
      query = query.where('status').equals(filters.status);
    }
    
    return await query.limit(500).toArray();
  }

  async getRentals(filters = {}) {
    let query = db.rentals;
    
    if (filters.status) {
      query = query.where('status').anyOf(Array.isArray(filters.status) ? filters.status : [filters.status]);
    }
    
    return await query.reverse().sortBy('created_at');
  }

  async getTariffs() {
    return await db.tariffs.toArray();
  }

  async getPacks() {
    return await db.packs.toArray();
  }

  async getSources() {
    return await db.sources.toArray();
  }

  async getItemTypes() {
    return await db.itemTypes.toArray();
  }

  // ========== UTILIDADES ==========

  async getStats() {
    const pending = await getPendingSyncOperations();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations: pending.length,
      lastSync: await getLastSyncTime('rentals')
    };
  }
}

// Exportar instancia singleton
export const syncService = new SyncService();
export default syncService;
