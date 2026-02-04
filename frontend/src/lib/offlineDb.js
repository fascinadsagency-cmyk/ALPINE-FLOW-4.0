/**
 * AlpineFlow Offline Database (Dexie.js)
 * 
 * Base de datos local IndexedDB para funcionalidad offline-first.
 * Replica las tablas esenciales del servidor y mantiene una cola de sincronización.
 */
import Dexie from 'dexie';

// Crear instancia de la base de datos
export const db = new Dexie('AlpineFlowDB');

// Definir esquema de la base de datos
db.version(1).stores({
  // ========== TABLAS DE DATOS (Réplica del servidor) ==========
  customers: 'id, dni, name, phone, source_id, created_at, [name+dni]',
  items: 'id, barcode, internal_code, item_type, status, category, [status+item_type]',
  rentals: 'id, customer_id, status, created_at, start_date, end_date, [status+customer_id]',
  tariffs: 'id, item_type, category',
  packs: 'id, name, category',
  sources: 'id, name',
  itemTypes: 'id, name, category',
  
  // ========== TABLAS DE SINCRONIZACIÓN ==========
  // Cola de operaciones pendientes de sincronizar
  syncQueue: '++id, operation, entity, entityId, tempId, status, createdAt, attempts',
  
  // Metadatos de sincronización
  syncMeta: 'key, value, updatedAt',
  
  // IDs temporales mapeados a IDs reales
  tempIdMappings: 'tempId, realId, entity, createdAt'
});

// ========== CONSTANTES ==========
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CONFLICT: 'conflict'
};

export const SYNC_OPERATIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

export const ENTITIES = {
  RENTAL: 'rental',
  CUSTOMER: 'customer',
  ITEM: 'item',
  CASH_MOVEMENT: 'cash_movement',
  RETURN: 'return'
};

// ========== FUNCIONES HELPER ==========

/**
 * Genera un ID temporal para operaciones offline
 */
export function generateTempId(prefix = 'temp') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Verifica si un ID es temporal
 */
export function isTempId(id) {
  return id && typeof id === 'string' && id.startsWith('temp_');
}

/**
 * Obtiene el timestamp de la última sincronización de una entidad
 */
export async function getLastSyncTime(entity) {
  const meta = await db.syncMeta.get(`lastSync_${entity}`);
  return meta?.value || null;
}

/**
 * Actualiza el timestamp de la última sincronización
 */
export async function setLastSyncTime(entity, timestamp = new Date().toISOString()) {
  await db.syncMeta.put({
    key: `lastSync_${entity}`,
    value: timestamp,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Añade una operación a la cola de sincronización
 */
export async function addToSyncQueue(operation, entity, data, tempId = null) {
  const queueItem = {
    operation,
    entity,
    entityId: data.id || tempId,
    tempId: tempId,
    data: JSON.stringify(data),
    status: SYNC_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    attempts: 0
  };
  
  return await db.syncQueue.add(queueItem);
}

/**
 * Obtiene todas las operaciones pendientes de sincronizar
 */
export async function getPendingSyncOperations() {
  return await db.syncQueue
    .where('status')
    .anyOf([SYNC_STATUS.PENDING, SYNC_STATUS.FAILED])
    .toArray();
}

/**
 * Actualiza el estado de una operación en la cola
 */
export async function updateSyncQueueStatus(id, status, error = null) {
  const updates = { 
    status,
    lastAttempt: new Date().toISOString()
  };
  
  if (error) {
    updates.lastError = error;
  }
  
  if (status === SYNC_STATUS.FAILED) {
    await db.syncQueue.update(id, {
      ...updates,
      attempts: db.syncQueue.get(id).then(item => (item?.attempts || 0) + 1)
    });
  } else {
    await db.syncQueue.update(id, updates);
  }
}

/**
 * Elimina una operación de la cola (tras sincronización exitosa)
 */
export async function removeSyncQueueItem(id) {
  await db.syncQueue.delete(id);
}

/**
 * Guarda el mapeo de ID temporal a ID real
 */
export async function saveTempIdMapping(tempId, realId, entity) {
  await db.tempIdMappings.put({
    tempId,
    realId,
    entity,
    createdAt: new Date().toISOString()
  });
}

/**
 * Obtiene el ID real correspondiente a un ID temporal
 */
export async function getRealId(tempId) {
  const mapping = await db.tempIdMappings.get(tempId);
  return mapping?.realId || tempId;
}

/**
 * Limpia la base de datos local (útil para logout)
 */
export async function clearLocalDatabase() {
  await db.customers.clear();
  await db.items.clear();
  await db.rentals.clear();
  await db.tariffs.clear();
  await db.packs.clear();
  await db.sources.clear();
  await db.itemTypes.clear();
  await db.syncMeta.clear();
  await db.tempIdMappings.clear();
  // NO limpiar syncQueue para preservar operaciones pendientes
  console.log('[OfflineDB] Base de datos local limpiada');
}

/**
 * Obtiene estadísticas de la base de datos local
 */
export async function getLocalDbStats() {
  const stats = {
    customers: await db.customers.count(),
    items: await db.items.count(),
    rentals: await db.rentals.count(),
    tariffs: await db.tariffs.count(),
    packs: await db.packs.count(),
    sources: await db.sources.count(),
    itemTypes: await db.itemTypes.count(),
    pendingSync: await db.syncQueue.where('status').equals(SYNC_STATUS.PENDING).count(),
    failedSync: await db.syncQueue.where('status').equals(SYNC_STATUS.FAILED).count()
  };
  
  return stats;
}

export default db;
