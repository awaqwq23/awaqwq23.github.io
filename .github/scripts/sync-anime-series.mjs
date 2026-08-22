import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..', '..')
const trackerPath = join(projectRoot, 'public', 'data', 'anime-tracker.json')
const indexPath = join(projectRoot, 'public', 'data', 'bangumi-subject-index.json')
const outputPath = join(projectRoot, 'public', 'data', 'anime-series-catalog.json')
const API_ROOT = 'https://api.bgm.tv'
const USER_AGENT = 'awaqwq233.github.io/2.0 (https://github.com/awaqwq23/awaqwq23.github.io)'
const REQUEST_CONCURRENCY = 5
const FOLLOW_RELATIONS = new Set(['续集', '前传', '番外篇', '主线故事', '衍生', '总集篇', '不同演绎'])
const VERIFIED_ENTRY_SEEDS = new Map([['154963', 397604]])
const execFileAsync = promisify(execFile)

const sleep = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds))

function normalizeTitle(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('zh-CN')
    .replace(/[\s\-—–:：·・!！?？'"“”‘’\[\]()（）【】~～]/g, '')
}

function aliases(subject) {
  const values = [subject?.title, subject?.originalTitle, subject?.name, subject?.name_cn]
  const aliasBox = (subject?.infobox || []).find(item => item.key === '别名')
  if (Array.isArray(aliasBox?.value)) values.push(...aliasBox.value.map(item => item?.v || item))
  return [...new Set(values.filter(Boolean))]
}

async function fetchJsonWithCurl(url, options = {}) {
  const args = [
    '--fail', '--silent', '--show-error', '--location', '--retry', '1', '--retry-all-errors',
    '--connect-timeout', '8', '--max-time', '18', '--header', 'Accept: application/json',
    '--user-agent', USER_AGENT,
  ]
  if (options.method === 'POST') {
    args.push('--request', 'POST', '--header', 'Content-Type: application/json', '--data-binary', options.body || '{}')
  }
  args.push(url)
  const { stdout } = await execFileAsync('curl', args, { maxBuffer: 16 * 1024 * 1024 })
  return JSON.parse(stdout)
}

async function fetchJson(url, options = {}) {
  if (process.env.https_proxy || process.env.HTTPS_PROXY) return fetchJsonWithCurl(url, options)
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30_000),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': USER_AGENT, ...options.headers },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleep(500 * attempt)
    }
  }
  try {
    return await fetchJsonWithCurl(url, options)
  } catch {
    throw lastError
  }
}

function titleScore(expected, subject) {
  const targets = expected.map(normalizeTitle).filter(Boolean)
  const candidates = aliases(subject).map(normalizeTitle).filter(Boolean)
  let score = 0
  for (const target of targets) {
    for (const candidate of candidates) {
      if (target === candidate) score = Math.max(score, 100)
      else if (target.length >= 4 && (target.includes(candidate) || candidate.includes(target))) score = Math.max(score, 65 - Math.abs(target.length - candidate.length))
    }
  }
  return score + Math.min(10, Math.log10(Number(subject?.rating?.total || 0) + 1) * 2)
}

async function resolveSeed(entry, indexSubjects) {
  if (VERIFIED_ENTRY_SEEDS.has(String(entry.id))) return VERIFIED_ENTRY_SEEDS.get(String(entry.id))
  if (Number.isInteger(Number(entry.bangumiId)) && Number(entry.bangumiId) > 0) return Number(entry.bangumiId)
  const expected = [entry.subtitle, entry.title, entry.sourceTitle].filter(Boolean)
  const indexed = indexSubjects.map(subject => ({ subject, score: titleScore(expected, subject) }))
    .filter(item => item.score >= 65).sort((left, right) => right.score - left.score)[0]
  if (indexed?.score >= 100) return Number(indexed.subject.id)

  for (const keyword of expected.slice(0, 2)) {
    try {
      const result = await fetchJson(`${API_ROOT}/v0/search/subjects?limit=12`, {
        method: 'POST', body: JSON.stringify({ keyword, sort: 'match', filter: { type: [2] } }),
      })
      const match = (result.data || []).map(subject => ({ subject, score: titleScore(expected, subject) }))
        .sort((left, right) => right.score - left.score)[0]
      if (match?.score >= 58) return Number(match.subject.id)
    } catch (error) {
      console.warn(`Bangumi 搜索失败（${keyword}）：${error.message}`)
    }
    await sleep(90)
  }
  return indexed?.score >= 58 ? Number(indexed.subject.id) : null
}

function unionFind() {
  const parents = new Map()
  const find = value => {
    if (!parents.has(value)) parents.set(value, value)
    let root = value
    while (parents.get(root) !== root) root = parents.get(root)
    while (parents.get(value) !== value) {
      const next = parents.get(value)
      parents.set(value, root)
      value = next
    }
    return root
  }
  const unite = (left, right) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parents.set(rightRoot, leftRoot)
  }
  return { parents, find, unite }
}

function totalEpisodes(subject) {
  const value = Number(subject.total_episodes || subject.eps || subject.eps_count || 0)
  return Number.isFinite(value) && value > 0 ? value : null
}

function httpsUrl(value) {
  return typeof value === 'string' ? value.replace(/^http:\/\//, 'https://') : null
}

function cleanSeriesTitle(value) {
  return String(value || '').replace(/(?:\s*[第 ]?[一二三四五六七八九十0-9ⅢⅡⅠ]+(?:季|期|部|篇)|\s+Season\s*\d+|\s+第\d+クール).*$/i, '').trim()
}

function normalizeMember(subject, relations, airingIds) {
  const airDate = subject.date || subject.air_date || null
  const startTime = airDate ? new Date(`${airDate}T00:00:00+08:00`).getTime() : 0
  const future = startTime > Date.now()
  const episodes = totalEpisodes(subject)
  const estimatedEndTime = startTime && episodes ? startTime + Math.max(0, episodes - 1) * 7 * 864e5 : 0
  const recentlyStartedTv = ['TV', 'WEB'].includes(subject.platform) && startTime > 0 && Date.now() - startTime < 120 * 864e5
  const isAiring = airingIds.has(Number(subject.id)) || (!future && (estimatedEndTime >= Date.now() - 7 * 864e5 || (!episodes && recentlyStartedTv)))
  const score = Number(subject.rating?.score || subject.score || 0)
  return {
    id: Number(subject.id),
    type: 2,
    title: subject.name_cn || subject.name,
    originalTitle: subject.name || '',
    aliases: aliases(subject),
    platform: subject.platform || '动画',
    airDate,
    totalEpisodes: episodes,
    score: score > 0 ? score : null,
    image: httpsUrl(subject.images?.large || subject.images?.common || subject.image),
    url: `https://bgm.tv/subject/${subject.id}`,
    status: isAiring ? 'RELEASING' : future ? 'NOT_YET_RELEASED' : 'FINISHED',
    relations: relations.filter(item => Number(item.type) === 2 && FOLLOW_RELATIONS.has(item.relation)).map(item => ({
      id: Number(item.id), relation: item.relation,
    })),
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

async function main() {
  const tracker = JSON.parse(await readFile(trackerPath, 'utf8'))
  const indexPayload = JSON.parse(await readFile(indexPath, 'utf8'))
  const indexSubjects = indexPayload.subjects || []
  const entries = tracker.entries || []
  const seedRows = await mapLimit(entries, REQUEST_CONCURRENCY, async (entry, index) => {
    const seedId = await resolveSeed(entry, indexSubjects)
    console.log(`匹配 ${index + 1}/${entries.length}：${entry.title}${seedId ? ` → ${seedId}` : '（未找到动画）'}`)
    return { entryId: String(entry.id), seedId }
  })

  const details = new Map()
  const relationMap = new Map()
  const queue = [...new Set(seedRows.map(row => row.seedId).filter(Boolean))]
  const queued = new Set(queue)
  let cursor = 0
  while (cursor < queue.length) {
    const batch = queue.slice(cursor, cursor + REQUEST_CONCURRENCY)
    cursor += batch.length
    await mapLimit(batch, REQUEST_CONCURRENCY, async id => {
      try {
        const [subject, relations] = await Promise.all([
          fetchJson(`${API_ROOT}/v0/subjects/${id}`),
          fetchJson(`${API_ROOT}/v0/subjects/${id}/subjects`),
        ])
        if (Number(subject.type) !== 2) return
        details.set(id, subject)
        const animeRelations = (relations || []).filter(item => Number(item.type) === 2 && FOLLOW_RELATIONS.has(item.relation))
        relationMap.set(id, animeRelations)
        for (const related of animeRelations) {
          const relatedId = Number(related.id)
          if (!queued.has(relatedId)) { queued.add(relatedId); queue.push(relatedId) }
        }
      } catch (error) {
        console.warn(`动画条目 ${id} 读取失败：${error.message}`)
      }
      await sleep(80)
    })
    console.log(`系列图谱：${Math.min(cursor, queue.length)}/${queue.length}`)
  }

  const airingIds = new Set(indexSubjects.filter(subject => subject.isAiring).map(subject => Number(subject.id)))
  const graph = unionFind()
  for (const [id, relations] of relationMap) {
    graph.find(id)
    for (const related of relations) if (details.has(Number(related.id))) graph.unite(id, Number(related.id))
  }
  const components = new Map()
  for (const id of details.keys()) {
    const root = graph.find(id)
    if (!components.has(root)) components.set(root, [])
    components.get(root).push(id)
  }
  const entriesByRoot = new Map()
  for (const row of seedRows) {
    if (!row.seedId || !details.has(row.seedId)) continue
    const root = graph.find(row.seedId)
    if (!entriesByRoot.has(root)) entriesByRoot.set(root, [])
    entriesByRoot.get(root).push({ entryId: row.entryId, seedId: row.seedId })
  }

  const series = [...components.entries()].filter(([root]) => entriesByRoot.has(root)).map(([root, ids]) => {
    const members = ids.map(id => normalizeMember(details.get(id), relationMap.get(id) || [], airingIds))
      .sort((left, right) => String(left.airDate || '9999').localeCompare(String(right.airDate || '9999')) || left.id - right.id)
    const primary = members.find(member => member.platform === 'TV') || members[0]
    const title = cleanSeriesTitle(primary.title) || primary.title
    return {
      id: `bgm-series-${Math.min(...ids)}`,
      title,
      sourceEntryIds: [...new Set(entriesByRoot.get(root).map(item => item.entryId))],
      sourceLinks: entriesByRoot.get(root),
      memberCount: members.length,
      members,
    }
  }).sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'))

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      name: 'Bangumi 番组计划',
      url: 'https://bgm.tv/anime/browser',
      apiUrl: `${API_ROOT}/v0/subjects/{id}/subjects`,
      rule: '从个人番单匹配动画种子，递归遍历前传、续集、番外篇、主线故事、衍生、总集篇和不同演绎关系；仅保留 Bangumi type=2 的动画条目。',
    },
    matchedEntryCount: seedRows.filter(row => row.seedId).length,
    unmatchedEntryIds: seedRows.filter(row => !row.seedId).map(row => row.entryId),
    seriesCount: series.length,
    animationCount: series.reduce((sum, item) => sum + item.members.length, 0),
    series,
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`已生成 ${series.length} 个系列、${payload.animationCount} 个动画条目：${outputPath}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exitCode = 1
})
