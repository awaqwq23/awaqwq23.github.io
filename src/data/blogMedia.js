const naturalSort = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

function thumbnailName(fileName) {
  return `thumb-${fileName.replaceAll('.', '-')}.webp`
}

function toMediaEntries(modules, thumbnailModules) {
  const thumbnails = new Map(
    Object.entries(thumbnailModules).map(([path, src]) => [path.split('/').pop(), src]),
  )

  return Object.entries(modules)
    .map(([path, src]) => {
      const name = path.split('/').pop()
      return {
        src,
        thumbnailSrc: thumbnails.get(thumbnailName(name)) || src,
        name,
      }
    })
    .sort((a, b) => naturalSort.compare(a.name, b.name))
}

const shinozawaModules = import.meta.glob(
  '../../docs/charactor/筱泽广 学马仕/图片/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true, query: '?url', import: 'default' },
)

const personalModules = import.meta.glob(
  '../../docs/pictures/personalgirl/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true, query: '?url', import: 'default' },
)

const shinozawaThumbnailModules = import.meta.glob(
  '../../docs/.gallery-thumbnails/shinozawa/*.webp',
  { eager: true, query: '?url', import: 'default' },
)

const personalThumbnailModules = import.meta.glob(
  '../../docs/.gallery-thumbnails/personal/*.webp',
  { eager: true, query: '?url', import: 'default' },
)

export const shinozawaImages = toMediaEntries(shinozawaModules, shinozawaThumbnailModules)
export const personalImages = toMediaEntries(personalModules, personalThumbnailModules)
