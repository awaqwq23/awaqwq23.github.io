import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const apiKey = process.env.STEAM_API_KEY
const steamId = process.env.STEAM_ID || '76561198825902593'
const outputPath = resolve('public/materials/steam-library.json')
const metadataOnly = process.argv.includes('--metadata-only')
const metadataLimit = Number(process.argv.find(argument => argument.startsWith('--metadata-limit='))?.split('=')[1]) || Infinity

if (!apiKey && !metadataOnly) throw new Error('Missing STEAM_API_KEY')

async function steamRequest(interfaceName, method, version, parameters = {}) {
  const url = new URL(`https://api.steampowered.com/${interfaceName}/${method}/${version}/`)
  url.search = new URLSearchParams({ key: apiKey, format: 'json', ...parameters })
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Steam API ${method} failed with ${response.status}`)
  return response.json()
}

const previous = await readFile(outputPath, 'utf8').then(JSON.parse).catch(() => null)
const previousGames = new Map((previous?.games || []).map(game => [Number(game.appid), game]))

const wait = milliseconds => new Promise(resolveWait => setTimeout(resolveWait, milliseconds))

async function fetchStoreInfo(appid, attempt = 1) {
  try {
    const url = new URL('https://store.steampowered.com/api/appdetails')
    url.search = new URLSearchParams({ appids: String(appid), filters: 'basic,categories,genres', l: 'english', cc: 'US' })
    const response = await fetch(url, {
      headers: { 'User-Agent': 'awaqwq233.github.io Steam library sync' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`Store API failed with ${response.status}`)
    const result = await response.json()
    const data = result[String(appid)]?.data
    if (!data) return null
    return {
      type: data.type || null,
      isFree: Boolean(data.is_free),
      categoryIds: (data.categories || []).map(category => category.id),
      genreIds: (data.genres || []).map(genre => String(genre.id)),
    }
  } catch (error) {
    if (attempt >= 3) {
      console.warn(`Store metadata unavailable for ${appid}: ${error.message}`)
      return null
    }
    await wait(500 * attempt)
    return fetchStoreInfo(appid, attempt + 1)
  }
}

async function fetchMissingStoreInfo(games, concurrency = 6) {
  const results = new Map()
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, games.length) }, async () => {
    while (cursor < games.length) {
      const game = games[cursor]
      cursor += 1
      const storeInfo = await fetchStoreInfo(game.appid)
      if (storeInfo) results.set(Number(game.appid), storeInfo)
      await wait(150)
    }
  })
  await Promise.all(workers)
  return results
}

if (metadataOnly) {
  if (!previous?.games?.length) throw new Error('Steam library data is unavailable')
  const allMissingGames = previous.games.filter(game => !game.storeInfo)
  const missingGames = allMissingGames.slice(0, metadataLimit)
  const fetchedStoreInfo = await fetchMissingStoreInfo(missingGames)
  const enriched = {
    ...previous,
    games: previous.games.map(game => ({
      ...game,
      storeInfo: game.storeInfo || fetchedStoreInfo.get(Number(game.appid)) || undefined,
    })),
  }
  await writeFile(outputPath, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8')
  console.log(`Fetched Steam Store metadata for ${fetchedStoreInfo.size}/${missingGames.length} games (${allMissingGames.length - missingGames.length} left for another batch)`)
  process.exit(0)
}

const [ownedResult, profileResult] = await Promise.all([
  steamRequest('IPlayerService', 'GetOwnedGames', 'v1', {
    steamid: steamId,
    include_appinfo: 'true',
    include_played_free_games: 'true',
  }),
  steamRequest('ISteamUser', 'GetPlayerSummaries', 'v2', { steamids: steamId }),
])

const owned = ownedResult.response
const profile = profileResult.response?.players?.[0]
if (!profile) throw new Error('Steam profile was not returned; check STEAM_ID')
if (!Array.isArray(owned?.games)) {
  throw new Error('Steam game details are unavailable; set Game details to Public in Steam privacy settings')
}

const missingStoreInfo = owned.games.filter(game => !previousGames.get(Number(game.appid))?.storeInfo)
const fetchedStoreInfo = await fetchMissingStoreInfo(missingStoreInfo)
if (missingStoreInfo.length) console.log(`Fetched Steam Store metadata for ${fetchedStoreInfo.size}/${missingStoreInfo.length} games`)

const games = owned.games.map(game => ({
  appid: game.appid,
  name: game.name,
  playtimeForever: game.playtime_forever || 0,
  playtimeTwoWeeks: game.playtime_2weeks || 0,
  lastPlayed: game.rtime_last_played ? new Date(game.rtime_last_played * 1000).toISOString() : null,
  iconUrl: game.img_icon_url
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
    : null,
  headerUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
  storeUrl: `https://store.steampowered.com/app/${game.appid}/`,
  storeInfo: previousGames.get(Number(game.appid))?.storeInfo || fetchedStoreInfo.get(Number(game.appid)) || undefined,
})).sort((left, right) => right.playtimeForever - left.playtimeForever)

const payload = {
  status: 'ready',
  updatedAt: new Date().toISOString(),
  steamId,
  profile: {
    name: profile.personaname,
    url: profile.profileurl,
    avatar: profile.avatarfull,
    status: profile.personastate,
    lastLogoff: profile.lastlogoff ? new Date(profile.lastlogoff * 1000).toISOString() : null,
  },
  stats: {
    gameCount: owned.game_count ?? games.length,
    playedGameCount: games.filter(game => game.playtimeForever > 0).length,
    totalMinutes: games.reduce((total, game) => total + game.playtimeForever, 0),
    recentMinutes: games.reduce((total, game) => total + game.playtimeTwoWeeks, 0),
  },
  games,
}

const comparable = value => JSON.stringify({
  status: value.status,
  steamId: value.steamId,
  profile: value.profile,
  stats: value.stats,
  games: value.games,
})

if (previous && comparable(previous) === comparable(payload)) {
  console.log(`Steam library is already current (${games.length} games)`)
  process.exit(0)
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`Synced ${games.length} Steam games for ${profile.personaname}`)
