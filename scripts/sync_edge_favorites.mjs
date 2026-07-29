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
let linkCount = 0
let folderCount = 0

function bookmarkFromNode(node) {
  const url = safeUrl(node.url)
  if (!url) return null
  const name = String(node.name || new URL(url).hostname).trim()
  linkCount += 1
  return { name, url }
}

function folderFromNode(node, fallbackName) {
  folderCount += 1
  const folder = {
    name: String(node?.name || fallbackName || '未命名文件夹').trim(),
    items: [],
    folders: [],
  }
  for (const child of node?.children || []) {
    if (child.type === 'url') {
      const bookmark = bookmarkFromNode(child)
      if (bookmark) folder.items.push(bookmark)
    } else if (child.type === 'folder') {
      folder.folders.push(folderFromNode(child))
    }
  }
  return folder
}

const roots = [
  ['收藏夹栏', sourceData.roots?.bookmark_bar],
  ['其他收藏夹', sourceData.roots?.other],
  ['移动设备收藏夹', sourceData.roots?.synced],
]

const tree = []
for (const [label, root] of roots) {
  if (!root || !(root.children || []).length) continue
  tree.push(folderFromNode(root, label))
  tree[tree.length - 1].name = label
}

const result = {
  profile,
  folderCount,
  linkCount,
  roots: tree,
}

fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(`Edge 收藏夹同步完成：${folderCount} 个文件夹，${linkCount} 条链接（${profile}）`)
