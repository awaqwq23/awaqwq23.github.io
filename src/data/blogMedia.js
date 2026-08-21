const naturalSort = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })
const docsPrefix = '../../docs/'

function thumbnailName(fileName) {
  return `thumb-${fileName.replaceAll('.', '-')}.webp`
}

const characterModules = import.meta.glob(
  '../../docs/charactor/**/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true, query: '?url', import: 'default' },
)

const pictureModules = import.meta.glob(
  '../../docs/pictures/**/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true, query: '?url', import: 'default' },
)

const thumbnailModules = import.meta.glob(
  '../../docs/.gallery-thumbnails/**/*.webp',
  { eager: true, query: '?url', import: 'default' },
)

const articleModules = import.meta.glob(
  '../../docs/charactor/**/*.md',
  { eager: true, query: '?raw', import: 'default' },
)

function thumbnailFor(path, fileName) {
  const relativePath = path.slice(docsPrefix.length)
  const sourceDirectory = relativePath.split('/').slice(0, -1).join('/')
  const mirroredPath = `${docsPrefix}.gallery-thumbnails/${sourceDirectory}/${thumbnailName(fileName)}`
  if (thumbnailModules[mirroredPath]) return thumbnailModules[mirroredPath]

  if (relativePath.startsWith('charactor/筱泽广 学马仕/图片/')) {
    return thumbnailModules[`${docsPrefix}.gallery-thumbnails/shinozawa/${thumbnailName(fileName)}`]
  }
  if (relativePath.startsWith('pictures/personalgirl/')) {
    return thumbnailModules[`${docsPrefix}.gallery-thumbnails/personal/${thumbnailName(fileName)}`]
  }
  return undefined
}

function toMediaEntry(path, src) {
  const name = path.split('/').pop()
  return {
    src,
    thumbnailSrc: thumbnailFor(path, name) || src,
    name,
  }
}

function groupCharacterMedia(modules) {
  const catalog = {}
  Object.entries(modules).forEach(([path, src]) => {
    const parts = path.slice(`${docsPrefix}charactor/`.length).split('/')
    if (parts.length < 3) return
    const [folder, collection] = parts
    catalog[folder] ||= {}
    catalog[folder][collection] ||= []
    catalog[folder][collection].push(toMediaEntry(path, src))
  })

  Object.values(catalog).forEach(collections => {
    Object.values(collections).forEach(images => images.sort((left, right) => naturalSort.compare(left.name, right.name)))
  })
  return catalog
}

function groupPictureMedia(modules) {
  const catalog = {}
  Object.entries(modules).forEach(([path, src]) => {
    const parts = path.slice(`${docsPrefix}pictures/`.length).split('/')
    if (parts.length < 2) return
    const album = parts[0]
    catalog[album] ||= []
    catalog[album].push(toMediaEntry(path, src))
  })
  Object.values(catalog).forEach(images => images.sort((left, right) => naturalSort.compare(left.name, right.name)))
  return catalog
}

function groupCharacterArticles(modules) {
  const catalog = {}
  Object.entries(modules)
    .sort(([left], [right]) => naturalSort.compare(left, right))
    .forEach(([path, markdown]) => {
      const folder = path.slice(`${docsPrefix}charactor/`.length).split('/')[0]
      catalog[folder] ||= []
      catalog[folder].push(markdown)
    })
  return catalog
}

export const characterMedia = groupCharacterMedia(characterModules)
export const pictureMedia = groupPictureMedia(pictureModules)
export const characterArticles = groupCharacterArticles(articleModules)
