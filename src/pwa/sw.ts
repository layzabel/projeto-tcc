const sw = self as unknown as ServiceWorkerGlobalScope;

const VERSION: string = '__SW_VERSION__';
const PRECACHE: readonly string[] = ['__SW_PRECACHE__'];
const CACHE = 'tcc-' + VERSION;

sw.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([...PRECACHE]))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('tcc-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => sw.clients.claim()),
  );
});

async function fromCacheOrNetwork(request: Request): Promise<Response> {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) {
    return cached;
  }
  try {
    return await fetch(request);
  } catch (error) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) {
        return fallback;
      }
    }
    throw error;
  }
}

sw.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== sw.location.origin) {
    return;
  }
  event.respondWith(fromCacheOrNetwork(request));
});
