// This is a basic service worker for PWA installability.
// It doesn't implement any caching strategies for now.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Faking install.', event);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating.', event);
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // This basic service worker doesn't intercept any fetch requests.
  // It just lets the browser handle them as it normally would.
  // This is sufficient for the "Add to Home Screen" feature.
  // console.log('Service Worker: Fetching.', event);
});
