import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..', '..')
const postsDirectory = join(projectRoot, 'public', 'blog', 'posts')

const imports = [
  {
    source: '番.docx',
    slug: 'anime-list-and-reviews',
    title: '番',
    date: '2026-06-03',
    tags: ['番剧', '追番', '观后感'],
  },
]

function readZipEntry(archive, wantedName) {
  let eocd = -1
  for (let offset = archive.length - 22; offset >= Math.max(0, archive.length - 65_558); offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset
      break
    }
  }
  if (eocd < 0) throw new Error('DOCX 中没有找到 ZIP 目录')

  const entryCount = archive.readUInt16LE(eocd + 10)
  let cursor = archive.readUInt32LE(eocd + 16)
  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(cursor) !== 0x02014b50) throw new Error('DOCX ZIP 目录损坏')
    const method = archive.readUInt16LE(cursor + 10)
    const compressedSize = archive.readUInt32LE(cursor + 20)
    const fileNameLength = archive.readUInt16LE(cursor + 28)
    const extraLength = archive.readUInt16LE(cursor + 30)
    const commentLength = archive.readUInt16LE(cursor + 32)
    const localOffset = archive.readUInt32LE(cursor + 42)
    const fileName = archive.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8')

    if (fileName === wantedName) {
      if (archive.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('DOCX ZIP 文件头损坏')
      const localNameLength = archive.readUInt16LE(localOffset + 26)
      const localExtraLength = archive.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + localNameLength + localExtraLength
      const compressed = archive.subarray(dataStart, dataStart + compressedSize)
      if (method === 0) return compressed
      if (method === 8) return inflateRawSync(compressed)
      throw new Error(`暂不支持 DOCX 压缩方式 ${method}`)
    }
    cursor += 46 + fileNameLength + extraLength + commentLength
  }
  throw new Error(`DOCX 中缺少 ${wantedName}`)
}

function decodeXml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

function encodeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function extractParagraphs(documentXml) {
  const body = documentXml.match(/<w:body(?:\s[^>]*)?>([\s\S]*?)<\/w:body>/)?.[1] || ''
  return [...body.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map(match => {
    const content = match[1]
    const tokens = [...content.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab(?:\s[^>]*)?\/>|<w:(?:br|cr)(?:\s[^>]*)?\/>/g)]
    return tokens.map(token => {
      if (token[1] != null) return decodeXml(token[1])
      return token[0].startsWith('<w:tab') ? '\t' : '\n'
    }).join('')
  })
}

function excerptFrom(paragraphs) {
  const text = paragraphs.join(' ').replace(/\s+/g, ' ').trim()
  if (text.length <= 88) return text
  return `${text.slice(0, 88).replace(/[ ，。、；：]+$/u, '')}……`
}

const sectionHeadings = new Set([
  '正在看（or没看完）：', '想看', '他人推荐', '已看', '想二刷', '已二刷', '已放弃',
  '已推的gal', '正在推的gal', '想玩的gal', '已看：',
])

function bodyHtmlFrom(paragraphs) {
  return paragraphs.flatMap(paragraph => {
    const plain = paragraph.trim()
    if (!plain) return []
    const html = encodeHtml(paragraph).replaceAll('\t', '&emsp;').replaceAll('\n', '<br>')
    if (sectionHeadings.has(plain)) return [`        <h2>${html}</h2>`]
    if (/(?:给分|评分|分数)\s*\d/iu.test(plain) && plain.length < 80) return [`        <h3>${html}</h3>`]
    return [`        <p>${html}</p>`]
  }).join('\n')
}

async function syncPost(post) {
  const sourcePath = join(projectRoot, 'docs', 'blog', post.source)
  const archive = await readFile(sourcePath)
  const documentXml = readZipEntry(archive, 'word/document.xml').toString('utf8')
  const paragraphs = extractParagraphs(documentXml)
  const excerpt = excerptFrom(paragraphs)
  const bodyHtml = bodyHtmlFrom(paragraphs)
  const title = encodeHtml(post.title)
  const tagHtml = post.tags.map(tag => `          <span class="tag">#${encodeHtml(tag)}</span>`).join('\n')
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${encodeHtml(excerpt)}">
  <meta name="author" content="awa">
  <title>${title} · awaqwq233</title>
  <link rel="stylesheet" href="/blog/posts/article.css">
</head>
<body>
  <main class="page-shell">
    <a class="back-link" href="/#/blog" aria-label="返回博客列表">← 返回博客</a>
    <article>
      <header class="article-header">
        <p class="eyebrow">ANIME NOTES</p>
        <h1>${title}</h1>
        <div class="meta">
          <time datetime="${post.date}">📅 ${post.date}</time>
          <span aria-hidden="true">·</span>
          <span>🌸 生活</span>
        </div>
        <div class="tags">
${tagHtml}
        </div>
      </header>
      <div class="article-body">
${bodyHtml}
      </div>
    </article>
    <footer class="article-footer">
      <a href="/#/blog">浏览全部文章 →</a>
    </footer>
  </main>
</body>
</html>
`

  const url = `/blog/posts/${post.slug}.html`
  await writeFile(join(postsDirectory, `${post.slug}.html`), html, 'utf8')
  return {
    title: post.title,
    date: post.date,
    category: 'life',
    categoryLabel: '🌸 生活',
    tags: post.tags,
    excerpt,
    url,
  }
}

const indexPath = join(postsDirectory, 'index.json')
const currentIndex = JSON.parse(await readFile(indexPath, 'utf8'))
const importedPosts = []
for (const post of imports) importedPosts.push(await syncPost(post))
const importedUrls = new Set(importedPosts.map(post => post.url))
const nextIndex = [...currentIndex.filter(post => !importedUrls.has(post.url)), ...importedPosts]
  .sort((left, right) => right.date.localeCompare(left.date))
await writeFile(indexPath, `${JSON.stringify(nextIndex, null, 2)}\n`, 'utf8')
console.log(`已同步 ${importedPosts.length} 篇 Word 博客，共 ${nextIndex.length} 篇文章。`)
