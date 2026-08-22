import { readFile } from 'node:fs/promises'
import { buildCatalogSeriesGroups, isMinorAnimeExtra } from '../../src/utils/animeRecords.js'

const catalog = JSON.parse(await readFile(new URL('../../public/data/anime-series-catalog.json', import.meta.url), 'utf8'))
const failures = []
const allMembers = catalog.series.flatMap(series => series.members.map(member => ({ ...member, seriesTitle: series.title })))

if (catalog.animationCount !== allMembers.length) failures.push(`animationCount=${catalog.animationCount}，实际=${allMembers.length}`)
if (allMembers.some(member => member.type !== 2)) failures.push('目录中出现了非动画（type !== 2）条目')
if (allMembers.some(member => /(?:THE\s*REAL\s*4-?D|リアル\s*4-?D|真实(?:版)?\s*4-?D|真人版|実写版|舞台剧|舞台劇|ステージショー)/i.test(`${member.title} ${member.originalTitle}`))) failures.push('目录中出现了真人体验、舞台等现实企划')
for (const series of catalog.series) {
  if (new Set(series.members.map(member => member.id)).size !== series.members.length) failures.push(`${series.title} 存在重复条目`)
}

function expectSeries(pattern, check, message) {
  const series = catalog.series.find(item => pattern.test(`${item.title} ${item.members.map(member => member.title).join(' ')}`))
  if (!series || !check(series)) failures.push(message)
}

function logicalTitle(value, platform = '') {
  const normalized = String(value || '').normalize('NFKC').toLocaleLowerCase('zh-CN')
  const numberedSeason = normalized.match(/^(.*?第\s*[一二三四五六七八九十0-9]+\s*季)/)
  if (numberedSeason && /^(?:tv|web)$/i.test(platform)) return numberedSeason[1].replace(/[\s\-—–:：·・'"“”‘’\[\]()（）【】]/g, '')
  return normalized
    .replace(/\s*[-—–]?\s*(?:第?\s*2\s*部分|第?\s*2\s*クール|2nd\s*cour|part\s*2|cour\s*2)$/i, '')
    .replace(/\s*[-—–]?\s*(?:后半部分|後半クール)$/i, '')
    .replace(/\s*[-—–]?\s*(?:电影|movie)$/i, '')
    .replace(/[\s\-—–:：·・'"“”‘’\[\]()（）【】]/g, '')
}

function logicalMembers(series) {
  return [...new Set(series.members.map(member => logicalTitle(member.title, member.platform)))]
}

expectSeries(/碧蓝之海/, series => series.members.filter(member => member.platform === 'TV').length === 3, '碧蓝之海必须有三季 TV 动画')
expectSeries(/无职转生/, series => logicalMembers(series).length === 3 && series.members.some(member => /第二季/.test(member.title)) && series.members.some(member => /第三季/.test(member.title) && member.status === 'RELEASING'), '无职转生必须合并上下半并分列第一、第二、第三季，第三季须为连载中')
expectSeries(/辉夜大小姐/, series => series.members.length >= 5 && series.members.some(member => member.platform === 'OVA') && series.members.some(member => member.platform === '剧场版'), '辉夜大小姐必须包含三季、OVA/番外和剧场版')
expectSeries(/间谍过家家/, series => series.members.some(member => member.platform === '剧场版') && series.members.length >= 4, '间谍过家家系列成员不完整')
expectSeries(/约会大作战/, series => series.members.some(member => member.platform === 'OVA') && series.members.some(member => member.platform === '剧场版'), '约会大作战必须包含 OVA 和剧场版')
expectSeries(/咒术回战/, series => series.members.some(member => member.platform === '剧场版') && series.members.length >= 3, '咒术回战系列成员不完整')
expectSeries(/Re[:：]?从零开始|Re:ゼロ/, series => {
  const seasons = new Set(series.members.filter(member => /^(?:TV|WEB)$/i.test(member.platform || '')).map(member => member.title.match(/第([一二三四五六七八九十0-9]+)季/)?.[1] || (/新编集版|新編集版/.test(member.title) ? '一' : null)).filter(Boolean))
  return seasons.size >= 4 && series.members.length >= 12
}, 'Re:0 必须保留至少四季及 OVA、短篇等动画关联作')

const reZeroSeries = catalog.series.find(series => series.id === 'bgm-series-140001')
if (reZeroSeries) {
  const sourceId = String(reZeroSeries.sourceEntryIds[0])
  const fourthSeason = reZeroSeries.members.find(member => /第四季/.test(member.title))
  const initialGroup = buildCatalogSeriesGroups([{ id: sourceId, title: reZeroSeries.title, groups: ['正在看'] }], { series: [reZeroSeries] })[0]
  if (!initialGroup || initialGroup.extras.length < 5 || initialGroup.extras.some(extra => !isMinorAnimeExtra(extra))) failures.push('Re:0 的迷你动画与休息时间必须归档到小番外链接区')
  if (fourthSeason) {
    const removed = { [`entry:${sourceId}`]: true, [`entry:${fourthSeason.id}`]: true, [`entry:bangumi-${fourthSeason.id}`]: true }
    const remainingGroup = buildCatalogSeriesGroups([], { series: [reZeroSeries] }, {}, removed)[0]
    if (!remainingGroup?.items.length || remainingGroup.items.some(item => Number(item.bangumiId) === Number(fourthSeason.id))) failures.push('删除 Re:0 单部动画后必须保留系列中的其他正篇')
  }
}

if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'))
  process.exitCode = 1
} else {
  console.log(`系列目录校验通过：${catalog.seriesCount} 个系列、${catalog.animationCount} 个动画条目，全部为 type=2。`)
}
