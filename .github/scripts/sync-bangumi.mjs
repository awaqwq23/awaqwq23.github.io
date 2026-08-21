import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..', '..')
const outputPath = join(projectRoot, 'public', 'data', 'bangumi-airing.json')
const API_ROOT = 'https://api.bgm.tv'
const SCORE_THRESHOLD = 7
const USER_AGENT = 'awaqwq233.github.io/2.0 (https://github.com/awaqwq23/awaqwq23.github.io)'
const execFileAsync = promisify(execFile)

const sleep = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds))

async function fetchJsonWithCurl(url) {
  const { stdout } = await execFileAsync('curl', [
    '--fail',
    '--silent',
    '--show-error',
    '--location',
    '--retry', '3',
    '--connect-timeout', '20',
    '--max-time', '60',
    '--header', 'Accept: application/json',
    '--user-agent', USER_AGENT,
    url,
  ], { maxBuffer: 10 * 1024 * 1024 })
  return JSON.parse(stdout)
}

async function fetchJson(url) {
  if (process.env.https_proxy || process.env.HTTPS_PROXY) return fetchJsonWithCurl(url)
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
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
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : ''
}

async function fetchDetails(item) {
  try {
    const details = await fetchJson(`${API_ROOT}/v0/subjects/${item.id}`)
    return {
      summary: normalizeSummary(details.summary || item.summary),
      platform: details.platform || null,
      totalEpisodes: details.total_episodes || details.eps || item.eps || null,
      tags: (details.tags || []).slice(0, 5).map(tag => tag.name),
      rating: details.rating || item.rating,
      rank: details.rating?.rank || item.rank || null,
    }
  } catch (error) {
    console.warn(`条目 ${item.id} 详情读取失败，使用日历数据：${error.message}`)
    return {
      summary: normalizeSummary(item.summary),
      platform: null,
      totalEpisodes: item.eps || item.eps_count || null,
      tags: [],
      rating: item.rating,
      rank: item.rank || null,
    }
  }
}

async function main() {
  const calendar = await fetchJson(`${API_ROOT}/calendar`)
  const seen = new Set()
  const candidates = calendar.flatMap(day => (day.items || []).map(item => ({
    ...item,
    weekday: day.weekday,
  })))
    .filter(item => item.type === 2 && Number(item.rating?.score) > SCORE_THRESHOLD)
    .filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })

  const subjects = []
  for (const item of candidates) {
    const details = await fetchDetails(item)
    const score = Number(details.rating?.score || 0)
    if (score > SCORE_THRESHOLD) {
      subjects.push({
        id: item.id,
        title: item.name_cn || item.name,
        originalTitle: item.name,
        summary: details.summary,
        airDate: item.air_date || null,
        weekday: item.weekday,
        score,
        scoreCount: details.rating?.total || 0,
        rank: details.rank,
        watchingCount: item.collection?.doing || 0,
        platform: details.platform,
        totalEpisodes: details.totalEpisodes,
        tags: details.tags,
        image: httpsUrl(item.images?.large || item.images?.common),
        url: `https://bgm.tv/subject/${item.id}`,
      })
    }
    await sleep(380)
  }

  subjects.sort((left, right) => right.score - left.score || (left.rank || Number.MAX_SAFE_INTEGER) - (right.rank || Number.MAX_SAFE_INTEGER))

  const payload = {
    syncedAt: new Date().toISOString(),
    scoreThreshold: SCORE_THRESHOLD,
    source: {
      name: 'Bangumi 番组计划',
      url: 'https://bgm.tv/calendar',
      apiUrl: `${API_ROOT}/calendar`,
      note: '依据 Bangumi 每日放送目录筛选当前连载动画；评分会随用户评价实时变化。',
    },
    count: subjects.length,
    subjects,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`已同步 ${subjects.length} 部 Bangumi 评分高于 ${SCORE_THRESHOLD} 分的连载动画：${outputPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
