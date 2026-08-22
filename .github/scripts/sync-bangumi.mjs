import { execFile } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { writeBangumiShards } from './write-bangumi-shards.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..', '..')
const outputPath = join(projectRoot, 'public', 'data', 'bangumi-airing.json')
const API_ROOT = 'https://api.bgm.tv'
const SCORE_THRESHOLD = 7
const ARCHIVE_START_YEAR = 2010
const ARCHIVE_END_YEAR = 2026
const PAGE_SIZE = 100
const LONG_RUNNING_EPISODES = 24
const USER_AGENT = 'awaqwq233.github.io/2.0 (https://github.com/awaqwq23/awaqwq23.github.io)'
const execFileAsync = promisify(execFile)

const sleep = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds))

async function fetchJsonWithCurl(url) {
  const { stdout } = await execFileAsync('curl', [
    '--fail', '--silent', '--show-error', '--location', '--retry', '3',
    '--connect-timeout', '20', '--max-time', '60',
    '--header', 'Accept: application/json', '--user-agent', USER_AGENT, url,
  ], { maxBuffer: 16 * 1024 * 1024 })
  return JSON.parse(stdout)
}

async function fetchJson(url) {
  if (process.env.https_proxy || process.env.HTTPS_PROXY) return fetchJsonWithCurl(url)
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      })
      if (!response.ok) throw new Error(`Bangumi 请求失败（HTTP ${response.status}）`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleep(attempt * 1200)
    }
  }
  try {
    return await fetchJsonWithCurl(url)
  } catch {
    throw lastError
  }
}

function httpsUrl(value) {
  return typeof value === 'string' ? value.replace(/^http:\/\//, 'https://') : null
}

function normalizeSummary(value) {
  if (typeof value !== 'string') return ''
  const summary = value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return summary.length > 420 ? `${summary.slice(0, 417).trimEnd()}…` : summary
}

function quarterForMonth(month) {
  return Math.floor((month - 1) / 3) + 1
}

function quarterStartMonth(quarter) {
  return (quarter - 1) * 3 + 1
}

function quarterKey(year, quarter) {
  return `${year}-Q${quarter}`
}

function quarterRange(year, quarter) {
  const month = quarterStartMonth(quarter)
  const endYear = quarter === 4 ? year + 1 : year
  const endMonth = quarter === 4 ? 1 : month + 3
  return {
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${endYear}-${String(endMonth).padStart(2, '0')}-01`,
  }
}

function weekdayFromDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null
  const id = new Date(`${date}T00:00:00Z`).getUTCDay() || 7
  const labels = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
  const english = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return { id, cn: labels[id - 1], en: english[id - 1] }
}

function totalEpisodes(subject) {
  const value = Number(subject.total_episodes || subject.eps || subject.eps_count || 0)
  return Number.isFinite(value) && value > 0 ? value : null
}

function infoboxText(subject, keys) {
  const item = (subject.infobox || []).find(entry => keys.includes(entry.key))
  if (!item) return ''
  if (Array.isArray(item.value)) return item.value.map(value => value?.v || value).filter(Boolean).join('、')
  return String(item.value || '')
}

function parseBangumiDate(value) {
  const isoMatch = String(value || '').match(/(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/)
  const chineseMatch = String(value || '').match(/(\d{4})年\s*(\d{1,2})月(?:\s*(\d{1,2})日)?/)
  const match = isoMatch || chineseMatch
  if (!match) return null
  const [, year, month, day] = match
  return `${year}-${String(month).padStart(2, '0')}${day ? `-${String(day).padStart(2, '0')}` : ''}`
}

function estimateEndDate(startDate, episodes) {
  if (!startDate || !episodes) return null
  const start = new Date(`${startDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return null
  start.setUTCDate(start.getUTCDate() + Math.max(0, episodes - 1) * 7)
  return start.toISOString().slice(0, 10)
}

function detectOrigin(subject) {
  const tags = [
    ...(subject.tags || []).map(tag => typeof tag === 'string' ? tag : tag.name),
    ...(subject.meta_tags || []),
    infoboxText(subject, ['国家', '地区', '国家/地区', '制作国家']),
  ].join(' ')
  if (/国产|国漫|中国动画|国创|中国大陆|中国香港|中国台湾/.test(tags)) return { origin: 'china', originLabel: '国产动画' }
  if (/欧美|美国|美漫|迪士尼|加拿大|英国|法国|德国|澳大利亚/.test(tags)) return { origin: 'western', originLabel: '欧美动画' }
  if (/韩国|韩漫/.test(tags)) return { origin: 'korea', originLabel: '韩国动画' }
  return { origin: 'japan', originLabel: '日本动画' }
}

function normalizeSubject(subject, quarterStart, calendarWeekday = null) {
  const episodes = totalEpisodes(subject)
  const airDate = subject.date || subject.air_date || null
  const startedBeforeQuarter = Boolean(airDate && airDate < quarterStart)
  const isLongRunning = startedBeforeQuarter || (episodes != null && episodes >= LONG_RUNNING_EPISODES)
  const explicitEndDate = parseBangumiDate(infoboxText(subject, ['播放结束', '放送结束', '上映结束']))
  const endDate = explicitEndDate || (isLongRunning ? estimateEndDate(airDate, episodes) : null)
  const { origin, originLabel } = detectOrigin(subject)
  return {
    id: subject.id,
    title: subject.name_cn || subject.name,
    originalTitle: subject.name,
    summary: normalizeSummary(subject.summary),
    airDate,
    weekday: calendarWeekday || weekdayFromDate(airDate),
    score: Number(subject.rating?.score || 0),
    scoreCount: Number(subject.rating?.total || 0),
    rank: subject.rating?.rank || subject.rank || null,
    watchingCount: Number(subject.collection?.doing || 0),
    platform: subject.platform || null,
    totalEpisodes: episodes,
    endDate,
    endDateEstimated: Boolean(endDate && !explicitEndDate),
    origin,
    originLabel,
    tags: (subject.tags || []).slice(0, 5).map(tag => typeof tag === 'string' ? tag : tag.name),
    image: httpsUrl(subject.images?.large || subject.images?.common),
    url: `https://bgm.tv/subject/${subject.id}`,
    isLongRunning,
    serialType: isLongRunning ? 'long' : 'seasonal',
  }
}

async function fetchSeasonSubjects(year, quarter) {
  const month = quarterStartMonth(quarter)
  const collected = []
  let offset = 0
  let total = Infinity
  while (offset < total) {
    const url = `${API_ROOT}/v0/subjects?type=2&sort=rank&year=${year}&month=${month}&limit=${PAGE_SIZE}&offset=${offset}`
    const page = await fetchJson(url)
    total = Number(page.total || 0)
    collected.push(...(page.data || []))
    offset += PAGE_SIZE
    if (!page.data?.length) break
    if (offset < total) await sleep(260)
  }
  const { startDate } = quarterRange(year, quarter)
  return collected
    .filter(subject => ['TV', 'WEB'].includes(subject.platform))
    .filter(subject => Number(subject.rating?.score || 0) > SCORE_THRESHOLD)
    .map(subject => normalizeSubject(subject, startDate))
}

async function fetchCurrentCalendar(currentStart, seasonalSubjects) {
  const calendar = await fetchJson(`${API_ROOT}/calendar`)
  const seasonalById = new Map(seasonalSubjects.map(subject => [subject.id, subject]))
  const items = calendar.flatMap(day => (day.items || []).map(item => ({ item, weekday: day.weekday })))
    .filter(({ item }) => item.type === 2 && Number(item.rating?.score || 0) > SCORE_THRESHOLD)
  const subjects = []
  for (const { item, weekday } of items) {
    const seasonal = seasonalById.get(item.id)
    if (seasonal) {
      subjects.push({ ...seasonal, weekday, isAiring: true })
      continue
    }
    let details = item
    try {
      details = await fetchJson(`${API_ROOT}/v0/subjects/${item.id}`)
    } catch (error) {
      console.warn(`条目 ${item.id} 详情读取失败，使用日历数据：${error.message}`)
    }
    subjects.push({ ...normalizeSubject(details, currentStart, weekday), isAiring: true })
    await sleep(300)
  }
  return subjects
}

function createQuarter(year, quarter, subjects, currentKey, nextKey) {
  const key = quarterKey(year, quarter)
  const { startDate, endDate } = quarterRange(year, quarter)
  const deduplicated = [...new Map(subjects.map(subject => [subject.id, subject])).values()]
    .filter(subject => subject.score > SCORE_THRESHOLD)
    .sort((left, right) => right.score - left.score || (left.rank || Number.MAX_SAFE_INTEGER) - (right.rank || Number.MAX_SAFE_INTEGER))
  return {
    key,
    year,
    quarter,
    label: `${year} 年第 ${quarter} 季度`,
    startDate,
    endDate,
    isCurrent: key === currentKey,
    isNext: key === nextKey,
    refreshMode: key === currentKey || key === nextKey ? 'daily-live' : 'daily-score',
    count: deduplicated.length,
    longRunningCount: deduplicated.filter(subject => subject.isLongRunning).length,
    seasonalCount: deduplicated.filter(subject => !subject.isLongRunning).length,
    subjects: deduplicated,
  }
}

async function main() {
  const now = new Date()
  const shanghaiParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now).map(part => [part.type, part.value]))
  const currentYear = Number(shanghaiParts.year)
  const currentQuarter = quarterForMonth(Number(shanghaiParts.month))
  const nextYear = currentQuarter === 4 ? currentYear + 1 : currentYear
  const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1
  const currentKey = quarterKey(currentYear, currentQuarter)
  const nextKey = quarterKey(nextYear, nextQuarter)
  const quarterSpecs = []
  for (let year = ARCHIVE_START_YEAR; year <= ARCHIVE_END_YEAR; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) quarterSpecs.push({ year, quarter })
  }
  if (!quarterSpecs.some(spec => quarterKey(spec.year, spec.quarter) === nextKey)) quarterSpecs.push({ year: nextYear, quarter: nextQuarter })

  const quarters = []
  for (const spec of quarterSpecs) {
    const subjects = await fetchSeasonSubjects(spec.year, spec.quarter)
    const key = quarterKey(spec.year, spec.quarter)
    let mergedSubjects = subjects
    if (key === currentKey) {
      const { startDate } = quarterRange(spec.year, spec.quarter)
      const airingSubjects = await fetchCurrentCalendar(startDate, subjects)
      mergedSubjects = [...subjects, ...airingSubjects]
    }
    quarters.push(createQuarter(spec.year, spec.quarter, mergedSubjects, currentKey, nextKey))
    console.log(`${key}: ${mergedSubjects.length} 部评分高于 ${SCORE_THRESHOLD} 分`)
    await sleep(300)
  }

  const payload = {
    schemaVersion: 3,
    syncedAt: now.toISOString(),
    scoreThreshold: SCORE_THRESHOLD,
    archiveStartYear: ARCHIVE_START_YEAR,
    archiveEndYear: ARCHIVE_END_YEAR,
    currentQuarter: currentKey,
    nextQuarter: nextKey,
    longRunningRule: `总集数达到 ${LONG_RUNNING_EPISODES} 话，或开播时间早于所选季度且仍在连载`,
    originOptions: [
      { id: 'japan', label: '日本动画' },
      { id: 'china', label: '国产动画' },
      { id: 'western', label: '欧美动画' },
      { id: 'korea', label: '韩国动画' },
    ],
    source: {
      name: 'Bangumi 番组计划',
      url: 'https://bgm.tv/anime/browser',
      calendarUrl: 'https://bgm.tv/calendar',
      apiUrl: `${API_ROOT}/v0/subjects`,
      note: '季度按日本动画常用的 1月、4月、7月、10月档划分；全部季度评分每日刷新，当前季度同时合并每日放送目录，下一季度同步新收录条目。',
    },
    quarterCount: quarters.length,
    quarters,
  }

  await writeBangumiShards(payload, outputPath)
  const subjectCount = quarters.reduce((sum, quarter) => sum + quarter.count, 0)
  console.log(`已同步 ${quarters.length} 个季度、${subjectCount} 条高分动画记录：${outputPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
