import { readFile } from 'node:fs/promises'

const catalog = JSON.parse(await readFile(new URL('../../public/data/anime-series-catalog.json', import.meta.url), 'utf8'))
const failures = []
const allMembers = catalog.series.flatMap(series => series.members.map(member => ({ ...member, seriesTitle: series.title })))

if (catalog.animationCount !== allMembers.length) failures.push(`animationCount=${catalog.animationCount}，实际=${allMembers.length}`)
if (allMembers.some(member => member.type !== 2)) failures.push('目录中出现了非动画（type !== 2）条目')
for (const series of catalog.series) {
  if (new Set(series.members.map(member => member.id)).size !== series.members.length) failures.push(`${series.title} 存在重复条目`)
}

function expectSeries(pattern, check, message) {
  const series = catalog.series.find(item => pattern.test(`${item.title} ${item.members.map(member => member.title).join(' ')}`))
  if (!series || !check(series)) failures.push(message)
}

function logicalTitle(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('zh-CN')
    .replace(/[\s\-—–:：·・!！?？'"“”‘’\[\]()（）【】~～]/g, '')
    .replace(/(?:第?2部分|第?2クール|2ndcour|part2|cour2)$/i, '')
    .replace(/(?:电影|movie)$/i, '')
}

function logicalMembers(series) {
  return [...new Set(series.members.map(member => logicalTitle(member.title)))]
}

expectSeries(/碧蓝之海/, series => series.members.filter(member => member.platform === 'TV').length === 3, '碧蓝之海必须有三季 TV 动画')
expectSeries(/无职转生/, series => logicalMembers(series).length === 3 && series.members.some(member => /第二季/.test(member.title)) && series.members.some(member => /第三季/.test(member.title) && member.status === 'RELEASING'), '无职转生必须合并上下半并分列第一、第二、第三季，第三季须为连载中')
expectSeries(/辉夜大小姐/, series => series.members.length >= 5 && series.members.some(member => member.platform === 'OVA') && series.members.some(member => member.platform === '剧场版'), '辉夜大小姐必须包含三季、OVA/番外和剧场版')
expectSeries(/间谍过家家/, series => series.members.some(member => member.platform === '剧场版') && series.members.length >= 4, '间谍过家家系列成员不完整')
expectSeries(/约会大作战/, series => series.members.some(member => member.platform === 'OVA') && series.members.some(member => member.platform === '剧场版'), '约会大作战必须包含 OVA 和剧场版')
expectSeries(/咒术回战/, series => series.members.some(member => member.platform === '剧场版') && series.members.length >= 3, '咒术回战系列成员不完整')

if (failures.length) {
  console.error(failures.map(message => `- ${message}`).join('\n'))
  process.exitCode = 1
} else {
  console.log(`系列目录校验通过：${catalog.seriesCount} 个系列、${catalog.animationCount} 个动画条目，全部为 type=2。`)
}
