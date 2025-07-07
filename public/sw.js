// Service Worker for Offline Capabilities
const CACHE_NAME = 'pam-mobile-v1';
const API_CACHE_NAME = 'pam-api-v1';

// Core resources to cache for offline functionality
const CORE_RESOURCES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

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
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle core resources
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then((response) => {
            // Cache successful GET requests
            if (request.method === 'GET' && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
          });
      })
      .catch(() => {
        // Offline fallback
        if (request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

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