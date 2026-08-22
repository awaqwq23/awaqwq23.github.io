import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const postsDir = new URL('../../public/blog/posts/', import.meta.url)
const outputUrl = new URL('../../public/data/anime-blog-reviews.json', import.meta.url)
const postsPath = fileURLToPath(postsDir)

function decodeHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function titleAndScore(heading) {
  const decoded = decodeHtml(heading)
  const scoreMatch = decoded.match(/(?:给分|评分|分数|总体评分)\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*10/i)
  const title = decoded
    .replace(/(?:给分|评分|分数|总体评分)[\s\S]*$/i, '')
    .replace(/[（(](?:第一季|第[一二三四五六七八九十]+季)[^）)]*[）)]/g, '')
    .replace(/\s+(?:1(?:\s*[-—]\s*3)?|1\s+2|1\s+2\s+剧场版)\s*$/i, '')
    .trim()
  return { title, score: scoreMatch ? Number(scoreMatch[1]) : null }
}

function extractSectionReviews(html, fileName) {
  const article = html.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<\/article>/i)?.[1] || ''
  const tokens = [...article.matchAll(/<(h[23]|p)[^>]*>([\s\S]*?)<\/\1>/gi)]
  const reviews = []
  let current = null
  for (const token of tokens) {
    const tag = token[1].toLowerCase()
    if (tag === 'h3') {
      if (current?.paragraphs.length) reviews.push(current)
      const parsed = titleAndScore(token[2])
      current = { ...parsed, paragraphs: [], sourceUrl: `/blog/posts/${fileName}` }
    } else if (tag === 'h2') {
      if (current?.paragraphs.length) reviews.push(current)
      current = null
    } else if (current) {
      const paragraph = decodeHtml(token[2])
      if (paragraph) current.paragraphs.push(paragraph)
    }
  }
  if (current?.paragraphs.length) reviews.push(current)
  return reviews.map(review => ({
    title: review.title,
    score: review.score,
    text: review.paragraphs.join('\n\n'),
    sourceUrl: review.sourceUrl,
  }))
}

function extractStandaloneReview(html, fileName) {
  if (!/#动漫|#番剧/.test(html)) return null
  const heading = decodeHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1])
  const title = heading.match(/《([^》]+)》/)?.[1]
  const article = html.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<\/article>/i)?.[1]
  const text = decodeHtml(article)
  if (!title || !text) return null
  return { title, score: null, text, sourceUrl: `/blog/posts/${fileName}` }
}

const aliases = {
  Mygo: ['BanG Dream! It’s MyGO!!!!!', 'MyGO'],
  gbc: ['Girls Band Cry', 'GIRLS BAND CRY', '少女乐队的呐喊'],
  're0': ['Re:从零开始的异世界生活', 'Re:ZERO'],
  '俄妹': ['不时轻声地以俄语遮羞的邻座艾莉同学', '俄罗斯语'],
  '败犬女主': ['败犬女主太多了！', '败北女角太多了'],
}

const files = (await readdir(postsPath)).filter(file => file.endsWith('.html'))
const collected = []
for (const file of files) {
  const html = await readFile(join(postsPath, file), 'utf8')
  if (file === 'anime-list-and-reviews.html') collected.push(...extractSectionReviews(html, file))
  else {
    const standalone = extractStandaloneReview(html, file)
    if (standalone) collected.push(standalone)
  }
}

const reviews = collected
  .filter(review => review.title && review.text.length >= 12)
  .map(review => ({ ...review, aliases: aliases[review.title] || [] }))

await writeFile(outputUrl, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), reviews }, null, 2)}\n`, 'utf8')
console.log(`已从博客提取 ${reviews.length} 条番评：${outputUrl.pathname}`)
