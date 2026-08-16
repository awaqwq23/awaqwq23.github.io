const THUMBNAIL_CACHE = 'gallery-thumbnails-v1'
const ORIGINAL_CACHE = 'gallery-originals-v1'
const ACTIVE_CACHES = new Set([THUMBNAIL_CACHE, ORIGINAL_CACHE])

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name.startsWith('gallery-') && !ACTIVE_CACHES.has(name)).map(name => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map(key => cache.delete(key)))
}

async function touchCache(cache, request, response) {
  await cache.delete(request)
  await cache.put(request, response)
}

async function storeInCache(cache, request, response, maxEntries) {
  await cache.put(request, response)
  await trimCache(cache, maxEntries)
}

async function cacheFirst(request, cacheName, maxEntries, scheduleBackgroundTask) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    scheduleBackgroundTask(touchCache(cache, request, cached.clone()))
    return cached
  }

  const response = await fetch(request)
  if (response.ok) {
    scheduleBackgroundTask(storeInCache(cache, request, response.clone(), maxEntries))
  }
  return response
}

function respondWithBoundedCache(event, cacheName, maxEntries) {
  const backgroundTasks = []
  const responsePromise = cacheFirst(
    event.request,
    cacheName,
    maxEntries,
    task => backgroundTasks.push(task),
  )

  event.respondWith(responsePromise)
  event.waitUntil(
    responsePromise
      .then(() => Promise.allSettled(backgroundTasks))
      .catch(() => undefined),
  )
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || request.destination !== 'image') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/assets/')) return

  if (/\/thumb-[^/]+\.webp$/i.test(url.pathname)) {
    respondWithBoundedCache(event, THUMBNAIL_CACHE, 80)
    return
  }

  if (/\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname)) {
    respondWithBoundedCache(event, ORIGINAL_CACHE, 3)
  }
})
