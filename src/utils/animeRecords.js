export const TRACKER_PROGRESS_KEY = 'awa-anime-watch-progress-v1'
export const BANGUMI_PROGRESS_KEY = 'awa-bangumi-watch-progress-v1'
export const CUSTOM_TRACKER_KEY = 'awa-anime-custom-entries-v1'
export const BANGUMI_RELATIONS_KEY = 'awa-bangumi-relations-v1'
export const ANIME_REVIEWS_KEY = 'awa-anime-reviews-v1'
export const EXPORT_APP_ID = 'awaqwq233-anime-records'
export const RECORDS_UPDATED_EVENT = 'awa-anime-records-updated'

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export function readStoredObject(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

export function writeStoredObject(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent(RECORDS_UPDATED_EVENT, { detail: { key } }))
    return true
  } catch {
    return false
  }
}

export function sanitizeProgress(rawProgress, includeInterest = false) {
  const sanitized = {}
  if (!rawProgress || typeof rawProgress !== 'object' || Array.isArray(rawProgress)) return sanitized
  for (const [id, value] of Object.entries(rawProgress)) {
    if (BLOCKED_KEYS.has(id) || !value || typeof value !== 'object' || Array.isArray(value)) continue
    const status = ['not_started', 'watching', 'finished', 'dropped', 'none'].includes(value.status) ? value.status : 'not_started'
    const episode = Math.max(0, Math.min(99999, Number.parseInt(value.episode, 10) || 0))
    const record = { status, episode }
    if (includeInterest) record.interest = ['neutral', 'interested', 'not_interested'].includes(value.interest) ? value.interest : 'neutral'
    sanitized[id] = record
  }
  return sanitized
}

export function sanitizeReviews(rawReviews) {
  const sanitized = {}
  if (!rawReviews || typeof rawReviews !== 'object' || Array.isArray(rawReviews)) return sanitized
  for (const [id, value] of Object.entries(rawReviews)) {
    if (BLOCKED_KEYS.has(id) || !value || typeof value !== 'object' || Array.isArray(value)) continue
    const text = String(value.text || '').trim().slice(0, 50_000)
    if (!text) continue
    const numericScore = Number(value.score)
    sanitized[id] = {
      text,
      score: Number.isFinite(numericScore) && numericScore >= 1 && numericScore <= 10 ? numericScore : null,
      title: String(value.title || '').slice(0, 200),
      source: value.source === 'blog' ? 'blog' : 'local',
      sourceUrl: value.source === 'blog' && value.sourceUrl ? String(value.sourceUrl).slice(0, 500) : null,
      updatedAt: /^\d{4}-\d{2}-\d{2}T/.test(value.updatedAt || '') ? value.updatedAt : new Date().toISOString(),
    }
  }
  return sanitized
}

export function sanitizeCustomEntries(rawEntries) {
  const sanitized = {}
  if (!rawEntries || typeof rawEntries !== 'object' || Array.isArray(rawEntries)) return sanitized
  for (const [id, entry] of Object.entries(rawEntries)) {
    if (BLOCKED_KEYS.has(id) || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const bangumiId = Number.parseInt(entry.bangumiId, 10)
    if (!Number.isInteger(bangumiId) || bangumiId <= 0 || String(id) !== `bangumi-${bangumiId}`) continue
    sanitized[id] = {
      ...entry,
      id,
      bangumiId,
      score: Number.isFinite(Number(entry.score)) ? Number(entry.score) : null,
      relatedAnime: Array.isArray(entry.relatedAnime) ? entry.relatedAnime.slice(0, 100) : [],
      groups: ['Bangumi 导入'],
    }
  }
  return sanitized
}

export function normalizeAnimeTitle(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[\s\-—–:：·・!！?？'"“”‘’\[\]()（）【】]/g, '')
    .replace(/第?[一二三四五六七八九十0-9]+(?:季|期|部|章|篇)|season\d+|s\d+/g, match => match.replace(/^第/, ''))
}

export function flattenBangumiSubjects(data) {
  const subjects = new Map()
  for (const quarter of data?.quarters || []) {
    for (const subject of quarter.subjects || []) {
      const previous = subjects.get(subject.id)
      subjects.set(subject.id, previous ? { ...previous, ...subject, isAiring: previous.isAiring || subject.isAiring } : subject)
    }
  }
  return [...subjects.values()]
}

function titleAliases(item) {
  return [item?.title, item?.originalTitle, item?.subtitle, item?.sourceTitle, item?.name, item?.name_cn]
    .map(normalizeAnimeTitle)
    .filter(Boolean)
}

export function matchBangumiSubject(entry, subjects) {
  if (entry?.bangumiId) return subjects.find(subject => Number(subject.id) === Number(entry.bangumiId)) || null
  const aliases = new Set(titleAliases(entry))
  if (!aliases.size) return null
  const exact = subjects.filter(subject => titleAliases(subject).some(alias => aliases.has(alias)))
  return exact.length === 1 ? exact[0] : exact.sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0] || null
}

export function buildTrackerBangumiMap(entries, subjects) {
  const trackerToBangumi = new Map()
  const bangumiToTracker = new Map()
  for (const entry of entries || []) {
    const subject = matchBangumiSubject(entry, subjects)
    if (!subject) continue
    trackerToBangumi.set(String(entry.id), String(subject.id))
    if (!bangumiToTracker.has(String(subject.id))) bangumiToTracker.set(String(subject.id), String(entry.id))
  }
  return { trackerToBangumi, bangumiToTracker }
}

function bangumiStatus(subject) {
  if (subject.isAiring) return 'RELEASING'
  const airDate = subject.airDate || subject.date
  if (airDate && new Date(`${airDate}T00:00:00+08:00`).getTime() > Date.now()) return 'NOT_YET_RELEASED'
  return 'FINISHED'
}

function relationFormatLabel(relation) {
  if (/剧场|电影/.test(relation || '')) return '剧场版'
  if (/特别|番外/.test(relation || '')) return '特别篇'
  return '动画'
}

export function bangumiSubjectToTrackerEntry(subject, relations = subject.relatedAnime || []) {
  const bangumiId = Number(subject.id)
  const totalEpisodes = Number(subject.totalEpisodes || subject.total_episodes || subject.eps || 0) || null
  const image = subject.image || subject.images?.large || subject.images?.common || null
  const score = Number(subject.score ?? subject.rating?.score)
  return {
    id: `bangumi-${bangumiId}`,
    bangumiId,
    title: subject.title || subject.name_cn || subject.name,
    subtitle: subject.originalTitle || subject.name || '',
    sourceTitle: subject.originalTitle || subject.name || '',
    status: bangumiStatus(subject),
    format: subject.platform === '剧场版' ? 'MOVIE' : 'TV',
    formatLabel: subject.platform || '动画',
    relatedAnime: (relations || []).filter(item => Number(item.type || 2) === 2).map(item => ({
      id: item.id,
      title: item.title || item.name_cn || item.name,
      relationLabel: item.relationLabel || item.relation || '关联作',
      formatLabel: item.formatLabel || relationFormatLabel(item.relation),
      siteUrl: item.siteUrl || `https://bgm.tv/subject/${item.id}`,
    })),
    relationSource: 'Bangumi',
    releasedEpisodes: subject.isAiring ? Number(subject.releasedEpisodes || 0) : (totalEpisodes || 0),
    totalEpisodes,
    nextEpisode: null,
    nextAiringAt: null,
    startDate: subject.airDate || subject.date || null,
    endDate: subject.endDate || null,
    coverImage: image ? String(image).replace(/^http:\/\//, 'https://') : null,
    coverColor: '#7057c7',
    siteUrl: subject.url || `https://bgm.tv/subject/${bangumiId}`,
    score: Number.isFinite(score) ? score : null,
    note: '通过 Bangumi 条目加入',
    groups: ['Bangumi 导入'],
  }
}

export function categoryForEntry(entry, progress) {
  if (progress?.status === 'none') return 'none'
  if (progress?.status === 'dropped') return 'dropped'
  if (progress?.status === 'finished') return 'finished'
  if (progress?.status === 'watching') return 'watching'
  if (progress?.status === 'not_started') return 'planned'
  const groups = entry.groups || []
  if (groups.includes('已看') || groups.includes('已二刷')) return 'finished'
  if (groups.includes('正在看') || groups.includes('近期追番')) return 'watching'
  return 'planned'
}

export function seriesTitleKey(value) {
  return normalizeAnimeTitle(value)
    .replace(/(?:第)?[一二三四五六七八九十0-9]+(?:季|期|部|章|篇)/g, '')
    .replace(/(?:season|part|cour)\d+/g, '')
    .replace(/(?:剧场版|映画|themovie|movie|特别篇|ova|oad|sp)$/g, '')
    .replace(/(?:续篇|新篇|完结篇|总集篇)$/g, '')
}

export function buildSeriesGroups(entries) {
  const list = entries || []
  const parents = list.map((_, index) => index)
  const find = index => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]]
      index = parents[index]
    }
    return index
  }
  const unite = (left, right) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot
  }
  const idIndex = new Map()
  const titleIndexes = new Map()
  list.forEach((entry, index) => {
    const bangumiId = entry.bangumiId || entry.id
    if (bangumiId != null) idIndex.set(String(bangumiId).replace(/^bangumi-/, ''), index)
    const titleKey = seriesTitleKey(entry.title || entry.originalTitle)
    if (titleKey.length >= 3) {
      const previous = titleIndexes.get(titleKey)
      if (previous != null) unite(previous, index)
      else titleIndexes.set(titleKey, index)
    }
  })
  list.forEach((entry, index) => {
    if (entry.relationSource !== 'Bangumi') return
    for (const related of entry.relatedAnime || []) {
      const relatedIndex = idIndex.get(String(related.id))
      if (relatedIndex != null) unite(index, relatedIndex)
    }
  })
  const groups = new Map()
  list.forEach((entry, index) => {
    const root = find(index)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(entry)
  })
  return [...groups.values()].map(items => ({
    id: items.map(item => item.bangumiId || item.id).join('-'),
    title: items.length > 1 ? `${items[0].title} 系列` : items[0].title,
    items,
  }))
}

export function buildCatalogSeriesGroups(entries, catalog, progress = {}) {
  const list = entries || []
  if (!catalog?.series?.length) return buildSeriesGroups(list)
  const entriesById = new Map(list.map(entry => [String(entry.id), entry]))
  const entriesByBangumiId = new Map(list.filter(entry => entry.bangumiId).map(entry => [String(entry.bangumiId), entry]))
  const consumed = new Set()
  const groups = []

  for (const series of catalog.series) {
    const sourceEntries = (series.sourceEntryIds || []).map(id => entriesById.get(String(id))).filter(Boolean)
    const importedEntries = (series.members || []).map(member => entriesByBangumiId.get(String(member.id))).filter(Boolean)
    if (!sourceEntries.length && !importedEntries.length) continue
    const sourceLinks = new Map((series.sourceLinks || []).map(link => [String(link.seedId), entriesById.get(String(link.entryId))]).filter(([, entry]) => entry))
    const relatedAnime = (series.members || []).map(member => ({
      id: member.id,
      title: member.title,
      relationLabel: '同系列',
      formatLabel: member.platform || '动画',
      siteUrl: member.url || `https://bgm.tv/subject/${member.id}`,
    }))
    const items = (series.members || []).map(member => {
      const sourceEntry = sourceLinks.get(String(member.id)) || entriesByBangumiId.get(String(member.id))
      if (sourceEntry) consumed.add(String(sourceEntry.id))
      const localId = sourceEntry?.id || `bangumi-${member.id}`
      const factual = bangumiSubjectToTrackerEntry({ ...member, isAiring: member.status === 'RELEASING' }, relatedAnime.filter(item => Number(item.id) !== Number(member.id)))
      const merged = {
        ...sourceEntry,
        ...factual,
        id: localId,
        title: member.title,
        subtitle: member.originalTitle || '',
        sourceTitle: member.originalTitle || member.title,
        status: member.status || factual.status,
        formatLabel: member.platform || '动画',
        relationSource: 'Bangumi',
        relatedAnimeComplete: true,
        seriesId: series.id,
        seriesTitle: series.title,
        groups: sourceEntry?.groups || ['Bangumi 系列补全'],
      }
      const stored = progress[String(localId)]
      return { ...merged, category: sourceEntry ? categoryForEntry(merged, stored) : stored ? categoryForEntry(merged, stored) : 'none' }
    })
    groups.push({ id: series.id, title: series.title, items, factual: true })
    for (const entry of sourceEntries) consumed.add(String(entry.id))
  }

  const leftovers = list.filter(entry => !consumed.has(String(entry.id)))
  return [...groups, ...buildSeriesGroups(leftovers)]
}

export function trackerKeyForBangumi(subjectId, bangumiToTracker) {
  return bangumiToTracker.get(String(subjectId)) || `bangumi-${subjectId}`
}

export function mergeBangumiRecordIntoTracker(subject, record, trackerEntries, bangumiToTracker) {
  const trackerKey = trackerKeyForBangumi(subject.id, bangumiToTracker)
  const trackerProgress = sanitizeProgress(readStoredObject(TRACKER_PROGRESS_KEY))
  const customEntries = sanitizeCustomEntries(readStoredObject(CUSTOM_TRACKER_KEY))
  const status = record?.status || (record?.interest === 'not_interested' ? 'none' : 'not_started')
  trackerProgress[trackerKey] = { status, episode: record?.episode || 0 }
  if (!trackerEntries.some(entry => String(entry.id) === trackerKey)) {
    customEntries[trackerKey] = bangumiSubjectToTrackerEntry(subject)
  }
  writeStoredObject(TRACKER_PROGRESS_KEY, trackerProgress)
  writeStoredObject(CUSTOM_TRACKER_KEY, customEntries)
  return { trackerProgress, customEntries }
}

export function syncTrackerRecordToBangumi(entry, record, trackerToBangumi) {
  const bangumiId = entry.bangumiId || trackerToBangumi.get(String(entry.id))
  if (!bangumiId) return
  const bangumiProgress = sanitizeProgress(readStoredObject(BANGUMI_PROGRESS_KEY), true)
  bangumiProgress[String(bangumiId)] = {
    status: record.status,
    episode: record.episode || 0,
    interest: record.status === 'not_started' ? 'interested' : record.status === 'dropped' ? 'not_interested' : 'neutral',
  }
  writeStoredObject(BANGUMI_PROGRESS_KEY, bangumiProgress)
}

async function fetchWithRetry(url, attempts = 2) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
        cache: 'force-cache',
      })
      if (response.ok || response.status < 500) return response
      lastError = new Error(`Bangumi 服务暂时异常（${response.status}）`)
    } catch (error) {
      lastError = error
    }
    if (attempt < attempts - 1) await new Promise(resolve => window.setTimeout(resolve, 450 * (attempt + 1)))
  }
  if (lastError?.name === 'TimeoutError') throw new Error('Bangumi 接口连接超时，请稍后重试')
  throw new Error(lastError?.message || 'Bangumi 服务暂时无法连接')
}

export async function fetchBangumiEntryFromUrl(value) {
  const subjectId = bangumiIdFromValue(value)
  if (!Number.isInteger(subjectId) || subjectId <= 0) throw new Error('请输入正确的 Bangumi 条目链接')
  const subjectResponse = await fetchWithRetry(`https://api.bgm.tv/v0/subjects/${subjectId}`)
  if (!subjectResponse.ok) throw new Error(`Bangumi 条目读取失败（${subjectResponse.status}）`)
  const subject = await subjectResponse.json()
  if (Number(subject.type) !== 2) throw new Error('这个链接不是动画条目')
  let relations = []
  try {
    const relationResponse = await fetchWithRetry(`https://api.bgm.tv/v0/subjects/${subjectId}/subjects`, 2)
    relations = relationResponse.ok ? await relationResponse.json() : []
  } catch {
    // 关联作读取失败不应阻止主条目导入。
  }
  return bangumiSubjectToTrackerEntry(subject, relations)
}

export function bangumiIdFromValue(value) {
  const rawValue = String(value || '').trim()
  const match = rawValue.match(/^(?:(?:https?:\/\/)?(?:www\.)?(?:bgm\.tv|bangumi\.tv|chii\.in)\/subject\/)?(\d+)(?:[/?#].*)?$/i)
  return Number(match?.[1])
}

export function createExportPayload(trackerProgress, bangumiProgress, customEntries, reviews = {}) {
  return {
    app: EXPORT_APP_ID,
    version: 3,
    exportedAt: new Date().toISOString(),
    trackerProgress: sanitizeProgress(trackerProgress),
    bangumiProgress: sanitizeProgress(bangumiProgress, true),
    customEntries: sanitizeCustomEntries(customEntries),
    reviews: sanitizeReviews(reviews),
  }
}

export function parseImportPayload(payload) {
  if (payload?.app !== EXPORT_APP_ID || ![1, 2, 3].includes(payload?.version)) throw new Error('文件格式不属于本站番剧记录')
  return {
    trackerProgress: sanitizeProgress(payload.trackerProgress),
    bangumiProgress: sanitizeProgress(payload.bangumiProgress, true),
    customEntries: sanitizeCustomEntries(payload.customEntries),
    reviews: sanitizeReviews(payload.reviews),
  }
}
