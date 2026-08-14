const naturalSort = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

function toMediaEntries(modules) {
  return Object.entries(modules)
    .map(([path, src]) => ({
      src,
      name: path.split('/').pop(),
    }))
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

export const shinozawaImages = toMediaEntries(shinozawaModules)
export const personalImages = toMediaEntries(personalModules)
