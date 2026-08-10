import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const apiKey = process.env.STEAM_API_KEY
const steamId = process.env.STEAM_ID || '76561198825902593'
const outputPath = resolve('public/materials/steam-library.json')

if (!apiKey) throw new Error('Missing STEAM_API_KEY')

async function steamRequest(interfaceName, method, version, parameters = {}) {
  const url = new URL(`https://api.steampowered.com/${interfaceName}/${method}/${version}/`)
  url.search = new URLSearchParams({ key: apiKey, format: 'json', ...parameters })
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Steam API ${method} failed with ${response.status}`)
  return response.json()
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

const previous = await readFile(outputPath, 'utf8').then(JSON.parse).catch(() => null)
if (previous && comparable(previous) === comparable(payload)) {
  console.log(`Steam library is already current (${games.length} games)`)
  process.exit(0)
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
console.log(`Synced ${games.length} Steam games for ${profile.personaname}`)
