import { execFile } from 'node:child_process'
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const repoRoot = resolve(import.meta.dirname, '..', '..')
const defaultLyricsSource = 'D:\\暑期文件夹\\日语歌词'
const defaultGameSource = 'D:\\暑期文件夹\\游戏文件夹\\mvz\\mechanical-frontier'
const lyricsSource = resolve(process.env.LYRICS_SOURCE || defaultLyricsSource)
const gameSource = resolve(process.env.MVZ_SOURCE || defaultGameSource)
const lyricsOutput = resolve(repoRoot, 'public', 'lyrics', 'index.json')
const gameOutput = resolve(repoRoot, 'public', 'games', 'mvz')
const lyricsOnly = process.argv.includes('--lyrics-only')
const gameOnly = process.argv.includes('--game-only')

function assertInsideRepo(targetPath) {
  const relativePath = relative(repoRoot, targetPath)
  if (!relativePath || relativePath.startsWith(`..${sep}`) || relativePath === '..') {
    throw new Error(`Refusing to write outside the website repository: ${targetPath}`)
  }
}

async function assertDirectory(directory, label) {
  const info = await stat(directory).catch(() => null)
  if (!info?.isDirectory()) throw new Error(`${label} does not exist: ${directory}`)
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => {
    const entryPath = join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath]
  }))
  return nested.flat()
}

function songNumber(name) {
  return Number(name.match(/^(\d+)\./)?.[1] || Number.MAX_SAFE_INTEGER)
}

function songTitle(name) {
  return name.replace(/^\d+\./, '').trim()
}

function documentKind(fileName) {
  if (/_歌词分析\.md$/u.test(fileName)) return { kind: 'analysis', label: '歌词解析' }
  if (/_(?:日语|英语)学习\.md$/u.test(fileName)) return { kind: 'study', label: '跟唱学习' }
  if (/节拍|节奏谱/u.test(fileName)) return { kind: 'rhythm', label: '节拍与连读' }
  return { kind: 'lyrics', label: '歌词' }
}

function selectPrimary(files, folderTitle) {
  const lyrics = files.filter(file => documentKind(file).kind === 'lyrics')
  return lyrics.find(file => basename(file, '.md') === folderTitle)
    || lyrics.find(file => /歌词\.md$/u.test(file))
    || lyrics[0]
    || files[0]
}

async function syncLyrics() {
  await assertDirectory(lyricsSource, 'Lyrics source')
  const folders = (await readdir(lyricsSource, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && /^\d+\./.test(entry.name))
    .sort((left, right) => songNumber(left.name) - songNumber(right.name))

  const songs = []
  for (const folder of folders) {
    const folderPath = join(lyricsSource, folder.name)
    const files = (await readdir(folderPath, { withFileTypes: true }))
      .filter(entry => entry.isFile() && extname(entry.name).toLowerCase() === '.md')
      .map(entry => entry.name)
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))

    if (!files.length) continue
    const title = songTitle(folder.name)
    const primary = selectPrimary(files, title)
    const documents = await Promise.all(files.map(async fileName => {
      const content = (await readFile(join(folderPath, fileName), 'utf8'))
        .replace(/^\uFEFF/, '')
        .replace(/\r\n?/g, '\n')
        .trim()
      const meta = documentKind(fileName)
      return {
        id: fileName,
        title: basename(fileName, '.md'),
        ...meta,
        content,
      }
    }))

    songs.push({
      id: String(songNumber(folder.name)),
      order: songNumber(folder.name),
      title,
      nativeTitle: basename(primary, '.md'),
      primaryDocumentId: primary,
      sourceFolder: folder.name,
      documents,
    })
  }

  assertInsideRepo(lyricsOutput)
  await mkdir(dirname(lyricsOutput), { recursive: true })
  await writeFile(lyricsOutput, `${JSON.stringify({ songs }, null, 2)}\n`, 'utf8')
  console.log(`Synced ${songs.length} songs and ${songs.reduce((total, song) => total + song.documents.length, 0)} lyric documents`)
}

async function syncGame() {
  await assertDirectory(gameSource, 'MVZ Web source')
  const buildCommand = process.platform === 'win32'
    ? [process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe', ['/d', '/s', '/c', 'npm run build -- --base=/games/mvz/']]
    : ['npm', ['run', 'build', '--', '--base=/games/mvz/']]
  await execFileAsync(buildCommand[0], buildCommand[1], {
    cwd: gameSource,
    maxBuffer: 8 * 1024 * 1024,
  })

  const builtGame = join(gameSource, 'dist')
  await assertDirectory(builtGame, 'Built MVZ game')
  assertInsideRepo(gameOutput)
  if (basename(gameOutput) !== 'mvz') throw new Error(`Unexpected game output path: ${gameOutput}`)
  await rm(gameOutput, { recursive: true, force: true })
  await mkdir(gameOutput, { recursive: true })
  await cp(builtGame, gameOutput, { recursive: true })

  const builtFiles = await collectFiles(gameOutput)
  const textFiles = builtFiles.filter(file => ['.css', '.html', '.js'].includes(extname(file)))
  const builtText = (await Promise.all(textFiles.map(file => readFile(file, 'utf8')))).join('\n')
  if (/(?:["'(]|url\()\/assets\//.test(builtText)) {
    throw new Error('MVZ build still contains root /assets/ paths; expected /games/mvz/assets/')
  }

  // Remove superseded atlases only while the current bundle does not reference them.
  for (const legacyAsset of ['battlefield.png', 'unit-atlas.png']) {
    if (!builtText.includes(legacyAsset)) await rm(join(gameOutput, 'assets', legacyAsset), { force: true })
  }
  console.log('Built and synced Mechanical Frontier Web edition')
}

if (!gameOnly) await syncLyrics()
if (!lyricsOnly) await syncGame()
