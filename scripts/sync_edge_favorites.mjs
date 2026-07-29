import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const valueOf = (flag, fallback) => {
  const index = args.indexOf(flag)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const profile = valueOf('--profile', process.env.EDGE_PROFILE || 'Default')
const source = valueOf(
  '--source',
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data', profile, 'Bookmarks'),
)
const output = valueOf('--out', path.join(repoRoot, 'public', 'materials', 'favorites.json'))

if (!fs.existsSync(source)) {
  throw new Error(`未找到 Edge 收藏夹：${source}`)
}

const sensitiveParams = new Set([
  'access_token', 'auth', 'authorization', 'client_secret', 'code', 'credential',
  'key', 'password', 'refresh_token', 'session', 'sid', 'signature', 'ticket', 'token',
])

function safeUrl(raw) {
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    url.username = ''
    url.password = ''
    for (const key of [...url.searchParams.keys()]) {
      if (sensitiveParams.has(key.toLowerCase())) url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return null
  }
}

function readBookmarksWithRetry(file, attempts = 4) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

const sourceData = readBookmarksWithRetry(source)
const categories = new Map()
const seen = new Set()

function addBookmark(category, node) {
  const url = safeUrl(node.url)
  if (!url) return
  const name = String(node.name || new URL(url).hostname).trim()
  const key = `${name}\n${url}`
  if (seen.has(key)) return
  seen.add(key)
  if (!categories.has(category)) categories.set(category, [])
  categories.get(category).push({ name, url })
}

function walk(node, trail) {
  if (!node) return
  if (node.type === 'url') {
    addBookmark(trail.join(' / ') || '未分类', node)
    return
  }

  const nextTrail = node.name && node.name !== 'root' ? [...trail, node.name] : trail
  for (const child of node.children || []) walk(child, nextTrail)
}

const roots = [
  ['收藏夹栏', sourceData.roots?.bookmark_bar],
  ['其他收藏夹', sourceData.roots?.other],
  ['移动设备收藏夹', sourceData.roots?.synced],
]

for (const [label, root] of roots) {
  if (!root) continue
  for (const child of root.children || []) {
    if (child.type === 'url') addBookmark(label, child)
    else walk(child, [label])
  }
}

const result = [...categories.entries()]
  .filter(([, items]) => items.length)
  .map(([category, items]) => ({ category, items }))

fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(`Edge 收藏夹同步完成：${result.length} 个分类，${seen.size} 条链接（${profile}）`)
