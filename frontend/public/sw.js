/**
 * AlpineFlow Service Worker
 * 
 * Cachea archivos estáticos (HTML, CSS, JS, iconos) para permitir
 * que la aplicación cargue sin conexión a internet.
 */

const CACHE_NAME = 'alpineflow-v2-no-category';
const STATIC_CACHE = 'alpineflow-static-v2-no-category';
const API_CACHE = 'alpineflow-api-v2-no-category';

// Archivos estáticos a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
  // Los archivos JS y CSS con hash se cachearán en runtime
];

// Rutas de API que se pueden cachear para uso offline
const CACHEABLE_API_ROUTES = [
  '/api/tariffs',
  '/api/packs',
  '/api/sources',
  '/api/item-types'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cacheando archivos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Activar inmediatamente sin esperar
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activado');
  
  event.waitUntil(
    // Limpiar caches antiguas
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE && cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar control de todas las páginas inmediatamente
      return self.clients.claim();
    })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones a otros dominios
  if (url.origin !== location.origin && !url.pathname.startsWith('/api')) {
    return;
  }

  // NO interceptar peticiones POST, PUT, DELETE (dejar que vayan directamente a la red)
  if (request.method !== 'GET') {
    return;
  }

  // Estrategia para archivos estáticos: Cache First
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Estrategia para API: Network First con fallback a cache
  if (url.pathname.startsWith('/api')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Para navegación (HTML): Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
    return;
  }
});

// Determinar si es un archivo estático
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname === '/manifest.json'
  );
}

// Estrategia Cache First: buscar en cache, si no existe ir a red
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Error en cache first:', error);
    // Devolver página offline si es HTML
    if (request.mode === 'navigate') {
      return cache.match('/index.html');
    }
    throw error;
  }
}

// Estrategia Network First: intentar red, si falla usar cache
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    
    // Cachear respuestas exitosas de GET
    if (response.ok && request.method === 'GET') {
      const url = new URL(request.url);
      
      // Solo cachear ciertas rutas de API
      if (url.pathname.startsWith('/api')) {
        const shouldCache = CACHEABLE_API_ROUTES.some(route => 
          url.pathname.includes(route)
        );
        if (shouldCache) {
          cache.put(request, response.clone());
        }
      } else {
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Red no disponible, buscando en cache:', request.url);
    
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Para navegación, devolver index.html
    if (request.mode === 'navigate') {
      return cache.match('/index.html');
    }
    
    // Para API sin cache, devolver error offline
    if (request.url.includes('/api')) {
      return new Response(
        JSON.stringify({ 
          error: 'offline', 
          message: 'No hay conexión a internet y no hay datos en cache' 
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

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});

// Sincronización en segundo plano (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-operations') {
    console.log('[SW] Ejecutando sincronización en segundo plano');
    event.waitUntil(notifyClientsToSync());
  }
});

// Notificar a los clientes que deben sincronizar
async function notifyClientsToSync() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUIRED' });
  });
}
