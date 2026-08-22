import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..', '..')
const defaultInput = join(projectRoot, 'public', 'data', 'bangumi-airing.json')

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export async function writeBangumiShards(payload, legacyOutputPath = defaultInput) {
  const dataDirectory = dirname(legacyOutputPath)
  const quarterSummaries = (payload.quarters || []).map(({ subjects, ...quarter }) => quarter)
  const years = [...new Set(quarterSummaries.map(quarter => quarter.year))].sort((left, right) => right - left)
  const meta = {
    ...payload,
    quarters: undefined,
    years,
    quarterSummaries,
  }
  delete meta.quarters

  const uniqueSubjects = new Map()
  for (const quarter of payload.quarters || []) {
    for (const subject of quarter.subjects || []) {
      const previous = uniqueSubjects.get(subject.id)
      uniqueSubjects.set(subject.id, previous ? { ...previous, ...subject, isAiring: previous.isAiring || subject.isAiring } : subject)
    }
  }
  const subjectIndex = [...uniqueSubjects.values()].map(subject => ({
    id: subject.id,
    title: subject.title,
    originalTitle: subject.originalTitle,
    score: subject.score,
    url: subject.url,
    airDate: subject.airDate,
    totalEpisodes: subject.totalEpisodes,
    platform: subject.platform,
  }))

  await mkdir(dataDirectory, { recursive: true })
  await Promise.all([
    writeFile(legacyOutputPath, json(payload), 'utf8'),
    writeFile(join(dataDirectory, 'bangumi-airing-meta.json'), json(meta), 'utf8'),
    writeFile(join(dataDirectory, 'bangumi-subject-index.json'), json({ schemaVersion: 1, syncedAt: payload.syncedAt, subjects: subjectIndex }), 'utf8'),
    ...years.map(year => writeFile(join(dataDirectory, `bangumi-airing-${year}.json`), json({
      schemaVersion: payload.schemaVersion,
      syncedAt: payload.syncedAt,
      year,
      quarters: payload.quarters.filter(quarter => quarter.year === year),
    }), 'utf8')),
  ])
  return { years, subjectCount: subjectIndex.length }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const inputPath = resolve(process.argv[2] || defaultInput)
  const payload = JSON.parse(await readFile(inputPath, 'utf8'))
  const result = await writeBangumiShards(payload, inputPath)
  console.log(`已拆分 ${result.years.length} 个年份、${result.subjectCount} 个唯一条目`)
}
