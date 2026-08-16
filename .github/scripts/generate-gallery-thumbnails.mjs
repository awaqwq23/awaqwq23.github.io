import { mkdir, readdir, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import sharp from 'sharp'

const THUMBNAIL_WIDTH = 640
const THUMBNAIL_QUALITY = 76
const ANIMATED_THUMBNAIL_WIDTH = 320
const ANIMATED_THUMBNAIL_QUALITY = 55
const CONCURRENCY = 3
const FORCE = process.argv.includes('--force')
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'])

const galleries = [
  {
    source: resolve('docs/charactor/筱泽广 学马仕/图片'),
    output: resolve('docs/.gallery-thumbnails/shinozawa'),
  },
  {
    source: resolve('docs/pictures/personalgirl'),
    output: resolve('docs/.gallery-thumbnails/personal'),
  },
]

function thumbnailName(fileName) {
  return `thumb-${fileName.replaceAll('.', '-')}.webp`
}

async function isCurrent(sourcePath, outputPath) {
  try {
    const [sourceInfo, outputInfo] = await Promise.all([stat(sourcePath), stat(outputPath)])
    return outputInfo.size > 0 && outputInfo.mtimeMs >= sourceInfo.mtimeMs
  } catch {
    return false
  }
}

async function generateThumbnail(sourcePath, outputPath) {
  if (!FORCE && await isCurrent(sourcePath, outputPath)) return false

  const animated = extname(sourcePath).toLowerCase() === '.gif'

  await sharp(sourcePath, { animated: true })
    .rotate()
    .resize({ width: animated ? ANIMATED_THUMBNAIL_WIDTH : THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: animated ? ANIMATED_THUMBNAIL_QUALITY : THUMBNAIL_QUALITY, effort: 4, smartSubsample: true })
    .toFile(outputPath)
  return true
}

async function mapWithConcurrency(items, callback) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await callback(item)
    }
  })
  await Promise.all(workers)
}

let generated = 0
let total = 0

for (const gallery of galleries) {
  await mkdir(gallery.output, { recursive: true })
  const files = (await readdir(gallery.source, { withFileTypes: true }))
    .filter(entry => entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map(entry => ({
      sourcePath: join(gallery.source, entry.name),
      outputPath: join(gallery.output, thumbnailName(entry.name)),
    }))

  total += files.length
  await mapWithConcurrency(files, async file => {
    if (await generateThumbnail(file.sourcePath, file.outputPath)) generated += 1
  })
}

console.log(`Gallery thumbnails ready: ${total} total, ${generated} generated`)
