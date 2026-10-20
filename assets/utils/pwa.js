/**
 * PWA Utility - Enhanced PWA features for K-mart Market Tunisia
 * Offline support, background sync, push notifications, caching strategies
 */

const CACHE_NAME = 'kmart-v23';
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  API: 'network-first',
  IMAGES: 'cache-first',
  FONTS: 'cache-first'
};

const OFFLINE_PAGE = '/offline.html';
const MAX_IMAGE_CACHE_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_API_CACHE_AGE = 5 * 60 * 1000; // 5 minutes

let deferredInstallPrompt = null;
let isOnline = navigator.onLine;
let syncQueue = [];

/**
 * Initialize PWA features
 */
async function initPWA() {
  registerServiceWorker();
  setupInstallPrompt();
  setupOnlineOfflineDetection();
  setupBackgroundSync();
  setupPeriodicSync();
  await precacheCriticalResources();
}

/**
 * Register service worker with enhanced caching
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('SW registered:', registration.scope);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateAvailable();
            }
          });
        });
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    });
  }
}

/**
 * Setup install prompt handling
 */
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallNudge();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallNudge();
    hideInstallModal();
    pwaToast('K-mart Market a été installé !');
    // Track install event
    trackEvent('pwa_install');
  });
}

/**
 * Show install nudge
 */
function showInstallNudge() {
  const nudge = document.getElementById('installNudge');
  if (nudge && !localStorage.getItem('kmartInstallNudgeDismissed')) {
    // Check if already in standalone mode
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => {
        nudge.style.display = 'flex';
        nudge.classList.remove('dismissed');
      }, 4500);
    }
  }
}

/**
 * Hide install nudge
 */
function hideInstallNudge() {
  const nudge = document.getElementById('installNudge');
  if (nudge) {
    nudge.style.display = 'none';
  }
}

/**
 * Show install modal
 */
function showInstallModal() {
  const modal = document.getElementById('installModal');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('overlay')?.classList.add('show');
    window.KMa11y.saveFocus();
    window.KMa11y.trapFocus(modal);
  }
}

/**
 * Hide install modal
 */
function hideInstallModal() {
  const modal = document.getElementById('installModal');
  if (modal) {
    modal.classList.remove('open');
    document.getElementById('overlay')?.classList.remove('show');
    window.KMa11y.restoreFocus();
  }
}

/**
 * Trigger install prompt
 */
async function promptInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hideInstallModal();
    if (outcome === 'accepted') {
      trackEvent('pwa_install_accepted');
    } else {
      trackEvent('pwa_install_dismissed');
    }
    return outcome;
  }
  return null;
}

/**
 * Get platform-specific install instructions
 */
function getInstallInstructions() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'Sur iPhone/iPad : touchez Partager dans Safari, puis « Sur l\'écran d\'accueil ». iOS ne propose pas le même bouton d\'installation que Chrome.';
  } else if (/Android/i.test(ua)) {
    return 'Sur Android : ouvrez le menu ⋮ de Chrome, puis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».';
  } else if (/Windows/i.test(ua)) {
    return 'Sur Windows : dans Edge ou Chrome, utilisez l\'icône Installer dans la barre d\'adresse, ou le menu du navigateur → Installer cette application.';
  }
  return 'Ouvrez le menu de votre navigateur et choisissez « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ». Sur Windows, cherchez l\'icône d\'installation dans la barre d\'adresse.';
}

/**
 * Setup online/offline detection
 */
function setupOnlineOfflineDetection() {
  window.addEventListener('online', () => {
    isOnline = true;
    document.body.classList.remove('offline');
    pwaToast('Connexion rétablie');
    processSyncQueue();
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    document.body.classList.add('offline');
    pwaToast('Mode hors ligne - Certaines fonctionnalités sont limitées');
  });

  // Initial state
  if (!isOnline) {
    document.body.classList.add('offline');
  }
}

/**
 * Setup background sync for failed requests
 */
function setupBackgroundSync() {
  // Listen for sync events from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'SYNC_COMPLETE') {
      pwaToast('Données synchronisées');
    }
  });

  // Queue failed requests for retry
  window.addEventListener('fetch', (event) => {
    // This is handled in service worker
  });
}

/**
 * Add request to sync queue
 * @param {Object} requestData - Request data to queue
 */
function queueForSync(requestData) {
  syncQueue.push({
    ...requestData,
    timestamp: Date.now(),
    retries: 0
  });
  saveSyncQueue();
}

/**
 * Process sync queue when online
 */
async function processSyncQueue() {
  if (!isOnline || syncQueue.length === 0) return;

  const queue = [...syncQueue];
  syncQueue = [];

  for (const request of queue) {
    try {
      await fetch(request.url, request.options);
      trackEvent('sync_success', { url: request.url });
    } catch (error) {
      request.retries++;
      if (request.retries < 3) {
        syncQueue.push(request);
      } else {
        trackEvent('sync_failed', { url: request.url, error: error.message });
      }
    }
  }

  saveSyncQueue();
}

/**
 * Save sync queue to localStorage
 */
function saveSyncQueue() {
  localStorage.setItem('kmartSyncQueue', JSON.stringify(syncQueue));
}

/**
 * Load sync queue from localStorage
 */
function loadSyncQueue() {
  try {
    const stored = localStorage.getItem('kmartSyncQueue');
    if (stored) {
      syncQueue = JSON.parse(stored);
    }
  } catch (e) {
    syncQueue = [];
  }
}

/**
 * Setup periodic background sync (if supported)
 */
async function setupPeriodicSync() {
  if ('periodicSync' in navigator.serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state === 'granted') {
        await registration.periodicSync.register('update-content', {
          minInterval: 24 * 60 * 60 * 1000 // 24 hours
        });
      }
    } catch (error) {
      console.log('Periodic sync not available:', error);
    }
  }
}

/**
 * Precache critical resources
 */
async function precacheCriticalResources() {
  if (!('caches' in window)) return;

  const criticalResources = [
    '/',
    '/index.html',
    '/assets/styles.css',
    '/assets/app.js',
    '/manifest.webmanifest',
    '/assets/kmart-brand-identity.png',
    '/assets/app-icon-192.png',
    '/assets/app-icon-512.png'
  ];

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(criticalResources);
    console.log('Critical resources precached');
  } catch (error) {
    console.error('Precaching failed:', error);
  }
}

/**
 * Cache API response with strategy
 * @param {Request} request - Fetch request
 * @param {Response} response - Fetch response
 * @param {string} strategy - Cache strategy
 */
async function cacheResponse(request, response, strategy = 'network-first') {
  if (!('caches' in window) || !response.ok) return response;

  const cache = await caches.open(CACHE_NAME);
  const clonedResponse = response.clone();

  switch (strategy) {
    case 'cache-first':
      // Already handled by service worker
      break;
    case 'network-first':
      // Cache successful network responses
      await cache.put(request, clonedResponse);
      break;
    case 'stale-while-revalidate':
      // Return cached immediately, update in background
      await cache.put(request, clonedResponse);
      break;
  }

  return response;
}

/**
 * Get cached response
 * @param {Request} request - Fetch request
 * @returns {Promise<Response|null>}
 */
async function getCachedResponse(request) {
  if (!('caches' in window)) return null;
  const cache = await caches.open(CACHE_NAME);
  return await cache.match(request);
}

/**
 * Clear old cache entries
 */
async function cleanupCache() {
  if (!('caches' in window)) return;

  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const now = Date.now();

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get('date');
      const cachedTime = dateHeader ? new Date(dateHeader).getTime() : 0;
      const age = now - cachedTime;

      // Determine max age based on resource type
      let maxAge = MAX_API_CACHE_AGE;
      if (request.url.includes('/assets/') || request.url.includes('.png') || request.url.includes('.jpg')) {
        maxAge = MAX_IMAGE_CACHE_AGE;
      }

      if (age > maxAge) {
        await cache.delete(request);
      }
    }
  }
}

/**
 * Show update available notification
 */
function showUpdateAvailable() {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = 'Nouvelle version disponible. Rechargez pour mettre à jour.';
    toast.classList.add('show');
    toast.onclick = () => window.location.reload();
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 */
function pwaToast(message) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

/**
 * Track analytics event (demo)
 * @param {string} eventName - Event name
 * @param {Object} [params] - Event parameters
 */
function trackEvent(eventName, params = {}) {
  console.log(`[Analytics] ${eventName}`, params);
  // In production, send to analytics endpoint
}

/**
 * Check if app is running in standalone mode
 * @returns {boolean}
 */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Request notification permission
 * @returns {Promise<NotificationPermission>}
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return 'denied';
}

/**
 * Subscribe to push notifications (demo)
 * @returns {Promise<PushSubscription|null>}
 */
async function subscribeToPush() {
  if (!('PushManager' in window)) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY') // Replace with actual VAPID key
    });
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get cache storage estimate
 * @returns {Promise<{usage: number, quota: number}>}
 */
async function getCacheEstimate() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return await navigator.storage.estimate();
  }
  return { usage: 0, quota: 0 };
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  if (!('caches' in window)) return;
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}


window.KMPWA = { initPWA, showInstallModal, hideInstallModal, promptInstall, getInstallInstructions, queueForSync, cacheResponse, getCachedResponse, cleanupCache, isStandalone, requestNotificationPermission, subscribeToPush, getCacheEstimate, clearAllCaches, CACHE_NAME };
