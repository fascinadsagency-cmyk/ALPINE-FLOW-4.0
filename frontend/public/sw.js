/**
 * AlpineFlow Service Worker
 * 
 * ESTRATEGIA: NETWORK FIRST para todos los archivos principales
 * Esto garantiza que siempre se descargue la última versión del servidor.
 * Solo usa caché como fallback cuando no hay conexión.
 * 
 * VERSIÓN: Se incrementa automáticamente para forzar actualización
 */

const SW_VERSION = 'v3-network-first-' + Date.now();
const CACHE_NAME = 'alpineflow-' + SW_VERSION;
const API_CACHE = 'alpineflow-api-' + SW_VERSION;

// Archivos estáticos mínimos para offline
const OFFLINE_FALLBACK = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Rutas de API que se pueden cachear para uso offline
const CACHEABLE_API_ROUTES = [
  '/api/tariffs',
  '/api/packs',
  '/api/sources',
  '/api/item-types'
];

// ============================================================
// INSTALACIÓN - Forzar activación inmediata
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando nueva versión:', SW_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-cacheando fallbacks offline');
        return cache.addAll(OFFLINE_FALLBACK);
      })
      .then(() => {
        console.log('[SW] Forzando skipWaiting()');
        return self.skipWaiting();
      })
  );
});

// ============================================================
// ACTIVACIÓN - Limpiar cachés antiguas y tomar control
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando nueva versión:', SW_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Eliminar TODAS las cachés que no sean la versión actual
            if (!cacheName.includes(SW_VERSION)) {
              console.log('[SW] Eliminando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Tomando control con clients.claim()');
        return self.clients.claim();
      })
      .then(() => {
        // Notificar a los clientes que hay una nueva versión
        return notifyClientsOfUpdate();
      })
  );
});

// ============================================================
// FETCH - Estrategia NETWORK FIRST para todo
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones a otros dominios (excepto API)
  if (url.origin !== location.origin && !url.hostname.includes('emergentagent.com')) {
    return;
  }

  // NO interceptar peticiones POST, PUT, DELETE
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar peticiones a hot-reload de desarrollo
  if (url.pathname.includes('hot-update') || url.pathname.includes('sockjs-node')) {
    return;
  }

  // ESTRATEGIA ÚNICA: Network First para TODO
  event.respondWith(networkFirst(request));
});

// ============================================================
// NETWORK FIRST - Siempre intenta la red primero
// ============================================================
async function networkFirst(request) {
  const url = new URL(request.url);
  const cacheName = url.pathname.startsWith('/api') ? API_CACHE : CACHE_NAME;
  
  try {
    // SIEMPRE intentar la red primero
    const networkResponse = await fetch(request, {
      // Añadir timestamp para evitar caché del navegador
      cache: 'no-store'
    });
    
    // Si la respuesta es exitosa, cachearla para offline
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      
      // Solo cachear ciertas rutas de API
      if (url.pathname.startsWith('/api')) {
        const shouldCache = CACHEABLE_API_ROUTES.some(route => 
          url.pathname.includes(route)
        );
        if (shouldCache) {
          cache.put(request, networkResponse.clone());
        }
      } else {
        // Cachear archivos estáticos para fallback offline
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
    
  } catch (error) {
    // La red falló - intentar usar caché como fallback
    console.log('[SW] Red no disponible, usando caché para:', request.url);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Para navegación, devolver index.html
    if (request.mode === 'navigate') {
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }
    
    // Para API sin caché, devolver error offline
    if (url.pathname.startsWith('/api')) {
      return new Response(
        JSON.stringify({ 
          error: 'offline', 
          message: 'Sin conexión y sin datos en caché' 
        }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// ============================================================
// COMUNICACIÓN CON CLIENTES
// ============================================================

// Notificar a todos los clientes que hay una actualización
async function notifyClientsOfUpdate() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ 
      type: 'SW_UPDATED',
      version: SW_VERSION
    });
  });
}

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Mensaje recibido:', event.data);
  
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Limpiando todas las cachés');
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    }).then(() => {
      event.source.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: SW_VERSION });
  }
});

// ============================================================
// BACKGROUND SYNC
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-operations') {
    console.log('[SW] Ejecutando sincronización en segundo plano');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUIRED' });
        });
      })
    );
  }
});
