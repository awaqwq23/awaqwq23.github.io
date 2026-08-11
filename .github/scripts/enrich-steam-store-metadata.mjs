import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const outputPath = 'public/materials/steam-library.json'
const curlCommand = process.platform === 'win32' ? 'curl.exe' : 'curl'

function toStoreInfo(data) {
  return {
    type: data.type || null,
    isFree: Boolean(data.is_free),
    categoryIds: (data.categories || []).map(category => category.id),
    genreIds: (data.genres || []).map(genre => String(genre.id)),
  }
}

async function fetchWithCurl(appid) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic,categories,genres&l=english&cc=US`
  try {
    const { stdout } = await execFileAsync(curlCommand, [
      '--compressed', '-sS', '-L', '--connect-timeout', '8', '--max-time', '20',
      '--retry', '1', '-H', 'User-Agent: awaqwq233.github.io Steam library metadata tool', url,
    ], { maxBuffer: 2 * 1024 * 1024, timeout: 45000 })
    const data = JSON.parse(stdout)[String(appid)]?.data
    return data ? toStoreInfo(data) : null
  } catch (error) {
    console.warn(`Skipped ${appid}: ${error.message.split('\n')[0]}`)
    return null
  }
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Map()
  let cursor = 0
  let completed = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      const result = await callback(item)
      if (result) results.set(Number(item.appid), result)
      completed += 1
      if (completed % 25 === 0 || completed === items.length) console.log(`Checked ${completed}/${items.length}`)
    }
  })
  await Promise.all(workers)
  return results
}

const library = JSON.parse(await readFile(outputPath, 'utf8'))
const missingGames = library.games.filter(game => !game.storeInfo)
const storeInfo = await mapWithConcurrency(missingGames, 8, game => fetchWithCurl(game.appid))

library.games = library.games.map(game => ({
  ...game,
  storeInfo: game.storeInfo || storeInfo.get(Number(game.appid)) || undefined,
}))

await writeFile(outputPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8')
console.log(`Added Steam Store metadata to ${storeInfo.size}/${missingGames.length} games`)
