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

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    try {
      await cache.delete(request)
      await cache.put(request, cached.clone())
    } catch {
      // 缓存维护失败时仍返回已经读到的图片。
    }
    return cached
  }

  const response = await fetch(request)
  if (response.ok) {
    try {
      await cache.put(request, response.clone())
      await trimCache(cache, maxEntries)
    } catch {
      // 浏览器配额不足时退回普通网络响应，不阻塞图片显示。
    }
  }
  return response
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || request.destination !== 'image') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/assets/')) return

  if (/\/thumb-[^/]+\.webp$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, THUMBNAIL_CACHE, 80))
    return
  }

  if (/\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ORIGINAL_CACHE, 3))
  }
})
