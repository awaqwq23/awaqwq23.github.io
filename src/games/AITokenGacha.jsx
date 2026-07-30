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

const MODELS = [
  { id: 'deepseek-v4', name: 'DeepSeek V4', brand: 'DeepSeek', logo: 'deepseek', tier: 'common', price: '$0.35 / $1.40*', cp: 320, minLab: 0 },
  { id: 'qwen3-coder', name: 'Qwen3 Coder', brand: 'Qwen', logo: 'alibabacloud', tier: 'common', price: '$0.40 / $1.20*', cp: 300, minLab: 0 },
  { id: 'gemini-35-flash', name: 'Gemini 3.5 Flash', brand: 'Google', logo: 'google', tier: 'rare', price: '$1.50 / $9.00', cp: 450, minLab: 1 },
  { id: 'gpt-56-luna', name: 'GPT-5.6 Luna', brand: 'OpenAI', logo: 'openai', tier: 'common', price: '$1.00 / $6.00', cp: 430, minLab: 0 },
  { id: 'grok-build', name: 'Grok Build 0.1', brand: 'xAI', logo: 'x', tier: 'common', price: '$1.00 / $2.00', cp: 380, minLab: 0 },
  { id: 'gpt-56-terra', name: 'GPT-5.6 Terra', brand: 'OpenAI', logo: 'openai', tier: 'rare', price: '$2.50 / $15.00', cp: 820, minLab: 1 },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', brand: 'Anthropic', logo: 'anthropic', tier: 'rare', price: '$3.00 / $15.00', cp: 900, minLab: 1 },
  { id: 'gemini-31-pro', name: 'Gemini 3.1 Pro', brand: 'Google', logo: 'google', tier: 'rare', price: '$2.00 / $12.00', cp: 780, minLab: 1 },
  { id: 'grok-45', name: 'Grok 4.5', brand: 'xAI', logo: 'x', tier: 'rare', price: '$2.00 / $6.00', cp: 720, minLab: 1 },
  { id: 'claude-opus-5', name: 'Claude Opus 5', brand: 'Anthropic', logo: 'anthropic', tier: 'epic', price: '$5.00 / $25.00', cp: 1380, minLab: 2 },
  { id: 'gpt-56-sol', name: 'GPT-5.6 Sol', brand: 'OpenAI', logo: 'openai', tier: 'legendary', price: '$5.00 / $30.00', cp: 2000, minLab: 3 },
  { id: 'claude-fable-5', name: 'Claude Fable 5', brand: 'Anthropic', logo: 'anthropic', tier: 'legendary', price: '$10.00 / $50.00', cp: 2500, minLab: 3 },
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
  lab: { icon: '⌬', name: '前沿模型实验室', desc: '逐级解锁稀有、史诗、传说模型池', story: '通过评测模型跑完前沿能力验收项目，获得了调用更高级编程模型的权限。', max: 3, base: 22 },
  luck: { icon: '✦', name: '概率校准器', desc: '解锁高阶池后提高稀有、史诗与传说概率', story: '通过统计模型跑完概率校准项目，把更多抽取权重分配给高价值模型。', max: 5, base: 28 },
  auto: { icon: '⟳', name: '自动抽取队列', desc: '抽取终端打开时每 60 秒自动单抽，可随时暂停', story: '通过代理模型跑完无人值守项目，抽取终端获得了自动执行能力。', max: 1, base: 36 },
  pity: { icon: '↓', name: '保底压缩器', desc: '传说硬保底每级降低 5 抽', story: '通过异常检测模型跑完坏运气修正项目，缩短了触发传说保底所需的队列。', max: 5, base: 26 },
}

const VALUE_UPGRADE_KEYS = ['discount', 'tax', 'luck', 'pity', 'batch', 'income', 'auto']

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
  money: 100,
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
  tasks: { dailyKey: '', weeklyKey: '', completed: {} },
  autoDrawEnabled: false,
  autoCurrency: 'compute',
  nextAutoAt: 0,
  stocks: { balance: 0, principal: 0, history: [], lastEntrySettlementAt: 0, serviceFee: 0.06 },
  lifeGoals: { house: 0, car: 0, partner: 0, victoryShown: false },
}

function weightedPick(items, weightKey = 'chance') {
  let roll = Math.random() * items.reduce((sum, item) => sum + item[weightKey], 0)
  for (const item of items) {
    roll -= item[weightKey]
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

function tierRates(luck = 0, lab = 0) {
  if (lab <= 0) return { common: 100, rare: 0, epic: 0, legendary: 0 }
  const legendary = lab >= 3 ? 0.8 + luck * 0.4 : 0
  const epic = lab >= 2 ? 5 + luck * 1.5 : 0
  const rare = 20 + luck * 2.5
  return { common: 100 - legendary - epic - rare, rare, epic, legendary }
}

function pickTier(rates) {
  return weightedPick(TIER_ORDER.map(tier => ({ tier, chance: rates[tier] }))).tier
}

function formatToken(amount) {
  return amount >= 10000 ? `${amount / 10000}wM` : `${Number(amount.toFixed(3))}M`
}

function maxBatch(level) {
  return [10, 20, 50, 100][level]
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

function expectedComputeValue(models, rates, taxRate) {
  const amountEV = TOKEN_AMOUNTS.reduce((sum, token) => sum + token.amount * token.chance / 100, 0)
  const cpPerM = TIER_ORDER.reduce((total, tier) => {
    const pool = models.filter(model => model.tier === tier)
    const average = pool.length ? pool.reduce((sum, model) => sum + model.cp, 0) / pool.length : 0
    return total + average * rates[tier] / 100
  }, 0)
  return Math.round(amountEV * cpPerM * (1 - taxRate))
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
    return {
      ...DEFAULT_SAVE,
      ...stored,
      upgrades: { ...DEFAULT_SAVE.upgrades, ...stored.upgrades },
      inventory: stored.inventory || {},
      history: stored.history || [],
      gpus: stored.gpus || [],
      tasks: { ...DEFAULT_SAVE.tasks, ...(stored.tasks || {}), completed: stored.tasks?.completed || {} },
      stocks: { ...DEFAULT_SAVE.stocks, ...(stored.stocks || {}) },
      lifeGoals: { ...DEFAULT_SAVE.lifeGoals, ...(stored.lifeGoals || {}) },
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
  const meta = TIER_META[result.model.tier]
  return (
    <article className={`gacha-result-card tier-${result.model.tier}${featured ? ' featured' : ''}`} style={{ '--tier': meta.color }}>
      <div className="gacha-card-rays" />
      <span className="gacha-tier-label">{meta.name}</span>
      <ModelLogo model={result.model} />
      <strong>{result.model.name}</strong>
      <b className="gacha-token-amount">{result.token.label} Token</b>
      <small>{result.model.cp.toLocaleString()} 算力点 / M</small>
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
  const [victoryOpen, setVictoryOpen] = useState(false)
  const revealTimer = useRef(null)

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
      },
    }))
  }, [save.tasks.dailyKey, save.tasks.weeklyKey])

  const rates = useMemo(() => tierRates(save.upgrades.luck, save.upgrades.lab), [save.upgrades.luck, save.upgrades.lab])
  const taxRate = Math.max(0.1, 0.35 - save.upgrades.tax * 0.05)
  const discount = save.upgrades.discount * 0.05
  const hardPity = 80 - save.upgrades.pity * 5
  const availableModels = MODELS.filter(model => model.minLab <= save.upgrades.lab)

  const drawPrice = (count, type = currency) => {
    const base = type === 'money' ? 10 : 1500
    const value = base * count * (1 - discount)
    return type === 'money' ? Number(value.toFixed(2)) : Math.round(value)
  }

  const expectedReturn = useMemo(
    () => expectedComputeValue(availableModels, rates, taxRate),
    [availableModels, rates, taxRate],
  )
  const maxExpectedReturn = useMemo(
    () => expectedComputeValue(MODELS, tierRates(5, 3), 0.1),
    [],
  )

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
      if (automatic) setSave(previous => ({ ...previous, nextAutoAt: Date.now() + 60000 }))
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
      let currentRates = { ...tierRates(next.upgrades.luck, next.upgrades.lab) }
      if (next.upgrades.lab >= 3 && next.sinceLegendary >= 59) {
        const softBonus = Math.min(12, (next.sinceLegendary - 58) * 0.8)
        currentRates.legendary += softBonus
        currentRates.common -= softBonus
      }
      let tier = next.upgrades.lab >= 3 && next.sinceLegendary >= hardPity - 1
        ? 'legendary'
        : next.upgrades.lab >= 2 && next.sinceEpic >= 29
          ? 'epic'
          : pickTier(currentRates)
      const pool = MODELS.filter(model => model.tier === tier && model.minLab <= next.upgrades.lab)
      if (!pool.length) tier = TIER_ORDER[Math.max(0, TIER_ORDER.indexOf(tier) - 1)]
      const modelPool = MODELS.filter(model => model.tier === tier && model.minLab <= next.upgrades.lab)
      const model = modelPool[Math.floor(Math.random() * modelPool.length)]
      const token = weightedPick(TOKEN_AMOUNTS)
      const result = { model, token, id: `${Date.now()}-${index}-${Math.random()}` }
      pulled.push(result)
      next.inventory[model.id] = (next.inventory[model.id] || 0) + token.amount
      next.sinceLegendary = next.upgrades.lab >= 3 ? (tier === 'legendary' ? 0 : next.sinceLegendary + 1) : 0
      next.sinceEpic = next.upgrades.lab >= 2 ? (tier === 'epic' || tier === 'legendary' ? 0 : next.sinceEpic + 1) : 0
      next.totalDraws += 1
      next.history.unshift({ modelId: model.id, amount: token.amount, tier, at: Date.now() })
    }
    next.history = next.history.slice(0, 30)
    if (automatic) next.nextAutoAt = Date.now() + 60000
    setSave(next)
    setResults(pulled)
    setRevealing(true)
    const bestTier = pulled.reduce((best, result) => Math.max(best, TIER_ORDER.indexOf(result.model.tier)), 0)
    playSound(TIER_ORDER[bestTier])
    clearTimeout(revealTimer.current)
    revealTimer.current = setTimeout(() => setRevealing(false), bestTier === 3 ? 1700 : 850)
    setNotice('')
  }

  useEffect(() => {
    if (!save.upgrades.auto || !save.autoDrawEnabled || now < (save.nextAutoAt || 0)) return
    doDraw(1, save.autoCurrency || 'compute', true)
  }, [now, save.autoDrawEnabled, save.autoCurrency, save.nextAutoAt, save.upgrades.auto]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const reward = Math.round(180 * (1 + save.upgrades.income * 0.2))
    setSave(previous => ({ ...previous, compute: previous.compute + reward, taskReadyAt: Date.now() + 12000 }))
    setNotice(`小游戏补给完成：+${reward} 算力点`)
  }

  const buyGpu = gpu => {
    const computePrice = gpu.gamePrice * 100
    if (save.compute < computePrice) {
      setNotice(`算力点不足：购买 ${gpu.name} 需要 ◈${computePrice.toLocaleString()}。`)
      return
    }
    setSave(previous => ({
      ...previous,
      compute: previous.compute - computePrice,
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
    const resale = Math.floor(gpu.marketPrice * 2 / 3)
    if (!window.confirm(`按市场参考价的三分之二卖出 ${gpu.name}，获得 ¥${resale.toLocaleString()}？`)) return
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
    const key = `${task.id}-${task.id.startsWith('daily-') ? save.tasks.dailyKey : save.tasks.weeklyKey}`
    if (save.tasks.completed[key]) return
    const owned = save.inventory[task.modelId] || 0
    if (owned < task.cost) {
      setNotice(`需要 ${task.cost}M ${model.name} Token 才能执行该任务。`)
      return
    }
    const success = Math.random() < task.chance
    const spent = success ? task.cost : task.cost / 2
    setSave(previous => ({
      ...previous,
      money: previous.money + (success ? task.reward : 0),
      inventory: { ...previous.inventory, [task.modelId]: previous.inventory[task.modelId] - spent },
      tasks: {
        ...previous.tasks,
        completed: success ? { ...previous.tasks.completed, [key]: true } : previous.tasks.completed,
      },
    }))
    setNotice(success
      ? `任务成功：${model.name} 完成工作，获得 ¥${task.reward}。`
      : `任务未通过验收，消耗 ${spent}M Token，可重新尝试。`)
  }

  const resetSave = () => {
    if (!window.confirm('确定重置抽卡存档吗？余额、Token 和升级都会恢复初始状态。')) return
    setSave({ ...DEFAULT_SAVE, upgrades: { ...DEFAULT_SAVE.upgrades }, lastPassiveAt: Date.now() })
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
            <div className={`gacha-reactor${revealing ? ' revealing' : ''}${results.some(r => r.model.tier === 'legendary') ? ' has-legendary' : ''}`}>
              <div className="gacha-reactor-hud top">
                <span>POOL / {TIER_META[TIER_ORDER[save.upgrades.lab]].name}</span>
                <span>DRAW / {save.totalDraws.toLocaleString()}</span>
              </div>
              <div className="gacha-reactor-hud bottom">
                <span>EV / ◈{expectedReturn}</span>
                <span>LAB / LV.{save.upgrades.lab}</span>
              </div>
              <div className="gacha-orbit orbit-one" />
              <div className="gacha-orbit orbit-two" />
              {!results.length ? (
                <div className="gacha-reactor-core">
                  <span>◈</span>
                  <strong>等待算力注入</strong>
                  <small>{save.upgrades.lab < 3 ? `当前仅开放至 ${TIER_META[TIER_ORDER[save.upgrades.lab]].name}模型` : `传说基础概率 ${rates.legendary.toFixed(1)}% · ${hardPity} 抽硬保底`}</small>
                </div>
              ) : (
                <div className={`gacha-results count-${Math.min(results.length, 10)}`}>
                  {results.slice(0, 10).map((result, index) => (
                    <ResultCard key={result.id} result={result} featured={results.length === 1 || (result.model.tier === 'legendary' && index === 0)} />
                  ))}
                  {results.length > 10 && <div className="gacha-more-results">其余 {results.length - 10} 张已收入仓库</div>}
                </div>
              )}
            </div>

            <div className="gacha-pity">
              <span><b>史诗保底</b><i style={{ width: `${save.upgrades.lab >= 2 ? Math.min(100, save.sinceEpic / 30 * 100) : 0}%` }} /></span>
              <em>{save.upgrades.lab >= 2 ? `${save.sinceEpic} / 30` : '未解锁'}</em>
              <span><b>传说保底</b><i style={{ width: `${save.upgrades.lab >= 3 ? Math.min(100, save.sinceLegendary / hardPity * 100) : 0}%` }} /></span>
              <em>{save.upgrades.lab >= 3 ? `${save.sinceLegendary} / ${hardPity}` : '未解锁'}</em>
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
              <p>连抽无额外折扣 · 当前升级减 {(discount * 100).toFixed(0)}% · 当前税后回收：现金约 {Math.round(expectedReturn / drawPrice(1, 'money'))}% / 算力约 {Math.round(expectedReturn / drawPrice(1, 'compute') * 100)}%</p>
              {save.upgrades.auto > 0 && (
                <div className="gacha-auto">
                  <button
                    className={save.autoDrawEnabled ? 'active' : ''}
                    onClick={() => setSave(previous => ({ ...previous, autoDrawEnabled: !previous.autoDrawEnabled, nextAutoAt: Date.now() + 60000 }))}
                  >
                    {save.autoDrawEnabled ? '暂停自动抽取' : '启动自动抽取'}
                  </button>
                  <select
                    value={save.autoCurrency}
                    onChange={event => setSave(previous => ({ ...previous, autoCurrency: event.target.value }))}
                    aria-label="自动抽取货币"
                  >
                    <option value="compute">算力点单抽</option>
                    <option value="money">人民币单抽</option>
                  </select>
                  <span>{save.autoDrawEnabled ? `${Math.max(0, Math.ceil((save.nextAutoAt - now) / 1000))}s 后执行` : '每 60 秒一次'}</span>
                </div>
              )}
            </div>
          </div>

          <aside className="gacha-sidebar">
            <div className="gacha-side-card">
              <span className="gacha-side-eyebrow">余额见底？</span>
              <h3>小游戏算力补给</h3>
              <p>反应测试和打 AI 会给算力点；合成大银鲸结算 DeepSeek Token；SEPA 手速测试结算 Claude Token。</p>
              <button onClick={runSupplyTask} disabled={countdown > 0}>
                {countdown ? `${countdown}s 后可领取` : `试玩补给 +${Math.round(180 * (1 + save.upgrades.income * 0.2))} 算力点`}
              </button>
            </div>
            <div className="gacha-side-card compact">
              <span>本期概率</span>
              {TIER_ORDER.map(tier => (
                <p key={tier}><i style={{ background: TIER_META[tier].color }} />{TIER_META[tier].name}<b>{rates[tier] ? `${rates[tier].toFixed(1)}%` : '锁定'}</b></p>
              ))}
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
            <p>升级明确分为收益效率与模型池解锁两类。</p>
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
            <div><span>02</span><h4>解锁更高级模型池</h4><p>升级前即可查看下一等级会加入哪些编程模型。</p></div>
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
            <p>游戏售价 = 2026 年 7 月市场参考价 ×1.2×100 算力点；在线每分钟结算，离线收益减半。</p>
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
                  <small>市场 ¥{gpu.marketPrice.toLocaleString()}</small>
                  <b>◈{(gpu.gamePrice * 100).toLocaleString()}</b>
                  <button onClick={() => buyGpu(gpu)}>购买</button>
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
                    <button className="gacha-sell-gpu" onClick={() => sellGpu(owned, gpu)}>卖出 ¥{Math.floor(gpu.marketPrice * 2 / 3).toLocaleString()}</button>
                  </article>
                )
              })}
            </div>
          )}
          <div className="gacha-rule-notes">
            <p><b>时间缓存：</b>整个网站打开时每 60 秒结算一次；关闭页面或隐藏标签后，按本地记录时间补算 50% 收益，单次最多补算 30 天。</p>
            <p><b>用途差异：</b>挖矿直接产生模拟人民币；运行 AI 产生已选择模型的 Token。高品质模型训练更慢，但兑换价值更高。</p>
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
            <p>−30 至 −1 的合计概率为 53%，+1 至 +30 为 46%，0 为 1%；每个区间内的整数等概率，因此单次期望约 −1.09%。提取另收 6% 服务费。切换功能标签不会重复结算。</p>
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
          {[['今日任务', DAILY_TASKS], ['本周任务', WEEKLY_TASKS]].map(([title, tasks]) => (
            <div className="gacha-task-group" key={title}>
              <h4>{title}<span>3 项</span></h4>
              <div className="gacha-task-grid">
                {tasks.map(task => {
                  const model = MODELS.find(item => item.id === task.modelId)
                  const period = task.id.startsWith('daily-') ? save.tasks.dailyKey : save.tasks.weeklyKey
                  const completed = save.tasks.completed[`${task.id}-${period}`]
                  const locked = model.minLab > save.upgrades.lab
                  return (
                    <article className="gacha-task-card" key={task.id}>
                      <ModelLogo model={model} />
                      <div>
                        <span>{model.name} · 成功率 {(task.chance * 100).toFixed(0)}%</span>
                        <h4>{task.name}</h4>
                        <p>{task.desc}</p>
                        <small>消耗 {task.cost}M · 成功奖励 ¥{task.reward}</small>
                      </div>
                      <button disabled={completed || locked} onClick={() => executeTask(task)}>
                        {completed ? '已完成' : locked ? `实验室 Lv.${model.minLab}` : '执行'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          ))}
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
            <article><span>当前税后价值</span><b>◈{expectedReturn} / 抽</b><small>初始现金回收约 44%</small></article>
            <article><span>Token 数量期望</span><b>1.895M / 抽</b><small>1wM 概率 0.002%</small></article>
            <article><span>高阶池状态</span><b>实验室 Lv.{save.upgrades.lab}</b><small>前期只抽普通模型</small></article>
          </div>
          <div className="gacha-table-wrap">
            <table className="gacha-model-table">
              <thead><tr><th>品质</th><th>模型</th><th>API 标价 $ / MTok</th><th>兑换基准</th><th>状态</th></tr></thead>
              <tbody>
                {MODELS.map(model => (
                  <tr key={model.id}>
                    <td><span className={`gacha-table-tier tier-${model.tier}`}>{TIER_META[model.tier].name}</span></td>
                    <td><b>{model.name}</b></td>
                    <td>{model.price}</td>
                    <td>◈ {model.cp.toLocaleString()} / M</td>
                    <td>{model.minLab <= save.upgrades.lab ? '池中' : `实验室 Lv.${model.minLab} 解锁`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gacha-token-odds">
            <h4>Token 额度概率（与模型品质独立抽取）</h4>
            {TOKEN_AMOUNTS.map(token => <span key={token.label}><b>{token.label}</b><small>{token.chance}%</small></span>)}
          </div>
          <div className="gacha-rule-notes">
            <p><b>解锁顺序：</b>初始只有普通模型；实验室 Lv.1 / 2 / 3 分别开放稀有、史诗、传说。传说池开放后，第 60 抽起进入软保底。</p>
            <p><b>模型与稀有度：</b>卡池保留 12 款市场常见编程 AI；低价模型归普通，中价主力归稀有，Opus 5 归史诗，最高价的 GPT-5.6 Sol 与 Claude Fable 5 归传说。</p>
            <p><b>定价原则：</b>公开 API 价格是品质和兑换基准的主要依据，再结合编码能力微调，不把美元标价直接当现金返还。</p>
            <p><b>经济曲线：</b>初始现金抽税后期望约 44%，算力抽因溢价更低；满级实验室、概率、税率和折扣后可超过 100%。Token 与算力点都不能兑换现金。</p>
            <p><b>其他资产：</b>股票每次重新进入时结算且为负期望；显卡可按市场参考价的三分之二卖出，卖出前会先结清本轮产出。</p>
          </div>
          <button className="gacha-reset" onClick={resetSave}>重置本机模拟存档</button>
        </section>
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
