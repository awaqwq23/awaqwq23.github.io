import { useEffect, useMemo, useRef, useState } from 'react'
import { COMPANY_LOGO_URL } from './companyCatalog'
import { ECONOMY_SAVE_KEY, GPU_CATALOG, settlePassive } from './aiEconomy'

const SAVE_KEY = ECONOMY_SAVE_KEY
const TIER_ORDER = ['common', 'rare', 'epic', 'legendary']
const TIER_META = {
  common: { name: '普通', color: '#7dd3fc' },
  rare: { name: '稀有', color: '#818cf8' },
  epic: { name: '史诗', color: '#c084fc' },
  legendary: { name: '传说', color: '#fbbf24' },
}
const SAVE_VERSION = 2
const VALUE_THRESHOLDS = {
  rare: 800,
  epic: 2000,
  legendary: 3500,
}
const REDEEM_CODES = {
  awaqwq233: 10000,
  喜欢: 10000,
  喜欢awa: 10000,
  love: 10000,
  loveawa: 10000,
  suki: 10000,
  quq: 100000000,
}

const MODELS = [
  { id: 'deepseek-v4', name: 'DeepSeek V4 Preview', brand: 'DeepSeek', logo: 'deepseek', tier: 'common', price: '$0.35 / $1.40*', cp: 320, minLab: 0 },
  { id: 'qwen3-coder', name: 'Qwen3 Coder', brand: 'Qwen', logo: 'alibabacloud', tier: 'common', price: '$0.40 / $1.20*', cp: 300, minLab: 0 },
  { id: 'gemini-35-flash', name: 'Gemini 3.5 Flash', brand: 'Google', logo: 'google', tier: 'rare', price: '$1.50 / $9.00', cp: 450, minLab: 1 },
  { id: 'gpt-56-luna', name: 'GPT-5.6 Luna', brand: 'OpenAI', logo: 'openai', tier: 'common', price: '$1.00 / $6.00', cp: 430, minLab: 0 },
  { id: 'grok-build', name: 'Grok Build 0.1', brand: 'xAI', logo: 'x', tier: 'common', price: '$1.00 / $2.00', cp: 380, minLab: 0 },
  { id: 'gpt-56-terra', name: 'GPT-5.6 Terra', brand: 'OpenAI', logo: 'openai', tier: 'rare', price: '$2.50 / $15.00', cp: 820, minLab: 1 },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', brand: 'Anthropic', logo: 'anthropic', tier: 'rare', price: '$3.00 / $15.00', cp: 900, minLab: 1 },
  { id: 'gemini-31-pro', name: 'Gemini 3.1 Pro', brand: 'Google', logo: 'google', tier: 'rare', price: '$2.00 / $12.00', cp: 780, minLab: 1 },
  { id: 'grok-45', name: 'Grok 4.5', brand: 'xAI', logo: 'x', tier: 'rare', price: '$2.00 / $6.00', cp: 720, minLab: 1 },
  { id: 'claude-opus-5', name: 'Claude Opus 5', brand: 'Anthropic', logo: 'anthropic', tier: 'epic', price: '$5.00 / $25.00', cp: 1380, minLab: 2 },
  { id: 'deepseek-v4-final', name: 'DeepSeek V4 正式版', brand: 'DeepSeek', logo: 'deepseek', tier: 'epic', price: '$2.00 / $8.00*', cp: 1250, minLab: 2 },
  { id: 'deepseek-v5', name: 'DeepSeek V5', brand: 'DeepSeek', logo: 'deepseek', tier: 'epic', price: '$4.00 / $20.00*', cp: 1550, minLab: 2 },
  { id: 'gpt-57-code', name: 'GPT-5.7 Code', brand: 'OpenAI', logo: 'openai', tier: 'epic', price: '$7.00 / $35.00*', cp: 1650, minLab: 2 },
  { id: 'gemini-4-ultra', name: 'Gemini 4 Ultra', brand: 'Google', logo: 'google', tier: 'epic', price: '$8.00 / $40.00*', cp: 1800, minLab: 2 },
  { id: 'gpt-56-sol', name: 'GPT-5.6 Sol', brand: 'OpenAI', logo: 'openai', tier: 'legendary', price: '$5.00 / $30.00', cp: 2000, minLab: 3 },
  { id: 'claude-fable-5', name: 'Claude Fable 5', brand: 'Anthropic', logo: 'anthropic', tier: 'legendary', price: '$10.00 / $50.00', cp: 2500, minLab: 3 },
  { id: 'gpt-6', name: 'GPT-6', brand: 'OpenAI', logo: 'openai', tier: 'legendary', price: '$12.00 / $60.00*', cp: 3000, minLab: 3 },
  { id: 'claude-fable-6', name: 'Claude Fable 6', brand: 'Anthropic', logo: 'anthropic', tier: 'legendary', price: '$15.00 / $75.00*', cp: 3500, minLab: 3 },
]

const TOKEN_AMOUNTS = [
  { amount: 1, label: '1M', chance: 94 },
  { amount: 2, label: '2M', chance: 3.5 },
  { amount: 5, label: '5M', chance: 1.5 },
  { amount: 10, label: '10M', chance: 0.5 },
  { amount: 20, label: '20M', chance: 0.25 },
  { amount: 50, label: '50M', chance: 0.12 },
  { amount: 100, label: '100M', chance: 0.07 },
  { amount: 500, label: '500M', chance: 0.04 },
  { amount: 1000, label: '1000M', chance: 0.018 },
  { amount: 10000, label: '1wM', chance: 0.002 },
]

const UPGRADE_DEFS = {
  batch: { icon: '▦', name: '并行抽取协议', desc: '依次解锁 20 / 50 / 100 连抽', story: '通过并行队列跑完高并发抽取项目，让更多请求能在同一批次完成。', max: 3, base: 24 },
  income: { icon: '↗', name: '小游戏加速器', desc: '补给任务收益每级 +20%', story: '通过推荐模型跑完小游戏增长项目，提高了每次挑战带回的算力收益。', max: 5, base: 14 },
  discount: { icon: '％', name: '采购议价器', desc: '抽取价格每级 -5%，十连也靠它打折', story: '通过成本模型跑完供应商议价项目，压低了人民币和算力点的采购成本。', max: 5, base: 18 },
  tax: { icon: '⌁', name: '低损耗兑换', desc: '兑换税每级降低 5 个百分点', story: '通过风控模型跑完兑换链路优化项目，减少了 Token 转算力时的系统损耗。', max: 5, base: 20 },
  lab: { icon: '⌬', name: '前沿模型实验室', desc: '逐级解锁稀有、史诗与传说模型', story: '通过评测模型跑完前沿能力验收项目，获得了调用更高级编程模型的权限。', max: 3, base: 22 },
  luck: { icon: '✦', name: '大奖概率校准器', desc: '小幅提高大额 Token 出现权重，不改变模型解锁', story: '通过统计模型跑完尾部概率校准项目，让超大额度请求稍微更容易出现。', max: 5, base: 28 },
  auto: { icon: '⟳', name: '自动抽取队列', desc: '从每 60 秒单抽升级到每秒十连', story: '通过代理模型跑完无人值守与高并发队列项目，让抽取终端逐步达到每秒十连。', max: 6, base: 36 },
  pity: { icon: '↓', name: '保底压缩器', desc: '传说硬保底每级降低 5 抽', story: '通过异常检测模型跑完坏运气修正项目，缩短了触发传说保底所需的队列。', max: 5, base: 26 },
  taskSlots: { icon: '☷', name: '任务并发额度', desc: '提高每日与每周可执行次数，满级无限', story: '通过调度模型跑完任务队列扩容项目，让更多互联网订单能够同时进入生产。', max: 4, base: 20 },
  taskQuota: { icon: '▤', name: '任务额度升级', desc: '提高单次任务消耗与合同金额', story: '通过商务模型跑完大客户额度审批项目，解锁了更高 Token 预算的互联网订单。', max: 5, base: 24 },
  taskProfit: { icon: '↟', name: '任务利润优化', desc: '每级提高任务收入 25%', story: '通过财务模型跑完报价与交付优化项目，提高了每份任务的实际利润。', max: 5, base: 30 },
}

const VALUE_UPGRADE_KEYS = ['discount', 'tax', 'luck', 'pity', 'batch', 'income', 'auto', 'taskSlots', 'taskQuota', 'taskProfit']

const RECHARGE_PACKS = [
  { id: 'tiny', pay: 6, money: 60, label: '月卡试充' },
  { id: 'small', pay: 30, money: 300, label: '小额补给' },
  { id: 'medium', pay: 98, money: 980, label: '标准补给' },
  { id: 'large', pay: 198, money: 1980, label: '高级补给' },
  { id: 'mega', pay: 328, money: 3280, label: '豪华补给' },
  { id: 'whale', pay: 648, money: 6480, label: '鲸鱼礼包' },
]

const DAILY_TASKS = [
  { id: 'daily-api', name: '修复支付 API 告警', desc: '排查接口超时并补上回归测试。', modelId: 'deepseek-v4', cost: 0.2, chance: 0.88, reward: 24 },
  { id: 'daily-docs', name: '整理开源项目文档', desc: '补齐安装、配置和故障排查说明。', modelId: 'qwen3-coder', cost: 0.2, chance: 0.9, reward: 22 },
  { id: 'daily-ui', name: '检查移动端页面', desc: '找出布局溢出和交互可用性问题。', modelId: 'gpt-56-luna', cost: 0.2, chance: 0.86, reward: 28 },
]

const WEEKLY_TASKS = [
  { id: 'weekly-repo', name: '迁移大型 Monorepo', desc: '升级依赖并让完整测试矩阵通过。', modelId: 'gpt-56-terra', cost: 0.8, chance: 0.82, reward: 180 },
  { id: 'weekly-incident', name: '复盘生产事故', desc: '跨日志、代码和监控定位真正根因。', modelId: 'claude-opus-5', cost: 0.8, chance: 0.9, reward: 320 },
  { id: 'weekly-compiler', name: '重构编译工具链', desc: '完成长时间自主编码与性能验证。', modelId: 'claude-fable-5', cost: 0.8, chance: 0.94, reward: 480 },
]

const LIFE_GOALS = {
  house: {
    name: '房子',
    icon: '⌂',
    levels: [
      { name: '温馨小屋', price: 5000, desc: '终于有一个放得下显卡和自己的小窝。' },
      { name: '城市大平层', price: 50000, desc: '给机房、书房和生活都留出足够空间。' },
      { name: '海景智能别墅', price: 500000, desc: '带独立机房、花园和永远看不完的海。' },
    ],
  },
  car: {
    name: '车子',
    icon: '◇',
    levels: [
      { name: '二手通勤车', price: 3000, desc: '能可靠地把你送到下一个项目现场。' },
      { name: '豪华智能电车', price: 30000, desc: '自动驾驶和算力座舱终于都安排上了。' },
      { name: '限量未来超跑', price: 300000, desc: '速度、设计和回头率全部拉满。' },
    ],
  },
  partner: {
    name: '对象',
    icon: '♡',
    levels: [
      { name: '心动相遇', price: 1000, desc: '准备约会基金，遇见愿意理解你的人。' },
      { name: '稳定伴侣', price: 20000, desc: '一起旅行、生活，也一起面对项目延期。' },
      { name: '人生搭档', price: 200000, desc: '不是购买一个人，而是投入共同生活与未来。' },
    ],
  },
}

const DEFAULT_SAVE = {
  saveVersion: SAVE_VERSION,
  money: 1000,
  compute: 0,
  inventory: {},
  totalDraws: 0,
  sinceLegendary: 0,
  sinceEpic: 0,
  upgrades: Object.fromEntries(Object.keys(UPGRADE_DEFS).map(key => [key, 0])),
  history: [],
  gpus: [],
  lastPassiveAt: Date.now(),
  taskReadyAt: 0,
  tasks: { dailyKey: '', weeklyKey: '', completed: {}, runs: { daily: 0, weekly: 0 } },
  autoDrawEnabled: false,
  autoCurrency: 'compute',
  nextAutoAt: 0,
  stocks: { balance: 0, principal: 0, history: [], lastEntrySettlementAt: 0, serviceFee: 0.06 },
  lifeGoals: { house: 0, car: 0, partner: 0, victoryShown: false },
  redeemedCodes: {},
  rechargeCount: 0,
  rechargeTotal: 0,
  rechargeHistory: [],
}

function weightedPick(items, weightKey = 'chance') {
  let roll = Math.random() * items.reduce((sum, item) => sum + item[weightKey], 0)
  for (const item of items) {
    roll -= item[weightKey]
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

function modelTierRates(lab = 0, softPity = 0) {
  if (lab <= 0) return { common: 100, rare: 0, epic: 0, legendary: 0 }
  if (lab === 1) return { common: 75, rare: 25, epic: 0, legendary: 0 }
  if (lab === 2) return { common: 69, rare: 25, epic: 6, legendary: 0 }
  const legendary = 0.8 + softPity
  const epic = 7.2 + softPity * 1.2
  const rare = 27 + softPity * 1.5
  return { common: 100 - legendary - epic - rare, rare, epic, legendary }
}

function tokenPool(luck = 0, softPity = 0) {
  const boost = luck * 0.08 + softPity * 0.08
  return TOKEN_AMOUNTS.map(token => ({
    ...token,
    weight: token.chance * (1 + boost * Math.log10(token.amount)),
  }))
}

function resultTier(value) {
  if (value >= VALUE_THRESHOLDS.legendary) return 'legendary'
  if (value >= VALUE_THRESHOLDS.epic) return 'epic'
  if (value >= VALUE_THRESHOLDS.rare) return 'rare'
  return 'common'
}

function drawStats(luck = 0, lab = 0, taxRate = 0.35) {
  const modelRates = modelTierRates(lab)
  const tokens = tokenPool(luck)
  const tokenWeight = tokens.reduce((sum, token) => sum + token.weight, 0)
  const rarityRates = Object.fromEntries(TIER_ORDER.map(tier => [tier, 0]))
  let expected = 0

  TIER_ORDER.forEach(modelTier => {
    const models = MODELS.filter(model => model.tier === modelTier && model.minLab <= lab)
    if (!models.length || !modelRates[modelTier]) return
    const modelProbability = modelRates[modelTier] / 100 / models.length
    models.forEach(model => {
      tokens.forEach(token => {
        const probability = modelProbability * token.weight / tokenWeight
        const value = model.cp * token.amount
        rarityRates[resultTier(value)] += probability * 100
        expected += probability * value
      })
    })
  })

  return { rarityRates, expected: Math.round(expected * (1 - taxRate)) }
}

function drawCombination(luck = 0, lab = 0, softPity = 0, minimumTier = null) {
  const modelRates = modelTierRates(lab, softPity)
  const tokens = tokenPool(luck, softPity)
  const availableModels = MODELS.filter(model => model.minLab <= lab)
  const combinations = availableModels.flatMap(model => {
    const modelCount = availableModels.filter(item => item.tier === model.tier).length
    return tokens.map(token => {
      const value = model.cp * token.amount
      return {
        model,
        token,
        value,
        rarity: resultTier(value),
        weight: modelRates[model.tier] / modelCount * token.weight,
      }
    })
  })
  const minimumIndex = minimumTier ? TIER_ORDER.indexOf(minimumTier) : 0
  const eligible = minimumTier
    ? combinations.filter(item => TIER_ORDER.indexOf(item.rarity) >= minimumIndex)
    : combinations
  return weightedPick(eligible, 'weight')
}

function formatToken(amount) {
  return amount >= 10000 ? `${amount / 10000}wM` : `${Number(amount.toFixed(3))}M`
}

function maxBatch(level) {
  return [10, 20, 50, 100][level]
}

function autoConfig(level) {
  return [
    { interval: 60000, count: 1, label: '未解锁' },
    { interval: 60000, count: 1, label: '每 60 秒单抽' },
    { interval: 20000, count: 1, label: '每 20 秒单抽' },
    { interval: 5000, count: 1, label: '每 5 秒单抽' },
    { interval: 2000, count: 1, label: '每 2 秒单抽' },
    { interval: 1000, count: 1, label: '每秒单抽' },
    { interval: 1000, count: 10, label: '每秒十连' },
  ][level] || { interval: 60000, count: 1, label: '未解锁' }
}

function taskRunCap(level) {
  return [3, 6, 12, 30, Infinity][level]
}

function modelChance(model, lab) {
  if (model.minLab > lab) return 0
  const rates = modelTierRates(lab)
  const count = MODELS.filter(item => item.tier === model.tier && item.minLab <= lab).length
  return count ? rates[model.tier] / count : 0
}

function jackpotCopy(result) {
  if (result.model.tier === 'legendary') return `超顶级模型 ${result.model.name}！`
  if (result.token.amount >= 1000) return `超大额 ${result.model.brand} 额度！`
  if (result.model.tier === 'epic') return `高阶模型与大额 Token 同时命中！`
  return `${result.model.name} 超大额 Token 爆发！`
}

function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function localWeekKey(date = new Date()) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = current.getDay() || 7
  current.setDate(current.getDate() - day + 1)
  return `W-${localDayKey(current)}`
}

function modelFactor(model) {
  return { common: 1, rare: 1.4, epic: 2, legendary: 3.5 }[model.tier]
}

function upgradeCost(key, level) {
  const def = UPGRADE_DEFS[key]
  const tier = level < 1 ? 'common' : level < 3 ? 'rare' : 'epic'
  return { tier, amount: Math.round(def.base * Math.pow(1.75, level)) }
}

function getInitialSave() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY))
    if (!stored) return DEFAULT_SAVE
    const isLegacySave = (stored.saveVersion || 1) < SAVE_VERSION
    return {
      ...DEFAULT_SAVE,
      ...stored,
      saveVersion: SAVE_VERSION,
      money: isLegacySave ? Number(stored.money || 0) + 900 : (stored.money ?? DEFAULT_SAVE.money),
      upgrades: { ...DEFAULT_SAVE.upgrades, ...stored.upgrades },
      inventory: stored.inventory || {},
      history: stored.history || [],
      gpus: stored.gpus || [],
      tasks: {
        ...DEFAULT_SAVE.tasks,
        ...(stored.tasks || {}),
        completed: stored.tasks?.completed || {},
        runs: { ...DEFAULT_SAVE.tasks.runs, ...(stored.tasks?.runs || {}) },
      },
      stocks: { ...DEFAULT_SAVE.stocks, ...(stored.stocks || {}) },
      lifeGoals: { ...DEFAULT_SAVE.lifeGoals, ...(stored.lifeGoals || {}) },
      redeemedCodes: stored.redeemedCodes || {},
    }
  } catch {
    return DEFAULT_SAVE
  }
}

function ModelLogo({ model }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="gacha-model-logo">
      {failed
        ? <b>{model.brand.slice(0, 2)}</b>
        : <img src={COMPANY_LOGO_URL(model.logo)} alt="" onError={() => setFailed(true)} />}
    </span>
  )
}

function ResultCard({ result, featured = false }) {
  const meta = TIER_META[result.rarity]
  return (
    <article className={`gacha-result-card tier-${result.rarity}${featured ? ' featured' : ''}`} style={{ '--tier': meta.color }}>
      <div className="gacha-card-rays" />
      <span className="gacha-tier-label">{meta.name}</span>
      <ModelLogo model={result.model} />
      <strong>{result.model.name}</strong>
      <b className="gacha-token-amount">{result.token.label} Token</b>
      <small>总价值 ◈ {result.value.toLocaleString()}</small>
    </article>
  )
}

export default function AITokenGacha() {
  const [save, setSave] = useState(getInitialSave)
  const [currency, setCurrency] = useState('money')
  const [drawCount, setDrawCount] = useState(1)
  const [tab, setTab] = useState('draw')
  const [results, setResults] = useState([])
  const [revealing, setRevealing] = useState(false)
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(Date.now())
  const [selectedExchange, setSelectedExchange] = useState({})
  const [stockAmount, setStockAmount] = useState('')
  const [redeemInput, setRedeemInput] = useState('')
  const [victoryOpen, setVictoryOpen] = useState(false)
  const [jackpots, setJackpots] = useState([])
  const [rechargeModal, setRechargeModal] = useState(null)
  const revealTimer = useRef(null)
  const rechargeTimers = useRef([])

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  }, [save])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    const onEconomyUpdate = event => setSave(previous => ({ ...previous, ...event.detail }))
    window.addEventListener('ai-economy-update', onEconomyUpdate)
    return () => {
      clearInterval(timer)
      clearTimeout(revealTimer.current)
      rechargeTimers.current.forEach(id => clearTimeout(id))
      window.removeEventListener('ai-economy-update', onEconomyUpdate)
    }
  }, [])

  useEffect(() => {
    const current = getInitialSave()
    const enteredAt = Date.now()
    if (import.meta.env.DEV && enteredAt - (current.stocks.lastEntrySettlementAt || 0) < 2000) return
    const stocks = { ...current.stocks, lastEntrySettlementAt: enteredAt }
    if (stocks.balance > 0) {
      // 可抽到 -30 至 +30 的任意整数百分位；负/正/零权重为 53%/46%/1%，单次期望约 -1.09%。
      const direction = Math.random()
      const returnPoints = direction < 0.53
        ? -(1 + Math.floor(Math.random() * 30))
        : direction < 0.99
          ? 1 + Math.floor(Math.random() * 30)
          : 0
      const returnRate = returnPoints / 100
      const before = stocks.balance
      stocks.balance = Math.max(0, before * (1 + returnRate))
      stocks.history = [{ at: enteredAt, rate: returnRate, before, after: stocks.balance }, ...(stocks.history || [])].slice(0, 12)
      setNotice(`股票账户本次结算 ${(returnRate * 100).toFixed(2)}%，${returnRate >= 0 ? '盈利' : '亏损'} ¥${Math.abs(stocks.balance - before).toFixed(2)}。`)
    }
    const next = { ...current, stocks }
    localStorage.setItem(SAVE_KEY, JSON.stringify(next))
    setSave(next)
  }, [])

  useEffect(() => {
    const dailyKey = localDayKey()
    const weeklyKey = localWeekKey()
    if (save.tasks.dailyKey === dailyKey && save.tasks.weeklyKey === weeklyKey) return
    setSave(previous => ({
      ...previous,
      tasks: {
        dailyKey,
        weeklyKey,
        completed: Object.fromEntries(Object.entries(previous.tasks.completed || {}).filter(([key]) =>
          (key.startsWith('daily-') && key.endsWith(dailyKey)) || (key.startsWith('weekly-') && key.endsWith(weeklyKey))
        )),
        runs: {
          daily: previous.tasks.dailyKey === dailyKey ? (previous.tasks.runs?.daily || 0) : 0,
          weekly: previous.tasks.weeklyKey === weeklyKey ? (previous.tasks.runs?.weekly || 0) : 0,
        },
      },
    }))
  }, [save.tasks.dailyKey, save.tasks.weeklyKey])

  const taxRate = Math.max(0.1, 0.35 - save.upgrades.tax * 0.05)
  const discount = save.upgrades.discount * 0.05
  const hardPity = 80 - save.upgrades.pity * 5
  const availableModels = MODELS.filter(model => model.minLab <= save.upgrades.lab)
  const currentAuto = autoConfig(save.upgrades.auto)
  const stats = useMemo(
    () => drawStats(save.upgrades.luck, save.upgrades.lab, taxRate),
    [save.upgrades.luck, save.upgrades.lab, taxRate],
  )

  const drawPrice = (count, type = currency) => {
    const base = type === 'money' ? 10 : 1500
    const value = base * count * (1 - discount)
    return type === 'money' ? Number(value.toFixed(2)) : Math.round(value)
  }

  const expectedReturn = stats.expected
  const maxExpectedReturn = useMemo(() => drawStats(5, 3, 0.1).expected, [])

  const playSound = (tier) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const context = new AudioContext()
      const notes = tier === 'legendary' ? [392, 523, 659, 784, 1046] : tier === 'epic' ? [330, 440, 660] : [330, 494]
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = tier === 'legendary' ? 'triangle' : 'sine'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.09)
        gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + index * 0.09 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.09 + 0.28)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(context.currentTime + index * 0.09)
        oscillator.stop(context.currentTime + index * 0.09 + 0.3)
      })
      setTimeout(() => context.close(), 1200)
    } catch {
      // 浏览器禁用音频时保持静默，不影响抽取。
    }
  }

  const doDraw = (count, drawCurrency = currency, automatic = false) => {
    const cost = drawPrice(count, drawCurrency)
    if (count > maxBatch(save.upgrades.batch)) return
    if ((drawCurrency === 'money' ? save.money : save.compute) < cost) {
      setNotice(drawCurrency === 'money' ? '余额不足，完成互联网任务或让显卡挖矿吧。' : '算力点不足，去其他小游戏赚取后再来。')
      if (automatic) setSave(previous => ({ ...previous, nextAutoAt: Date.now() + currentAuto.interval }))
      return
    }

    const next = {
      ...save,
      inventory: { ...save.inventory },
      history: [...save.history],
    }
    if (drawCurrency === 'money') next.money = Number((next.money - cost).toFixed(4))
    else next.compute -= cost

    const pulled = []
    for (let index = 0; index < count; index += 1) {
      const minimumTier = next.sinceLegendary >= hardPity - 1
        ? 'legendary'
        : next.sinceEpic >= 29
          ? 'epic'
          : null
      const softPity = next.sinceLegendary >= 59 ? Math.min(4, (next.sinceLegendary - 58) * 0.16) : 0
      const combination = drawCombination(next.upgrades.luck, next.upgrades.lab, softPity, minimumTier)
      const { model, token, value, rarity } = combination
      const result = { model, token, value, rarity, id: `${Date.now()}-${index}-${Math.random()}` }
      pulled.push(result)
      next.inventory[model.id] = (next.inventory[model.id] || 0) + token.amount
      next.sinceLegendary = rarity === 'legendary' ? 0 : next.sinceLegendary + 1
      next.sinceEpic = rarity === 'epic' || rarity === 'legendary' ? 0 : next.sinceEpic + 1
      next.totalDraws += 1
      next.history.unshift({ modelId: model.id, amount: token.amount, tier: rarity, value, at: Date.now() })
    }
    next.history = next.history.slice(0, 30)
    if (automatic) next.nextAutoAt = Date.now() + currentAuto.interval
    setSave(next)
    setResults(pulled)
    setRevealing(true)
    const bestTier = pulled.reduce((best, result) => Math.max(best, TIER_ORDER.indexOf(result.rarity)), 0)
    playSound(TIER_ORDER[bestTier])
    const legendaryHits = pulled
      .filter(result => result.rarity === 'legendary')
      .sort((a, b) => b.value - a.value)
    if (legendaryHits.length) setJackpots(previous => [...previous, ...legendaryHits])
    clearTimeout(revealTimer.current)
    revealTimer.current = setTimeout(() => setRevealing(false), bestTier === 3 ? 1700 : 850)
    setNotice('')
  }

  useEffect(() => {
    if (tab !== 'draw' || jackpot || rechargeModal || !save.upgrades.auto || !save.autoDrawEnabled || now < (save.nextAutoAt || 0)) return
    const config = autoConfig(save.upgrades.auto)
    doDraw(config.count, save.autoCurrency || 'compute', true)
  }, [now, tab, jackpot, rechargeModal, save.autoDrawEnabled, save.autoCurrency, save.nextAutoAt, save.upgrades.auto]) // eslint-disable-line react-hooks/exhaustive-deps

  const exchange = (model, requested) => {
    const owned = save.inventory[model.id] || 0
    const amount = requested === 'all' ? owned : Math.min(requested, owned)
    if (amount <= 0) return
    const gained = Math.floor(amount * model.cp * (1 - taxRate))
    setSave(previous => ({
      ...previous,
      compute: previous.compute + gained,
      inventory: { ...previous.inventory, [model.id]: previous.inventory[model.id] - amount },
    }))
    setNotice(`兑换完成：${formatToken(amount)} ${model.name} → ${gained.toLocaleString()} 算力点`)
  }

  const exchangeSelected = () => {
    const selected = MODELS.filter(model => selectedExchange[model.id] && (save.inventory[model.id] || 0) > 0)
    if (!selected.length) {
      setNotice('请先勾选要批量兑换的模型 Token。')
      return
    }
    const inventory = { ...save.inventory }
    let gained = 0
    let total = 0
    selected.forEach(model => {
      const amount = inventory[model.id] || 0
      gained += Math.floor(amount * model.cp * (1 - taxRate))
      total += amount
      inventory[model.id] = 0
    })
    setSave(previous => ({ ...previous, compute: previous.compute + gained, inventory }))
    setSelectedExchange({})
    setNotice(`批量兑换完成：${formatToken(total)} Token → ${gained.toLocaleString()} 算力点`)
  }

  const spendTierTokens = (inventory, tier, amount) => {
    const nextInventory = { ...inventory }
    let remaining = amount
    MODELS.filter(model => model.tier === tier)
      .sort((a, b) => a.cp - b.cp)
      .forEach(model => {
        const spend = Math.min(nextInventory[model.id] || 0, remaining)
        nextInventory[model.id] = (nextInventory[model.id] || 0) - spend
        remaining -= spend
      })
    return remaining <= 0 ? nextInventory : null
  }

  const buyUpgrade = key => {
    const level = save.upgrades[key]
    const def = UPGRADE_DEFS[key]
    if (level >= def.max) return
    const cost = upgradeCost(key, level)
    const nextInventory = spendTierTokens(save.inventory, cost.tier, cost.amount)
    if (!nextInventory) {
      setNotice(`升级失败：需要 ${cost.amount}M ${TIER_META[cost.tier].name}模型 Token。`)
      return
    }
    setSave(previous => ({
      ...previous,
      inventory: nextInventory,
      upgrades: { ...previous.upgrades, [key]: level + 1 },
    }))
    setNotice(`${def.name} 已升级到 Lv.${level + 1}`)
  }

  const runSupplyTask = () => {
    if (now < save.taskReadyAt) return
    const reward = Math.round(600 * (1 + save.upgrades.income * 0.2))
    setSave(previous => ({ ...previous, compute: previous.compute + reward, taskReadyAt: Date.now() + 12000 }))
    setNotice(`小游戏补给完成：+${reward} 算力点`)
  }

  const buyGpu = (gpu, currencyType) => {
    const price = currencyType === 'money' ? gpu.marketPrice : gpu.marketPrice * 100
    const balance = currencyType === 'money' ? save.money : save.compute
    if (balance < price) {
      setNotice(`${currencyType === 'money' ? '现金' : '算力点'}不足：购买 ${gpu.name} 需要 ${currencyType === 'money' ? `¥${price.toLocaleString()}` : `◈${price.toLocaleString()}`}。`)
      return
    }
    setSave(previous => ({
      ...previous,
      money: currencyType === 'money' ? previous.money - price : previous.money,
      compute: currencyType === 'compute' ? previous.compute - price : previous.compute,
      gpus: [...previous.gpus, {
        uid: `${gpu.id}-${Date.now()}-${Math.random()}`,
        gpuId: gpu.id,
        mode: 'idle',
        modelId: 'deepseek-v4',
        modelFactor: 1,
      }],
      lastPassiveAt: Date.now(),
    }))
    setNotice(`${gpu.name} 已加入本地机房。`)
  }

  const configureGpu = (uid, patch) => {
    setSave(previous => ({
      ...previous,
      ...settlePassive(previous, Date.now(), 1).save,
      gpus: previous.gpus.map(gpu => gpu.uid === uid ? { ...gpu, ...patch } : gpu),
    }))
  }

  const sellGpu = (owned, gpu) => {
    const resale = Math.floor(gpu.marketPrice / 2)
    if (!window.confirm(`按市场正版价格的一半卖出 ${gpu.name}，获得 ¥${resale.toLocaleString()}？`)) return
    setSave(previous => {
      const settled = settlePassive(previous, Date.now(), 1).save
      return {
        ...settled,
        money: settled.money + resale,
        gpus: settled.gpus.filter(item => item.uid !== owned.uid),
      }
    })
    setNotice(`${gpu.name} 已卖出，到账 ¥${resale.toLocaleString()}。`)
  }

  const investStock = () => {
    const amount = Number(stockAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('请输入有效的投资金额。')
      return
    }
    if (amount > save.money) {
      setNotice('现金余额不足，无法完成这笔投资。')
      return
    }
    setSave(previous => ({
      ...previous,
      money: previous.money - amount,
      stocks: {
        ...previous.stocks,
        balance: previous.stocks.balance + amount,
        principal: previous.stocks.principal + amount,
      },
    }))
    setStockAmount('')
    setNotice(`已投入股票账户 ¥${amount.toFixed(2)}，下次进入抽卡页时结算。`)
  }

  const withdrawStock = requested => {
    const amount = requested === 'all' ? save.stocks.balance : Math.min(Number(requested), save.stocks.balance)
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('请输入有效的提取金额。')
      return
    }
    const fee = amount * save.stocks.serviceFee
    const received = amount - fee
    setSave(previous => ({
      ...previous,
      money: previous.money + received,
      stocks: {
        ...previous.stocks,
        balance: previous.stocks.balance - amount,
        principal: requested === 'all' ? 0 : Math.max(0, previous.stocks.principal - amount),
      },
    }))
    setStockAmount('')
    setNotice(`已提取 ¥${amount.toFixed(2)}，服务费 ¥${fee.toFixed(2)}，实际到账 ¥${received.toFixed(2)}。`)
  }

  const buyLifeGoal = category => {
    const goal = LIFE_GOALS[category]
    const currentLevel = save.lifeGoals[category]
    const item = goal.levels[currentLevel]
    if (!item) return
    if (save.money < item.price) {
      setNotice(`现金不足：达成“${item.name}”需要 ¥${item.price.toLocaleString()}。`)
      return
    }
    const nextGoals = { ...save.lifeGoals, [category]: currentLevel + 1 }
    const won = Object.entries(LIFE_GOALS).every(([key, definition]) => nextGoals[key] >= definition.levels.length)
    if (won) nextGoals.victoryShown = true
    setSave(previous => ({ ...previous, money: previous.money - item.price, lifeGoals: nextGoals }))
    setNotice(`人生目标升级：${goal.name} · ${item.name}`)
    if (won) setVictoryOpen(true)
  }

  const executeTask = task => {
    const model = MODELS.find(item => item.id === task.modelId)
    const period = task.id.startsWith('daily-') ? 'daily' : 'weekly'
    const cap = taskRunCap(save.upgrades.taskSlots)
    const runs = save.tasks.runs?.[period] || 0
    if (runs >= cap) {
      setNotice(`${period === 'daily' ? '每日' : '每周'}任务额度已用完，升级“任务并发额度”可继续接单。`)
      return
    }
    if (model.minLab > save.upgrades.lab) {
      setNotice(`该任务需要先把前沿模型实验室升级到 Lv.${model.minLab}。`)
      return
    }
    const quotaScale = 1 + save.upgrades.taskQuota * 0.5
    const profitScale = 1 + save.upgrades.taskProfit * 0.25
    const taskCost = Number((task.cost * quotaScale).toFixed(3))
    const taskReward = Math.round(task.reward * quotaScale * profitScale)
    const owned = save.inventory[task.modelId] || 0
    if (owned < taskCost) {
      setNotice(`需要 ${taskCost}M ${model.name} Token 才能执行该任务。`)
      return
    }
    const success = Math.random() < task.chance
    const spent = success ? taskCost : Number((taskCost / 2).toFixed(3))
    setSave(previous => ({
      ...previous,
      money: previous.money + (success ? taskReward : 0),
      inventory: { ...previous.inventory, [task.modelId]: previous.inventory[task.modelId] - spent },
      tasks: {
        ...previous.tasks,
        runs: {
          ...previous.tasks.runs,
          [period]: (previous.tasks.runs?.[period] || 0) + 1,
        },
      },
    }))
    setNotice(success
      ? `任务成功：${model.name} 完成工作，获得 ¥${taskReward}。`
      : `任务未通过验收，消耗 ${spent}M Token，可重新尝试。`)
  }

  const startRecharge = pack => {
    rechargeTimers.current.forEach(id => clearTimeout(id))
    rechargeTimers.current = []
    const waitMs = Math.min(15000, 900 + save.rechargeCount * 650 + pack.pay * 8 + (save.rechargeTotal || 0) * 0.05)
    const finishAt = Date.now() + waitMs + 600
    setRechargeModal({ pack, status: 'qr', remaining: Math.ceil((waitMs + 600) / 1000) })

    rechargeTimers.current.push(setTimeout(() => {
      setRechargeModal(previous => previous ? { ...previous, status: 'paying' } : previous)
    }, 600))

    const countdownTimer = setInterval(() => {
      setRechargeModal(previous => previous
        ? { ...previous, remaining: Math.max(0, Math.ceil((finishAt - Date.now()) / 1000)) }
        : previous)
    }, 250)
    rechargeTimers.current.push(countdownTimer)

    rechargeTimers.current.push(setTimeout(() => {
      clearInterval(countdownTimer)
      setSave(previous => ({
        ...previous,
        money: previous.money + pack.money,
        rechargeCount: (previous.rechargeCount || 0) + 1,
        rechargeTotal: (previous.rechargeTotal || 0) + pack.pay,
        rechargeHistory: [
          { id: `${Date.now()}-${pack.id}`, packId: pack.id, pay: pack.pay, money: pack.money, at: Date.now() },
          ...(previous.rechargeHistory || []),
        ].slice(0, 8),
      }))
      setRechargeModal({ pack, status: 'success', remaining: 0 })
      setNotice(`模拟充值成功：到账 ¥${pack.money.toLocaleString()}。`)
      rechargeTimers.current.push(setTimeout(() => {
        setRechargeModal(null)
        setTab('draw')
      }, 1000))
    }, waitMs + 600))
  }

  const redeemCode = event => {
    event.preventDefault()
    const code = redeemInput.trim().toLowerCase()
    const reward = REDEEM_CODES[code]
    if (!reward) {
      setNotice('兑换码无效，请检查后重新输入。')
      return
    }
    if (save.redeemedCodes?.[code]) {
      setNotice(`兑换码“${redeemInput.trim()}”已经使用过了。`)
      return
    }
    setSave(previous => ({
      ...previous,
      money: previous.money + reward,
      redeemedCodes: { ...(previous.redeemedCodes || {}), [code]: Date.now() },
    }))
    setRedeemInput('')
    setNotice(`兑换成功：模拟余额 +¥${reward.toLocaleString()}。`)
  }

  const resetSave = () => {
    if (!window.confirm('确定重置抽卡存档吗？余额、Token 和升级都会恢复初始状态；兑换码使用记录会保留。')) return
    setSave({
      ...DEFAULT_SAVE,
      upgrades: { ...DEFAULT_SAVE.upgrades },
      redeemedCodes: { ...(save.redeemedCodes || {}) },
      lastPassiveAt: Date.now(),
    })
    setResults([])
    setNotice('存档已重置。')
  }

  const ownedModels = MODELS.filter(model => (save.inventory[model.id] || 0) > 0)
  const totalToken = MODELS.reduce((sum, model) => sum + (save.inventory[model.id] || 0), 0)
  const countdown = Math.max(0, Math.ceil((save.taskReadyAt - now) / 1000))

  return (
    <div className="ai-gacha">
      <header className="gacha-hero">
        <div className="gacha-hero-copy">
          <span className="gacha-kicker"><i /> MODEL TOKEN LAB · SEASON 01</span>
          <h2>算力奇点</h2>
          <p>抽到的不是角色，是能驱动整个游戏的 AI 模型 Token。</p>
          <div className="gacha-hero-meta" aria-label="当前赛季规则">
            <span>本地存档</span>
            <span>离线收益 50%</span>
            <span>公开概率</span>
          </div>
        </div>
        <div className="gacha-wallet" aria-label="玩家资产">
          <span className="money"><small>模拟余额</small><b>¥ {save.money.toFixed(2)}</b></span>
          <span className="compute"><small>算力点</small><b>◈ {save.compute.toLocaleString()}</b></span>
          <span className="token"><small>Token 库存</small><b>{formatToken(totalToken)}</b></span>
        </div>
      </header>

      <nav className="gacha-tabs" aria-label="抽卡功能">
        {[
          ['draw', '✦', '抽取终端'],
          ['inventory', '▣', `Token 仓库 ${ownedModels.length ? `· ${ownedModels.length}` : ''}`],
          ['upgrade', '↗', '升级中心'],
          ['hardware', '▧', `显卡机房 ${save.gpus.length ? `· ${save.gpus.length}` : ''}`],
          ['stocks', '⌁', '股票账户'],
          ['recharge', '＋', '模拟充值'],
          ['life', '◇', '人生目标'],
          ['tasks', '✓', '互联网任务'],
          ['rules', 'i', '概率与定价'],
        ].map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <i aria-hidden="true">{icon}</i>{label}
          </button>
        ))}
      </nav>

      {notice && <div className="gacha-notice" role="status">{notice}</div>}

      {tab === 'draw' && (
        <section className="gacha-draw-layout">
          <div className="gacha-terminal">
            <div className={`gacha-reactor${revealing ? ' revealing' : ''}${results.some(r => r.rarity === 'legendary') ? ' has-legendary' : ''}`}>
              <div className="gacha-reactor-hud top">
                <span>POOL / LAB LV.{save.upgrades.lab}</span>
                <span>DRAW / {save.totalDraws.toLocaleString()}</span>
              </div>
              <div className="gacha-reactor-hud bottom">
                <span>VALUE / ◈{expectedReturn} TAXED EV</span>
                <span>LAB / LV.{save.upgrades.lab}</span>
              </div>
              <div className="gacha-orbit orbit-one" />
              <div className="gacha-orbit orbit-two" />
              {!results.length ? (
                <div className="gacha-reactor-core">
                  <span>◈</span>
                  <strong>等待算力注入</strong>
                  <small>四种价值品质始终开放 · 高级模型由实验室解锁 · {hardPity} 抽硬保底</small>
                </div>
              ) : (
                <div className={`gacha-results count-${Math.min(results.length, 10)}`}>
                  {results.slice(0, 10).map((result, index) => (
                    <ResultCard key={result.id} result={result} featured={results.length === 1 || (result.rarity === 'legendary' && index === 0)} />
                  ))}
                  {results.length > 10 && <div className="gacha-more-results">其余 {results.length - 10} 张已收入仓库</div>}
                </div>
              )}
            </div>

            <div className="gacha-pity">
              <span><b>史诗保底</b><i style={{ width: `${Math.min(100, save.sinceEpic / 30 * 100)}%` }} /></span>
              <em>{save.sinceEpic} / 30</em>
              <span><b>传说保底</b><i style={{ width: `${Math.min(100, save.sinceLegendary / hardPity * 100)}%` }} /></span>
              <em>{save.sinceLegendary} / {hardPity}</em>
            </div>

            <div className="gacha-controls">
              <div className="gacha-segment">
                <button className={currency === 'money' ? 'active' : ''} onClick={() => setCurrency('money')}>人民币</button>
                <button className={currency === 'compute' ? 'active' : ''} onClick={() => setCurrency('compute')}>算力点</button>
              </div>
              <div className="gacha-counts">
                {[1, 10, 20, 50, 100].map(count => {
                  const locked = count > maxBatch(save.upgrades.batch)
                  return (
                    <button key={count} disabled={locked} className={drawCount === count ? 'active' : ''} onClick={() => setDrawCount(count)}>
                      {locked ? '🔒 ' : ''}{count} 抽
                    </button>
                  )
                })}
              </div>
              <button className="gacha-draw-button" onClick={() => doDraw(drawCount, currency)}>
                <span>启动 {drawCount === 1 ? '单次' : `${drawCount} 连`}抽取</span>
                <b>{currency === 'money' ? `¥ ${drawPrice(drawCount).toFixed(2)}` : `◈ ${drawPrice(drawCount).toLocaleString()}`}</b>
              </button>
              <p>连抽无额外折扣 · 采购议价器当前减免 {(discount * 100).toFixed(0)}% · 算力点抽取定价高于人民币抽取</p>
              {save.upgrades.auto > 0 && (
                <div className="gacha-auto">
                  <button
                    className={save.autoDrawEnabled ? 'active' : ''}
                    onClick={() => setSave(previous => ({ ...previous, autoDrawEnabled: !previous.autoDrawEnabled, nextAutoAt: Date.now() + currentAuto.interval }))}
                  >
                    {save.autoDrawEnabled ? '暂停自动抽取' : '启动自动抽取'}
                  </button>
                  <select
                    value={save.autoCurrency}
                    onChange={event => setSave(previous => ({ ...previous, autoCurrency: event.target.value }))}
                    aria-label="自动抽取货币"
                  >
                    <option value="compute">使用算力点</option>
                    <option value="money">使用人民币</option>
                  </select>
                  <span>{save.autoDrawEnabled ? `${Math.max(0, Math.ceil((save.nextAutoAt - now) / 1000))}s 后执行 ${currentAuto.count} 抽` : currentAuto.label}</span>
                </div>
              )}
            </div>
          </div>

          <aside className="gacha-sidebar">
            <div className="gacha-side-card">
              <span className="gacha-side-eyebrow">余额见底？</span>
              <h3>小游戏算力补给</h3>
              <p>除合成大银鲸结算 DeepSeek Token 外，其余小游戏都会按分数或成绩发放较多算力点；SEPA 还会额外结算 Claude Token。</p>
              <button onClick={runSupplyTask} disabled={countdown > 0}>
                {countdown ? `${countdown}s 后可领取` : `试玩补给 +${Math.round(600 * (1 + save.upgrades.income * 0.2))} 算力点`}
              </button>
            </div>
            <div className="gacha-side-card compact">
              <span>价值品质</span>
              {TIER_ORDER.map(tier => (
                <p key={tier}><i style={{ background: TIER_META[tier].color }} />{TIER_META[tier].name}<b>{tier === 'legendary' ? '金色大奖' : '始终可出'}</b></p>
              ))}
              <small>具体概率统一在“概率与定价”最后一列公开。</small>
            </div>
          </aside>
        </section>
      )}

      {tab === 'inventory' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>INVENTORY</span><h3>Token 仓库与兑换</h3></div>
            <p>当前克扣 <b>{(taxRate * 100).toFixed(0)}%</b>；Token 只能换算力点，算力点只能抽奖。</p>
          </div>
          {!ownedModels.length ? (
            <div className="gacha-empty"><b>仓库还是空的</b><span>先去抽取终端获得第一份模型 Token。</span></div>
          ) : (
            <div className="gacha-inventory-grid">
              {ownedModels.map(model => {
                const owned = save.inventory[model.id]
                const afterTax = Math.floor(model.cp * (1 - taxRate))
                return (
                  <article key={model.id} className={`gacha-inventory-card tier-${model.tier}`}>
                    <label className="gacha-exchange-check" title="加入批量兑换">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedExchange[model.id])}
                        onChange={event => setSelectedExchange(previous => ({ ...previous, [model.id]: event.target.checked }))}
                      />
                    </label>
                    <ModelLogo model={model} />
                    <div><span>{TIER_META[model.tier].name}</span><h4>{model.name}</h4><small>持有 {formatToken(owned)}</small></div>
                    <div className="gacha-exchange-value"><small>每 1M 税后</small><b>◈ {afterTax.toLocaleString()}</b></div>
                    <div className="gacha-exchange-actions">
                      <button disabled={owned < 1} onClick={() => exchange(model, 1)}>兑换 1M</button>
                      <button onClick={() => exchange(model, 'all')}>全部兑换</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          {ownedModels.length > 0 && (
            <div className="gacha-batch-exchange">
              <button onClick={() => setSelectedExchange(Object.fromEntries(ownedModels.map(model => [model.id, true])))}>全选库存</button>
              <span>已选 {Object.values(selectedExchange).filter(Boolean).length} 种模型</span>
              <button className="primary" onClick={exchangeSelected}>批量兑换选中库存</button>
            </div>
          )}
        </section>
      )}

      {tab === 'upgrade' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>UPGRADE TREE</span><h3>奇点升级中心</h3></div>
            <p>卡片四种品质始终存在；实验室负责解锁更高级的模型本身。</p>
          </div>
          <div className="gacha-upgrade-section-head">
            <div><span>01</span><h4>提高总期望与运行效率</h4><p>当前税后价值 ◈{expectedReturn}/抽，满级约 ◈{maxExpectedReturn}/抽。</p></div>
          </div>
          <div className="gacha-upgrade-grid">
            {VALUE_UPGRADE_KEYS.map(key => {
              const def = UPGRADE_DEFS[key]
              const level = save.upgrades[key]
              const cost = level < def.max ? upgradeCost(key, level) : null
              const owned = cost ? MODELS.filter(model => model.tier === cost.tier).reduce((sum, model) => sum + (save.inventory[model.id] || 0), 0) : 0
              return (
                <article className="gacha-upgrade-card" key={key}>
                  <div className="gacha-upgrade-icon">{def.icon}</div>
                  <div className="gacha-upgrade-copy">
                    <span>Lv.{level} / {def.max}</span>
                    <h4>{def.name}</h4>
                    <p>{def.desc}</p>
                    <small className="gacha-upgrade-story">{def.story}</small>
                    {cost && <small>需要 {cost.amount}M {TIER_META[cost.tier].name} Token · 持有 {formatToken(owned)}</small>}
                  </div>
                  <button disabled={level >= def.max || owned < (cost?.amount || 0)} onClick={() => buyUpgrade(key)}>
                    {level >= def.max ? '已满级' : '升级'}
                  </button>
                </article>
              )
            })}
          </div>
          <div className="gacha-upgrade-section-head pool">
            <div><span>02</span><h4>解锁更高级模型池</h4><p>低级池仍可凭超大额 Token 出金；升级后才会出现高级模型 Token。</p></div>
          </div>
          <div className="gacha-pool-roadmap">
            {[0, 1, 2, 3].map(level => {
              const pool = MODELS.filter(model => model.minLab === level)
              return (
                <article key={level} className={`${level === save.upgrades.lab ? 'current ' : ''}${level > save.upgrades.lab ? 'locked' : ''}`}>
                  <span>{level === 0 ? '初始池' : `实验室 Lv.${level}`}</span>
                  <b>{TIER_META[TIER_ORDER[level]].name}模型</b>
                  <div>{pool.map(model => <small key={model.id}>{model.name}</small>)}</div>
                  <em>{level < save.upgrades.lab ? '已解锁' : level === save.upgrades.lab ? '当前' : '待解锁'}</em>
                </article>
              )
            })}
          </div>
          {(() => {
            const level = save.upgrades.lab
            const def = UPGRADE_DEFS.lab
            const cost = level < def.max ? upgradeCost('lab', level) : null
            const owned = cost ? MODELS.filter(model => model.tier === cost.tier).reduce((sum, model) => sum + (save.inventory[model.id] || 0), 0) : 0
            return (
              <div className="gacha-pool-upgrade">
                <div><b>{level >= def.max ? '高级模型池已全部开放' : `下一步：解锁 ${TIER_META[TIER_ORDER[level + 1]].name}模型`}</b>
                  <small className="gacha-upgrade-story">{def.story}</small>
                  {cost && <small>需要 {cost.amount}M {TIER_META[cost.tier].name} Token · 当前持有 {formatToken(owned)}</small>}
                </div>
                <button disabled={level >= def.max || owned < (cost?.amount || 0)} onClick={() => buyUpgrade('lab')}>
                  {level >= def.max ? '已全部解锁' : '升级实验室'}
                </button>
              </div>
            )
          })()}
        </section>
      )}

      {tab === 'hardware' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>LOCAL GPU FARM</span><h3>显卡商店与本地机房</h3></div>
            <p>人民币与算力点都按市场正版参考价购买；在线每分钟结算，离线收益减半。</p>
          </div>
          <div className="gacha-gpu-shop">
            {GPU_CATALOG.map(gpu => (
              <article key={gpu.id} className="gacha-gpu-card">
                <div className="gacha-gpu-mark">RTX</div>
                <div>
                  <span>{gpu.vram}GB GDDR7 · {gpu.aiTops.toLocaleString()} AI TOPS</span>
                  <h4>{gpu.name}</h4>
                  <p>Qwen3 RAG 约 {gpu.ragTps} tok/s · 挖矿约 ¥{(gpu.miningPerMinute * 1440).toFixed(2)}/天</p>
                </div>
                <div className="gacha-gpu-price">
                  <b>¥{gpu.marketPrice.toLocaleString()}</b>
                  <span>或 ◈{(gpu.marketPrice * 100).toLocaleString()}</span>
                  <button onClick={() => buyGpu(gpu, 'money')}>现金购买</button>
                  <button onClick={() => buyGpu(gpu, 'compute')}>算力购买</button>
                </div>
              </article>
            ))}
          </div>

          <h4 className="gacha-subheading">我的机房</h4>
          {!save.gpus.length ? (
            <div className="gacha-empty small"><b>还没有显卡</b><span>玩小游戏或兑换 Token，积累算力点购买第一张显卡。</span></div>
          ) : (
            <div className="gacha-rig-list">
              {save.gpus.map((owned, index) => {
                const gpu = GPU_CATALOG.find(item => item.id === owned.gpuId)
                return (
                  <article key={owned.uid} className="gacha-rig">
                    <div><span>GPU {index + 1}</span><h4>{gpu.name}</h4></div>
                    <div className="gacha-rig-modes">
                      <button className={owned.mode === 'idle' ? 'active' : ''} onClick={() => configureGpu(owned.uid, { mode: 'idle' })}>待机</button>
                      <button className={owned.mode === 'mining' ? 'active' : ''} onClick={() => configureGpu(owned.uid, { mode: 'mining' })}>挖矿赚钱</button>
                      <button className={owned.mode === 'ai' ? 'active' : ''} onClick={() => configureGpu(owned.uid, { mode: 'ai' })}>运行 AI</button>
                    </div>
                    {owned.mode === 'ai' && (
                      <select
                        value={owned.modelId}
                        onChange={event => {
                          const model = MODELS.find(item => item.id === event.target.value)
                          configureGpu(owned.uid, { modelId: model.id, modelFactor: modelFactor(model) })
                        }}
                        aria-label={`${gpu.name} 运行模型`}
                      >
                        {availableModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                      </select>
                    )}
                    <small>
                      {owned.mode === 'mining' && `在线约 ¥${gpu.miningPerMinute.toFixed(4)}/分钟`}
                      {owned.mode === 'ai' && `在线约 ${formatToken(gpu.tokenMPerMinute / Math.max(1, owned.modelFactor || 1))}/分钟`}
                      {owned.mode === 'idle' && '不产生收益'}
                    </small>
                    <button className="gacha-sell-gpu" onClick={() => sellGpu(owned, gpu)}>卖出 ¥{Math.floor(gpu.marketPrice / 2).toLocaleString()}</button>
                  </article>
                )
              })}
            </div>
          )}
          <div className="gacha-rule-notes">
            <p><b>时间缓存：</b>整个网站打开时每 60 秒结算一次；关闭页面或隐藏标签后，按本地记录时间补算 50% 收益，单次最多补算 30 天。</p>
            <p><b>用途差异：</b>挖矿直接产生模拟人民币；运行 AI 产生已选择模型的 Token。高品质模型训练更慢，但兑换价值更高。</p>
            <p><b>买卖规则：</b>人民币与算力点购买都按市场正版参考价换算；卖出统一按正版价格的一半回收。</p>
          </div>
        </section>
      )}

      {tab === 'stocks' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>LOCAL PAPER MARKET</span><h3>模拟股票账户</h3></div>
            <p>每次重新进入抽卡页面结算一次；随机抽取 −30% 至 +30% 的整数百分位，结果保留两位小数。</p>
          </div>
          <div className="gacha-stock-overview">
            <article><span>股票市值</span><b>¥{save.stocks.balance.toFixed(2)}</b><small>未提取资产</small></article>
            <article><span>累计投入本金</span><b>¥{save.stocks.principal.toFixed(2)}</b><small>仅作盈亏参考</small></article>
            <article><span>账面盈亏</span><b className={save.stocks.balance - save.stocks.principal >= 0 ? 'up' : 'down'}>{save.stocks.balance - save.stocks.principal >= 0 ? '+' : ''}¥{(save.stocks.balance - save.stocks.principal).toFixed(2)}</b><small>未扣提取服务费</small></article>
            <article><span>提取服务费</span><b>{(save.stocks.serviceFee * 100).toFixed(0)}%</b><small>每次提取时收取</small></article>
          </div>
          <div className="gacha-stock-trade">
            <div>
              <label htmlFor="stock-amount">交易金额</label>
              <input
                id="stock-amount"
                type="number"
                min="0"
                step="1"
                value={stockAmount}
                onChange={event => setStockAmount(event.target.value)}
                placeholder="输入模拟人民币"
              />
              <div>
                <button onClick={() => setStockAmount((save.money * .25).toFixed(2))}>现金 25%</button>
                <button onClick={() => setStockAmount((save.money * .5).toFixed(2))}>现金 50%</button>
                <button onClick={() => setStockAmount(save.money.toFixed(2))}>全部现金</button>
              </div>
            </div>
            <div className="gacha-stock-actions">
              <button className="buy" onClick={investStock}>投入股票</button>
              <button disabled={!save.stocks.balance} onClick={() => withdrawStock(stockAmount)}>按金额提取</button>
              <button disabled={!save.stocks.balance} onClick={() => withdrawStock('all')}>全部提取</button>
            </div>
          </div>
          <div className="gacha-stock-rule">
            <b>结算规则</b>
            <p>每次重新进入时从 −30% 至 +30% 的整数波动中随机结算，并带有轻微负期望；提取另收 6% 服务费。详细概率统一列在“概率与定价”。</p>
          </div>
          <div className="gacha-stock-history">
            <h4>最近结算</h4>
            {!save.stocks.history.length ? <p>暂无记录，投入资金后重新进入抽卡页面即可产生第一笔结算。</p> : (
              save.stocks.history.map(item => (
                <div key={item.at}>
                  <span>{new Date(item.at).toLocaleString()}</span>
                  <b className={item.rate >= 0 ? 'up' : 'down'}>{item.rate >= 0 ? '+' : ''}{(item.rate * 100).toFixed(2)}%</b>
                  <small>¥{item.before.toFixed(2)} → ¥{item.after.toFixed(2)}</small>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {tab === 'recharge' && (
        <section className="gacha-panel gacha-recharge-panel">
          <div className="gacha-panel-title">
            <div><span>SIMULATED TOP-UP</span><h3>模拟充值中心</h3></div>
            <p>仿二游充值演出，不会产生真实支付或真实货币交易。</p>
          </div>
          <div className="gacha-recharge-hero">
            <div><span>当前模拟余额</span><b>¥{save.money.toFixed(2)}</b></div>
            <div><span>累计模拟充值</span><b>¥{(save.rechargeTotal || 0).toLocaleString()} · {save.rechargeCount || 0} 次</b></div>
            <p>选择礼包后会弹出一个毫无意义的二维码，并自动演出“正在付款 → 充值成功”。充值次数越多、档位越高，等待越久。</p>
          </div>
          <div className="gacha-recharge-grid">
            {RECHARGE_PACKS.map(pack => (
              <article key={pack.id} className={pack.id === 'whale' ? 'featured' : ''}>
                {pack.id === 'whale' && <em>热门</em>}
                <span>{pack.label}</span>
                <h4>{pack.money.toLocaleString()} RMB</h4>
                <p>模拟余额</p>
                <button onClick={() => startRecharge(pack)}>支付 ¥{pack.pay}</button>
              </article>
            ))}
          </div>
          {!!save.rechargeHistory?.length && (
            <div className="gacha-recharge-history">
              <h4>最近模拟充值</h4>
              {save.rechargeHistory.map(item => (
                <div key={item.id}>
                  <span>{new Date(item.at).toLocaleString()}</span>
                  <b>¥{item.pay} → {item.money.toLocaleString()} RMB</b>
                  <small>已到账</small>
                </div>
              ))}
            </div>
          )}
          <div className="gacha-rule-notes">
            <p><b>纯模拟：</b>二维码不可扫描、不会连接支付平台，也不会扣除真实资金。成功状态只会修改浏览器本地游戏存档。</p>
            <p><b>等待机制：</b>首次小额充值最快；累计次数和支付档位都会增加演出等待时间，单次最多等待 15 秒。</p>
          </div>
        </section>
      )}

      {tab === 'life' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>ENDGAME GOALS</span><h3>人生目标清单</h3></div>
            <p>用任务、挖矿和经营赚到的现金，逐级完成房子、车子和对象目标。</p>
          </div>
          <div className="gacha-life-progress">
            <div>
              <span>总进度</span>
              <b>{Object.keys(LIFE_GOALS).reduce((sum, key) => sum + save.lifeGoals[key], 0)} / 9</b>
            </div>
            <i><span style={{ width: `${Object.keys(LIFE_GOALS).reduce((sum, key) => sum + save.lifeGoals[key], 0) / 9 * 100}%` }} /></i>
            <small>三条路线全部达到最高等级，即可完成人生目标。</small>
          </div>
          <div className="gacha-life-grid">
            {Object.entries(LIFE_GOALS).map(([key, goal]) => {
              const currentLevel = save.lifeGoals[key]
              const next = goal.levels[currentLevel]
              return (
                <article className="gacha-life-card" key={key}>
                  <header><span>{goal.icon}</span><div><small>{goal.name}</small><h4>{currentLevel ? goal.levels[currentLevel - 1].name : '尚未开始'}</h4></div><b>Lv.{currentLevel}/3</b></header>
                  <div className="gacha-life-levels">
                    {goal.levels.map((level, index) => (
                      <div key={level.name} className={index < currentLevel ? 'done' : index === currentLevel ? 'next' : ''}>
                        <span>{index + 1}</span>
                        <div><b>{level.name}</b><small>{level.desc}</small></div>
                        <em>¥{level.price.toLocaleString()}</em>
                      </div>
                    ))}
                  </div>
                  <button disabled={!next} onClick={() => buyLifeGoal(key)}>
                    {next ? `达成下一等级 · ¥${next.price.toLocaleString()}` : '已达到最高等级'}
                  </button>
                </article>
              )
            })}
          </div>
          <div className="gacha-stock-rule life-note">
            <b>关于“对象”</b>
            <p>这里的花费代表约会、共同旅行和生活基金，不是把人当作可以买卖的物品。真正的关系当然不能用价格衡量。</p>
          </div>
        </section>
      )}

      {tab === 'tasks' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>INTERNET CONTRACTS</span><h3>每日与每周互联网任务</h3></div>
            <p>使用指定模型 Token 执行；成功后给钱，任务总期望为正。</p>
          </div>
          {[['今日任务', DAILY_TASKS, 'daily'], ['本周任务', WEEKLY_TASKS, 'weekly']].map(([title, tasks, periodType]) => {
            const cap = taskRunCap(save.upgrades.taskSlots)
            const runs = save.tasks.runs?.[periodType] || 0
            const quotaScale = 1 + save.upgrades.taskQuota * 0.5
            const profitScale = 1 + save.upgrades.taskProfit * 0.25
            const exhausted = runs >= cap
            return (
            <div className="gacha-task-group" key={title}>
              <h4>{title}<span>{Number.isFinite(cap) ? `${runs} / ${cap} 次` : `${runs} 次 · 无限`}</span></h4>
              <div className="gacha-task-grid">
                {tasks.map(task => {
                  const model = MODELS.find(item => item.id === task.modelId)
                  const locked = model.minLab > save.upgrades.lab
                  const taskCost = Number((task.cost * quotaScale).toFixed(3))
                  const taskReward = Math.round(task.reward * quotaScale * profitScale)
                  return (
                    <article className="gacha-task-card" key={task.id}>
                      <ModelLogo model={model} />
                      <div>
                        <span>{model.name}</span>
                        <h4>{task.name}</h4>
                        <p>{task.desc}</p>
                        <small>额度 {taskCost}M · 成功奖励 ¥{taskReward}</small>
                      </div>
                      <button disabled={exhausted || locked} onClick={() => executeTask(task)}>
                        {exhausted ? '额度已用完' : locked ? `实验室 Lv.${model.minLab}` : '执行任务'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          )})}
        </section>
      )}

      {tab === 'rules' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>PUBLIC AUDIT</span><h3>公开概率、价格与经济规则</h3></div>
            <p>价格为每百万输入 / 输出 Token 的公开美元标价；* 为参考接入价。</p>
          </div>
          <div className="gacha-audit-summary">
            <article><span>当前单抽成本</span><b>¥{drawPrice(1, 'money')} / ◈{drawPrice(1, 'compute')}</b><small>连抽不额外打折</small></article>
            <article><span>当前税后价值</span><b>◈{expectedReturn} / 抽</b><small>初始现金回收约 {Math.round(drawStats(0, 0, .35).expected / 10)}%</small></article>
            <article><span>最高 Token 额度</span><b>1wM</b><small>概率统一见表格末栏</small></article>
            <article><span>当前模型池</span><b>实验室 Lv.{save.upgrades.lab}</b><small>卡片四品质始终开放</small></article>
          </div>
          <div className="gacha-table-wrap">
            <table className="gacha-model-table">
              <thead><tr><th>卡片品质</th><th>总算力价值范围</th><th>大奖说明</th><th>当前概率</th></tr></thead>
              <tbody>
                {[
                  ['common', '低于 ◈800', '基础结果'],
                  ['rare', '◈800–1,999', '稀有价值组合'],
                  ['epic', '◈2,000–3,499', '史诗价值组合'],
                  ['legendary', '达到 ◈3,500', '触发金色老虎机演出'],
                ].map(([tier, range, description]) => (
                  <tr key={tier}>
                    <td><span className={`gacha-table-tier tier-${tier}`}>{TIER_META[tier].name}</span></td>
                    <td>{range}</td>
                    <td>{description}</td>
                    <td>{stats.rarityRates[tier].toFixed(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gacha-table-wrap">
            <table className="gacha-model-table">
              <thead><tr><th>模型档位</th><th>模型</th><th>API 标价 $ / MTok</th><th>兑换基准</th><th>状态</th><th>当前模型概率</th></tr></thead>
              <tbody>
                {MODELS.map(model => (
                  <tr key={model.id}>
                    <td><span className={`gacha-table-tier tier-${model.tier}`}>{TIER_META[model.tier].name}</span></td>
                    <td><b>{model.name}</b></td>
                    <td>{model.price}</td>
                    <td>◈ {model.cp.toLocaleString()} / M</td>
                    <td>{model.minLab <= save.upgrades.lab ? '池中' : `实验室 Lv.${model.minLab}`}</td>
                    <td className={model.minLab > save.upgrades.lab ? 'gacha-locked-rate' : ''}>{model.minLab <= save.upgrades.lab ? `${modelChance(model, save.upgrades.lab).toFixed(3)}%` : '锁定'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gacha-table-wrap gacha-token-table-wrap">
            <table className="gacha-model-table">
              <thead><tr><th>Token 额度</th><th>价值计算</th><th>概率升级影响</th><th>当前概率</th></tr></thead>
              <tbody>
                {(() => {
                  const pool = tokenPool(save.upgrades.luck)
                  const totalWeight = pool.reduce((sum, token) => sum + token.weight, 0)
                  return pool.map(token => (
                    <tr key={token.label}>
                      <td><b>{token.label}</b></td>
                      <td>模型兑换基准 × {token.amount.toLocaleString()}M</td>
                      <td>{token.amount > 1 ? '受大奖概率校准器小幅提升' : '基础额度'}</td>
                      <td>{(token.weight / totalWeight * 100).toFixed(token.amount >= 1000 ? 4 : 3)}%</td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
          <div className="gacha-rule-notes">
            <p><b>模型池：</b>实验室 Lv.0 / 1 / 2 / 3 依次开放普通、稀有、史诗与传说模型；低等级池仍能通过抽到大量低级模型 Token 达成金色传说品质。</p>
            <p><b>品质判定：</b>每张卡先抽模型和 Token 数量，再以“模型每 1M 兑换算力点 × 本次 Token 总量”计算总价值：低于 ◈800 为普通，◈800–1,999 为稀有，◈2,000–3,499 为史诗，达到 ◈3,500 为传说。</p>
            <p><b>升级效果：</b>前沿模型实验室只负责解锁高级模型；大奖概率校准器只小幅提高大额 Token 权重，两条成长线互不替代。</p>
            <p><b>定价原则：</b>公开 API 价格是品质和兑换基准的主要依据，再结合编码能力微调；带 * 的未来模型为依据厂商历史定价生成的游戏内预测价，并非已发布报价。</p>
            <p><b>经济曲线：</b>初始现金抽税后期望约 {Math.round(drawStats(0, 0, .35).expected / 10)}%，算力抽因溢价更低；满级实验室、概率、税率和折扣后可超过 100%。Token 与算力点都不能兑换现金。</p>
            <p><b>股票概率：</b>−30 至 −1 合计 53%，+1 至 +30 合计 46%，0 为 1%；区间内整数等概率，单次期望约 −1.09%，提取另收 6% 服务费。</p>
            <p><b>其他资产：</b>股票每次重新进入时结算且为负期望；显卡可用现金或算力点按正版参考价购买，并按正版价格的一半卖出。</p>
          </div>
          <button className="gacha-reset" onClick={resetSave}>重置本机模拟存档</button>
        </section>
      )}

      <section className="gacha-redeem" aria-labelledby="gacha-redeem-title">
        <div className="gacha-redeem-mark">⌘</div>
        <div>
          <span>LOCAL BONUS CHANNEL</span>
          <h3 id="gacha-redeem-title">兑换码</h3>
          <p>每个兑换码仅能在本机存档使用一次 · 已兑换 {Object.keys(save.redeemedCodes || {}).length} / {Object.keys(REDEEM_CODES).length}</p>
        </div>
        <form onSubmit={redeemCode}>
          <input
            value={redeemInput}
            onChange={event => setRedeemInput(event.target.value)}
            placeholder="输入兑换码"
            aria-label="兑换码"
            autoComplete="off"
          />
          <button type="submit" disabled={!redeemInput.trim()}>立即兑换</button>
        </form>
      </section>

      {!!jackpots.length && (() => {
        const jackpot = jackpots[0]
        return (
        <div className="gacha-jackpot" role="dialog" aria-modal="true" aria-labelledby="gacha-jackpot-title">
          <div className="gacha-jackpot-beams" />
          <article>
            <span className="gacha-jackpot-kicker">✦ LEGENDARY JACKPOT ✦</span>
            <div className="gacha-slot-machine" aria-hidden="true">
              {[jackpot.model.brand, jackpot.token.label, 'AI'].map((finalValue, reel) => (
                <div className="gacha-slot-reel" key={`${finalValue}-${reel}`}>
                  <div style={{ '--reel-delay': `${reel * .12}s` }}>
                    <span>1M</span><span>Qwen</span><span>◈</span><span>GPT</span><span>{finalValue}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="gacha-jackpot-ai">
              <div className="gacha-jackpot-halo" />
              <ModelLogo model={jackpot.model} />
            </div>
            <h3 id="gacha-jackpot-title">{jackpotCopy(jackpot)}</h3>
            <p>{jackpot.model.name} · {jackpot.token.label} Token</p>
            <b>金色总价值 ◈ {jackpot.value.toLocaleString()}</b>
            <small>品质由 {jackpot.model.cp.toLocaleString()} 算力点/M × {jackpot.token.amount.toLocaleString()}M 判定</small>
            <button onClick={() => setJackpots(previous => previous.slice(1))}>
              {jackpots.length > 1 ? `收下奖励 · 还有 ${jackpots.length - 1} 个传说` : '收下传说奖励'}
            </button>
          </article>
        </div>
        )
      })()}

      {rechargeModal && (
        <div className="gacha-payment-modal" role="dialog" aria-modal="true" aria-labelledby="gacha-payment-title">
          <article className={rechargeModal.status}>
            <span>SIMULATED PAYMENT</span>
            <h3 id="gacha-payment-title">
              {rechargeModal.status === 'qr' ? '请扫描毫无意义的二维码' : rechargeModal.status === 'paying' ? '正在付款' : '充值成功'}
            </h3>
            {rechargeModal.status !== 'success' ? (
              <>
                <div className="gacha-fake-qr"><i /><b>AWA</b></div>
                <p>模拟支付 ¥{rechargeModal.pack.pay} · 到账 ¥{rechargeModal.pack.money.toLocaleString()}</p>
                <small>{rechargeModal.status === 'qr' ? '二维码只是装饰，即将自动付款' : `请稍候，预计 ${rechargeModal.remaining}s`}</small>
                <div className="gacha-payment-loader"><i /></div>
              </>
            ) : (
              <div className="gacha-payment-success">
                <i>✓</i>
                <b>+¥{rechargeModal.pack.money.toLocaleString()}</b>
                <p>正在返回抽卡终端…</p>
              </div>
            )}
          </article>
        </div>
      )}

      {victoryOpen && (
        <div className="gacha-victory" role="dialog" aria-modal="true" aria-labelledby="gacha-victory-title">
          <div className="gacha-victory-rays" />
          <article>
            <span>✦ LIFE COMPLETE ✦</span>
            <h3 id="gacha-victory-title">你已经完成了人生目标！<br />（但愿吧）</h3>
            <p>最好的房子、最好的车子，还有愿意一起生活的人。Token 世界的主线故事已经通关。</p>
            <div><b>海景智能别墅</b><b>限量未来超跑</b><b>人生搭档</b></div>
            <button onClick={() => setVictoryOpen(false)}>继续我的人生</button>
          </article>
        </div>
      )}
    </div>
  )
}
