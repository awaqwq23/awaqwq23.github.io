import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..', '..')
const watchlistPath = join(projectRoot, '.github', 'data', 'anime-watchlist.json')
const outputPath = join(projectRoot, 'public', 'data', 'anime-tracker.json')

const query = `
  query AnimeTracker($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        title { romaji english native }
        status
        format
        episodes
        startDate { year month day }
        endDate { year month day }
        coverImage { extraLarge large color }
        bannerImage
        siteUrl
        nextAiringEpisode { airingAt episode }
        airingSchedule(page: 1, perPage: 50) {
          nodes { airingAt episode }
        }
      }
    }
  }
`

const sleep = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds))

async function fetchAniList(ids) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'awaqwq233.github.io anime tracker',
        },
        body: JSON.stringify({ query, variables: { ids } }),
      })
      if (!response.ok) throw new Error(`AniList 请求失败（HTTP ${response.status}）`)
      const payload = await response.json()
      if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join('; '))
      return payload.data?.Page?.media || []
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleep(attempt * 1500)
    }
  }
  throw lastError
}

function toDateString(date) {
  if (!date?.year || !date?.month || !date?.day) return null
  return [date.year, date.month, date.day].map((part, index) => index ? String(part).padStart(2, '0') : part).join('-')
}

function toIsoDate(epochSeconds) {
  return epochSeconds ? new Date(epochSeconds * 1000).toISOString() : null
}

function createEntry(config, media, nowSeconds) {
  const episodeOffset = config.episodeOffset || 0
  const schedules = media.airingSchedule?.nodes || []
  const airedSchedules = schedules.filter(schedule => schedule.airingAt <= nowSeconds)
  const latestAired = airedSchedules.reduce((latest, schedule) => {
    if (!latest || schedule.episode > latest.episode) return schedule
    return latest
  }, null)
  const sourceReleasedEpisodes = media.status === 'FINISHED' && media.episodes
    ? media.episodes
    : latestAired?.episode ?? Math.max(0, (media.nextAiringEpisode?.episode || 1) - 1)
  const inferredTotal = media.episodes == null ? null : media.episodes + (config.totalEpisodeOffset || 0)
  const totalEpisodes = config.totalEpisodes ?? inferredTotal
  const releasedEpisodes = Math.max(0, totalEpisodes == null
    ? sourceReleasedEpisodes + episodeOffset
    : Math.min(totalEpisodes, sourceReleasedEpisodes + episodeOffset))
  const nextEpisode = media.nextAiringEpisode
    ? Math.max(1, media.nextAiringEpisode.episode + episodeOffset)
    : null

  return {
    id: media.id,
    title: config.title,
    subtitle: config.subtitle || media.title.native || media.title.romaji,
    sourceTitle: media.title.english || media.title.romaji || media.title.native,
    status: media.status,
    format: media.format,
    releasedEpisodes,
    totalEpisodes,
    nextEpisode,
    nextAiringAt: toIsoDate(media.nextAiringEpisode?.airingAt),
    lastAiredAt: toIsoDate(latestAired?.airingAt),
    startDate: toDateString(media.startDate),
    endDate: toDateString(media.endDate),
    coverImage: media.coverImage?.extraLarge || media.coverImage?.large || null,
    coverColor: media.coverImage?.color || '#3b82f6',
    bannerImage: media.bannerImage || null,
    siteUrl: media.siteUrl,
    note: config.note || null,
  }
}

async function main() {
  const watchlist = JSON.parse(await readFile(watchlistPath, 'utf8'))
  const ids = watchlist.map(item => item.id)
  const mediaList = await fetchAniList(ids)
  const mediaById = new Map(mediaList.map(media => [media.id, media]))
  const missingIds = ids.filter(id => !mediaById.has(id))
  if (missingIds.length) throw new Error(`AniList 未返回这些条目：${missingIds.join(', ')}`)

  const now = new Date()
  const entries = watchlist.map(config => createEntry(config, mediaById.get(config.id), Math.floor(now.getTime() / 1000)))
  const payload = {
    syncedAt: now.toISOString(),
    timezone: 'Asia/Shanghai',
    source: {
      name: 'AniList',
      url: 'https://anilist.co/',
      note: '更新时间为 AniList 收录的日本首播时间，并已换算为北京时间。',
    },
    entries,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`已同步 ${entries.length} 部番剧：${outputPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
