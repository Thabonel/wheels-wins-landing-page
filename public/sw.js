// Service Worker for Offline Capabilities with Optimized Bundle Strategy
const CACHE_NAME = 'pam-mobile-v2-optimized';
const API_CACHE_NAME = 'pam-api-v2';
const DYNAMIC_CACHE_NAME = 'pam-dynamic-v2';

// Essential resources to cache immediately (small core bundle)
const CORE_RESOURCES = [
  '/',
  '/manifest.json'
  // Note: Dynamic imports are now handled by the fetch event
  // This approach works better with lazy loading and code splitting
];

// Patterns for different types of assets with different caching strategies
const CACHE_STRATEGIES = {
  // Core vendor chunks - cache aggressively (rarely change)
  VENDOR_CHUNKS: /\/assets\/.*-vendor-.*\.js$/,
  
  // Page chunks - cache with shorter TTL (change more often)
  PAGE_CHUNKS: /\/assets\/.*-page-.*\.js$/,
  
  // Component chunks - cache dynamically as needed
  COMPONENT_CHUNKS: /\/assets\/.*-(lazy|chunk)-.*\.js$/,
  
  // CSS files - cache aggressively
  CSS_FILES: /\/assets\/.*\.css$/,
  
  // Large dependencies (Mapbox, Charts, Calendar) - cache on demand
  HEAVY_DEPS: /\/assets\/.*(mapbox|chart|calendar|fullcalendar).*\.js$/
};

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  /\/api\/pam\/.*$/,
  /\/api\/health$/,
  /\/api\/user\/profile$/
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const validCaches = [CACHE_NAME, API_CACHE_NAME, DYNAMIC_CACHE_NAME];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCaches.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker v2 activated with optimized caching');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache Supabase authentication requests - they must always hit the network
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/auth/')) {
    // Let auth requests bypass service worker completely
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle different asset types with appropriate caching strategies
  event.respondWith(handleAssetRequest(request, url));
});

async function handleAssetRequest(request, url) {
  const isAsset = url.pathname.startsWith('/assets/');
  
  if (!isAsset) {
    // Handle HTML pages - always try network first for fresh content
    try {
      const response = await fetch(request);
      if (response.ok) {
        // Cache the page for offline use
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      // Offline fallback
      const cachedResponse = await caches.match(request);
      return cachedResponse || caches.match('/');
    }
  }

  // Handle JavaScript and CSS assets with smart caching
  const assetPath = url.pathname;
  
  // Check cache first for all assets
  const cachedResponse = await caches.match(request);
  
  // Determine caching strategy based on asset type
  let cacheName = DYNAMIC_CACHE_NAME;
  let shouldCacheAggressive = false;
  
  if (CACHE_STRATEGIES.VENDOR_CHUNKS.test(assetPath)) {
    cacheName = CACHE_NAME; // Long-term cache for vendor chunks
    shouldCacheAggressive = true;
  } else if (CACHE_STRATEGIES.CSS_FILES.test(assetPath)) {
    cacheName = CACHE_NAME; // CSS files cache aggressively  
    shouldCacheAggressive = true;
  } else if (CACHE_STRATEGIES.HEAVY_DEPS.test(assetPath)) {
    cacheName = DYNAMIC_CACHE_NAME; // Large deps cached on demand
  }
  
  // For aggressive caching (vendor/CSS), use cache-first strategy
  if (shouldCacheAggressive && cachedResponse) {
    return cachedResponse;
  }
  
  // For other assets, try network first, fallback to cache
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      
      // Log for debugging
      console.log(`Cached asset (${cacheName}):`, assetPath);
    }
    
    return response;
  } catch (error) {
    // Network failed, use cached version if available
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));

  // For GET requests, try cache first
  if (request.method === 'GET' && isCacheable) {
    try {
      const cachedResponse = await caches.match(request);
      
      // If we have a cached response and we're offline, use it
      if (cachedResponse && !navigator.onLine) {
        return cachedResponse;
      }

      // Try network first, fallback to cache
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Cache successful responses
        const responseClone = networkResponse.clone();
        const cache = await caches.open(API_CACHE_NAME);
        await cache.put(request, responseClone);
        
        return networkResponse;
      }
      
      // Network failed, use cache if available
      return cachedResponse || networkResponse;
      
    } catch (error) {
      // Network error, try cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }

  // For non-cacheable requests, just fetch
  return fetch(request);
}

// Background sync for queued requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      processQueuedRequests()
    );
  }
});

async function processQueuedRequests() {
  try {
    // Get queued requests from IndexedDB or localStorage
    const queuedRequests = await getQueuedRequests();
    
    for (const request of queuedRequests) {
      try {
        await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });
        
        // Remove from queue on success
        await removeFromQueue(request.id);
        
        // Notify clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              requestId: request.id
            });
          });
        });
        
      } catch (error) {
        console.error('Failed to sync request:', request.id, error);
      }
    }
  } catch (error) {
    console.error('Failed to process queued requests:', error);
  }
}

// Helper functions for queue management
async function getQueuedRequests() {
  // In a real implementation, use IndexedDB
  return [];
}

async function removeFromQueue(requestId) {
  // In a real implementation, remove from IndexedDB
  console.log('Removing request from queue:', requestId);
}

// Push notifications for background updates
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'pam-notification',
        data: data.url
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});