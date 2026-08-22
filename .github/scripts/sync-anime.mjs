import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..', '..')
const watchlistPath = join(projectRoot, '.github', 'data', 'anime-watchlist.json')
const outputPath = join(projectRoot, 'public', 'data', 'anime-tracker.json')
const BANGUMI_CONCURRENCY = 4

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
        signal: AbortSignal.timeout(30_000),
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

const BANGUMI_API_ROOT = 'https://api.bgm.tv'
const BANGUMI_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'awaqwq233.github.io anime tracker',
}

function normalizeTitle(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('zh-CN')
    .replace(/[\s\-—–:：·・!！?？'"“”‘’\[\]()（）【】]/g, '')
}

function bangumiAliases(subject) {
  const aliases = [subject?.name, subject?.name_cn]
  const aliasBox = (subject?.infobox || []).find(item => item.key === '别名')
  if (Array.isArray(aliasBox?.value)) aliases.push(...aliasBox.value.map(item => item?.v || item))
  return aliases.map(normalizeTitle).filter(Boolean)
}

async function fetchBangumiJson(url, options = {}) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000), headers: { ...BANGUMI_HEADERS, ...options.headers } })
      if (!response.ok) throw new Error(`Bangumi 请求失败（HTTP ${response.status}）`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleep(attempt * 800)
    }
  }
  throw lastError
}

function relationFormatLabel(relation) {
  if (/剧场|电影/.test(relation || '')) return '剧场版'
  if (/番外|特别/.test(relation || '')) return '特别篇'
  return '关联动画'
}

async function fetchBangumiMetadata(config, media) {
  const candidates = [config.subtitle, config.title, media.title.native, media.title.romaji, media.title.english].filter(Boolean)
  const expected = new Set(candidates.map(normalizeTitle))
  for (const keyword of candidates) {
    const result = await fetchBangumiJson(`${BANGUMI_API_ROOT}/v0/search/subjects?limit=10`, {
      method: 'POST', body: JSON.stringify({ keyword, sort: 'match', filter: { type: [2] } }),
    })
    const matches = (result.data || []).filter(subject => bangumiAliases(subject).some(alias => expected.has(alias)))
    const subject = matches.sort((left, right) => Number(right.rating?.total || 0) - Number(left.rating?.total || 0))[0]
    if (!subject) { await sleep(120); continue }
    const relations = await fetchBangumiJson(`${BANGUMI_API_ROOT}/v0/subjects/${subject.id}/subjects`)
    return {
      bangumiId: subject.id,
      score: Number(subject.rating?.score || 0) || null,
      bangumiUrl: `https://bgm.tv/subject/${subject.id}`,
      relationSource: 'Bangumi',
      relatedAnime: relations.filter(item => item.type === 2).map(item => ({
        id: item.id,
        title: item.name_cn || item.name,
        nativeTitle: item.name || null,
        relationLabel: item.relation || '关联作',
        formatLabel: relationFormatLabel(item.relation),
        siteUrl: `https://bgm.tv/subject/${item.id}`,
      })),
    }
  }
  return { bangumiId: null, score: null, bangumiUrl: null, relationSource: null, relatedAnime: [] }
}

function createEntry(config, media, bangumiMetadata) {
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
    bangumiId: bangumiMetadata.bangumiId,
    score: bangumiMetadata.score,
    relationSource: bangumiMetadata.relationSource,
    relatedAnime: bangumiMetadata.relatedAnime,
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
    bangumiUrl: bangumiMetadata.bangumiUrl,
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
    bangumiId: null,
    score: null,
    relationSource: null,
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
  const entries = new Array(watchlist.length)
  let cursor = 0
  async function enrichWorker() {
    while (cursor < watchlist.length) {
      const index = cursor
      cursor += 1
      const config = watchlist[index]
      if (config.manualId) {
        entries[index] = createManualEntry(config)
        continue
      }
      const media = mediaById.get(config.id)
      let bangumiMetadata = { bangumiId: null, score: null, bangumiUrl: null, relationSource: null, relatedAnime: [] }
      try {
        bangumiMetadata = await fetchBangumiMetadata(config, media)
      } catch (error) {
        console.warn(`Bangumi 关联读取失败（${config.title}）：${error.message}`)
      }
      entries[index] = createEntry(config, media, bangumiMetadata)
      console.log(`Bangumi 关联 ${index + 1}/${watchlist.length}：${config.title}${bangumiMetadata.bangumiId ? ` → ${bangumiMetadata.bangumiId}` : '（未匹配）'}`)
      await sleep(150)
    }
  }
  await Promise.all(Array.from({ length: BANGUMI_CONCURRENCY }, () => enrichWorker()))
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
