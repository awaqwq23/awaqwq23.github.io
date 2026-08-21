import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..', '..')
const watchlistPath = join(projectRoot, '.github', 'data', 'anime-watchlist.json')
const outputPath = join(projectRoot, 'public', 'data', 'anime-tracker.json')

const query = `
  query AnimeTracker($ids: [Int]) {
    Page(page: 1, perPage: 25) {
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
        relations {
          edges {
            relationType(version: 2)
            node {
              id
              type
              format
              status
              title { romaji english native }
              siteUrl
            }
          }
        }
      }
    }
  }
`

const sleep = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds))

async function fetchAniListBatch(ids) {
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

async function fetchAniList(ids) {
  const results = []
  for (let index = 0; index < ids.length; index += 25) {
    results.push(...await fetchAniListBatch(ids.slice(index, index + 25)))
    if (index + 25 < ids.length) await sleep(1200)
  }
  return results
}

function toDateString(date) {
  if (!date?.year || !date?.month || !date?.day) return null
  return [date.year, date.month, date.day].map((part, index) => index ? String(part).padStart(2, '0') : part).join('-')
}

function toIsoDate(epochSeconds) {
  return epochSeconds ? new Date(epochSeconds * 1000).toISOString() : null
}

const FORMAT_LABELS = {
  TV: 'TV动画',
  TV_SHORT: '电视短篇',
  MOVIE: '剧场版',
  SPECIAL: '特别篇',
  OVA: 'OVA',
  ONA: '网络动画',
  MUSIC: '音乐动画',
}

const RELATION_LABELS = {
  PREQUEL: '前作',
  SEQUEL: '续作',
  PARENT: '正篇',
  SIDE_STORY: '外传',
  SPIN_OFF: '衍生作',
  ALTERNATIVE: '其他版本',
  COMPILATION: '总集篇',
  CONTAINS: '包含篇章',
  OTHER: '关联作',
}

function createRelatedAnime(media) {
  const seen = new Set()
  return (media.relations?.edges || [])
    .filter(edge => edge.node?.type === 'ANIME' && FORMAT_LABELS[edge.node.format])
    .filter(edge => RELATION_LABELS[edge.relationType])
    .filter(edge => {
      if (seen.has(edge.node.id)) return false
      seen.add(edge.node.id)
      return true
    })
    .map(edge => ({
      id: edge.node.id,
      title: edge.node.title.english || edge.node.title.romaji || edge.node.title.native,
      nativeTitle: edge.node.title.native || null,
      relation: edge.relationType,
      relationLabel: RELATION_LABELS[edge.relationType],
      format: edge.node.format,
      formatLabel: FORMAT_LABELS[edge.node.format],
      status: edge.node.status,
      siteUrl: edge.node.siteUrl,
    }))
}

function createEntry(config, media, nowSeconds) {
  const episodeOffset = config.episodeOffset || 0
  const sourceReleasedEpisodes = media.status === 'FINISHED' && media.episodes
    ? media.episodes
    : media.nextAiringEpisode
      ? Math.max(0, media.nextAiringEpisode.episode - 1)
      : 0
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
    formatLabel: FORMAT_LABELS[media.format] || media.format || '动画',
    relatedAnime: createRelatedAnime(media),
    releasedEpisodes,
    totalEpisodes,
    nextEpisode,
    nextAiringAt: toIsoDate(media.nextAiringEpisode?.airingAt),
    lastAiredAt: null,
    startDate: toDateString(media.startDate),
    endDate: toDateString(media.endDate),
    coverImage: media.coverImage?.extraLarge || media.coverImage?.large || null,
    coverColor: media.coverImage?.color || '#3b82f6',
    bannerImage: media.bannerImage || null,
    siteUrl: media.siteUrl,
    note: config.note || null,
    groups: config.groups || ['其他'],
  }
}

function createManualEntry(config) {
  return {
    id: config.manualId,
    title: config.title,
    subtitle: config.subtitle || '暂无动画条目',
    sourceTitle: config.title,
    status: 'NOT_YET_RELEASED',
    format: null,
    formatLabel: '动画企划',
    relatedAnime: [],
    releasedEpisodes: 0,
    totalEpisodes: null,
    nextEpisode: null,
    nextAiringAt: null,
    lastAiredAt: null,
    startDate: null,
    endDate: null,
    coverImage: null,
    coverColor: '#8b5cf6',
    bannerImage: null,
    siteUrl: config.siteUrl || 'https://anilist.co/',
    note: config.note || null,
    groups: config.groups || ['其他'],
  }
}

async function main() {
  const watchlist = JSON.parse(await readFile(watchlistPath, 'utf8'))
  const ids = watchlist.filter(item => Number.isInteger(item.id)).map(item => item.id)
  if (new Set(ids).size !== ids.length) throw new Error('追番配置中存在重复的 AniList ID')
  const mediaList = await fetchAniList(ids)
  const mediaById = new Map(mediaList.map(media => [media.id, media]))
  const missingIds = ids.filter(id => !mediaById.has(id))
  if (missingIds.length) throw new Error(`AniList 未返回这些条目：${missingIds.join(', ')}`)

  const now = new Date()
  const entries = watchlist.map(config => config.manualId
    ? createManualEntry(config)
    : createEntry(config, mediaById.get(config.id), Math.floor(now.getTime() / 1000)))
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
