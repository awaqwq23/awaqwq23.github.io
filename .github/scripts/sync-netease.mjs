import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputPath = resolve('public/materials/netease-music.json')
const API_ROOT = 'https://music.163.com'
const HEADERS = {
  Accept: 'application/json',
  Referer: 'https://music.163.com/',
  'User-Agent': 'Mozilla/5.0 (compatible; awaqwq233.github.io deployment sync)',
}

const wait = milliseconds => new Promise(resolveWait => setTimeout(resolveWait, milliseconds))

async function fetchJson(url, label) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(25_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      if (payload.code !== 200) throw new Error(`API code ${payload.code ?? 'unknown'}`)
      return payload
    } catch (error) {
      lastError = error
      if (attempt < 3) await wait(attempt * 1200)
    }
  }
  throw new Error(`${label} failed: ${lastError?.message || lastError}`)
}

function playlistIdOf(category) {
  const configured = category.playlistIds?.[0]
  if (configured) return String(configured)
  return String(category.playlistUrl || '').match(/[?&]id=(\d+)/)?.[1] || ''
}

function songFromTrack(track) {
  const artists = track.ar || track.artists || []
  const album = track.al || track.album || {}
  const id = String(track.id)
  return {
    id,
    name: track.name || '未命名歌曲',
    artist: artists.map(artist => artist.name).filter(Boolean).join(' / ') || '未知歌手',
    album: album.name || '未知专辑',
    cover: String(album.picUrl || '').replace(/^http:/, 'https:'),
    url: `https://music.163.com/song?id=${id}`,
  }
}

async function fetchPlaylist(playlistId) {
  const url = new URL('/api/v6/playlist/detail', API_ROOT)
  url.search = new URLSearchParams({ id: playlistId, n: '100000', s: '8' })
  const payload = await fetchJson(url, `playlist ${playlistId}`)
  if (!payload.playlist) throw new Error(`playlist ${playlistId} was not returned`)
  return payload.playlist
}

async function fetchTracks(ids) {
  const tracks = new Map()
  for (let index = 0; index < ids.length; index += 200) {
    const batch = ids.slice(index, index + 200)
    const url = new URL('/api/song/detail/', API_ROOT)
    url.searchParams.set('ids', JSON.stringify(batch))
    try {
      const payload = await fetchJson(url, `song batch ${index / 200 + 1}`)
      for (const track of payload.songs || []) tracks.set(String(track.id), songFromTrack(track))
    } catch (error) {
      console.warn(error.message)
    }
    if (index + 200 < ids.length) await wait(250)
  }
  return tracks
}

async function main() {
  const previous = JSON.parse(await readFile(outputPath, 'utf8'))
  const categories = previous.categories || []
  if (!categories.length) throw new Error('No NetEase playlist configuration is available')

  const refreshedPlaylists = new Map()
  for (const category of categories) {
    const playlistId = playlistIdOf(category)
    if (!playlistId) continue
    try {
      refreshedPlaylists.set(playlistId, await fetchPlaylist(playlistId))
    } catch (error) {
      console.warn(error.message)
    }
    await wait(200)
  }

  if (!refreshedPlaylists.size) {
    console.warn(`NetEase refresh unavailable; keeping ${categories.length} cached playlists from ${previous.syncedAt || 'an unknown time'}`)
    return
  }

  const requestedIds = [...new Set([...refreshedPlaylists.values()]
    .flatMap(playlist => (playlist.trackIds || []).map(track => String(track.id || track))))]
  const freshTracks = await fetchTracks(requestedIds)
  const cachedTracks = new Map(categories.flatMap(category => category.items || []).map(track => [String(track.id), track]))

  const refreshedCategories = categories.map(category => {
    const playlistId = playlistIdOf(category)
    const playlist = refreshedPlaylists.get(playlistId)
    if (!playlist) return category
    const trackIds = (playlist.trackIds || []).map(track => String(track.id || track))
    const items = trackIds.map(id => freshTracks.get(id) || cachedTracks.get(id)).filter(Boolean)
    return {
      ...category,
      name: playlist.name || category.name,
      playlistIds: [playlistId],
      playlistUrl: `https://music.163.com/playlist?id=${playlistId}`,
      total: Number(playlist.trackCount) || trackIds.length,
      cached: items.length,
      items,
    }
  })

  const result = {
    ...previous,
    syncedAt: new Date().toISOString(),
    source: '网易云音乐公开歌单与歌曲详情（部署时刷新）',
    categories: refreshedCategories,
  }
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`Refreshed ${refreshedPlaylists.size}/${categories.length} NetEase playlists and ${freshTracks.size}/${requestedIds.length} tracks`)
}

await main().catch(async error => {
  const cached = await readFile(outputPath, 'utf8').then(JSON.parse).catch(() => null)
  if (cached?.categories?.length) {
    console.warn(`NetEase refresh failed; keeping cached data: ${error.message}`)
    return
  }
  console.error(error)
  process.exitCode = 1
})
