import { useEffect, useMemo, useRef, useState } from 'react'
import { COMPANY_LOGO_URL } from './companyCatalog'
import { ECONOMY_SAVE_KEY, GPU_CATALOG, GPU_EARNING_MULTIPLIER, settlePassive } from './aiEconomy'

const SAVE_KEY = ECONOMY_SAVE_KEY
const TIER_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythical']
const TIER_META = {
  common: { name: '普通', color: '#7dd3fc' },
  rare: { name: '稀有', color: '#818cf8' },
  epic: { name: '史诗', color: '#c084fc' },
  legendary: { name: '传说', color: '#fbbf24' },
  mythical: { name: '神话', color: '#fb7185' },
}
const SAVE_VERSION = 4
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
  { id: 'gpt-41-mini', name: 'GPT-4.1 mini', brand: 'OpenAI', logo: 'openai', tier: 'common', price: '$0.40 / $1.60', cp: 220, minLab: 0, released: true },
  { id: 'gemini-25-flash-lite', name: 'Gemini 2.5 Flash-Lite', brand: 'Google', logo: 'google', tier: 'common', price: '$0.10 / $0.40', cp: 240, minLab: 0, released: true },
  { id: 'claude-35-haiku', name: 'Claude 3.5 Haiku', brand: 'Anthropic', logo: 'anthropic', tier: 'common', price: '$0.80 / $4.00', cp: 280, minLab: 0, released: true },
  { id: 'qwen25-coder-32b', name: 'Qwen2.5-Coder 32B', brand: 'Qwen', logo: 'alibabacloud', tier: 'common', price: '开源 / 接入价', cp: 300, minLab: 0, released: true },
  { id: 'codestral-2501', name: 'Codestral 25.01', brand: 'Mistral', logo: 'mistral', tier: 'common', price: '$0.30 / $0.90', cp: 340, minLab: 0, released: true },
  { id: 'deepseek-v32', name: 'DeepSeek V3.2', brand: 'DeepSeek', logo: 'deepseek', tier: 'common', price: '$0.28 / $0.42', cp: 380, minLab: 0, released: true },

  { id: 'gpt-5-mini', name: 'GPT-5 mini', brand: 'OpenAI', logo: 'openai', tier: 'rare', price: '$0.25 / $2.00', cp: 520, minLab: 0, released: true },
  { id: 'claude-haiku-45', name: 'Claude Haiku 4.5', brand: 'Anthropic', logo: 'anthropic', tier: 'rare', price: '$1.00 / $5.00', cp: 600, minLab: 0, released: true },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', brand: 'Google', logo: 'google', tier: 'rare', price: '$0.50 / $3.00', cp: 650, minLab: 0, released: true },
  { id: 'qwen3-coder', name: 'Qwen3-Coder 480B', brand: 'Qwen', logo: 'alibabacloud', tier: 'rare', price: '开源 / 接入价', cp: 720, minLab: 0, released: true },
  { id: 'grok-4-fast', name: 'Grok 4 Fast', brand: 'xAI', logo: 'x', tier: 'rare', price: '$0.20 / $0.50', cp: 760, minLab: 0, released: true },
  { id: 'devstral-2', name: 'Devstral 2', brand: 'Mistral', logo: 'mistral', tier: 'rare', price: '$0.40 / $2.00', cp: 820, minLab: 0, released: true },
  { id: 'deepseek-v4', name: 'DeepSeek V4 Flash', brand: 'DeepSeek', logo: 'deepseek', tier: 'rare', price: '$0.35 / $1.40', cp: 880, minLab: 0, released: true },

  { id: 'gpt-53-codex', name: 'GPT-5.3-Codex', brand: 'OpenAI', logo: 'openai', tier: 'epic', price: '$1.75 / $14.00', cp: 1180, minLab: 0, released: true },
  { id: 'gpt-55', name: 'GPT-5.5', brand: 'OpenAI', logo: 'openai', tier: 'epic', price: '$5.00 / $30.00', cp: 1450, minLab: 0, released: true },
  { id: 'claude-sonnet-46', name: 'Claude Sonnet 4.6', brand: 'Anthropic', logo: 'anthropic', tier: 'epic', price: '$3.00 / $15.00', cp: 1500, minLab: 0, released: true },
  { id: 'gemini-31-pro', name: 'Gemini 3.1 Pro', brand: 'Google', logo: 'google', tier: 'epic', price: '$2.00 / $12.00', cp: 1550, minLab: 0, released: true },
  { id: 'gemini-35-flash', name: 'Gemini 3.5 Flash', brand: 'Google', logo: 'google', tier: 'epic', price: '$1.50 / $9.00', cp: 1700, minLab: 0, released: true },
  { id: 'deepseek-v4-final', name: 'DeepSeek V4 Pro', brand: 'DeepSeek', logo: 'deepseek', tier: 'epic', price: '$2.00 / $8.00', cp: 1760, minLab: 0, released: true },
  { id: 'qwen-36-plus', name: 'Qwen 3.6 Plus', brand: 'Qwen', logo: 'alibabacloud', tier: 'epic', price: '公开接入价', cp: 1820, minLab: 0, released: true },
  { id: 'glm-52', name: 'GLM-5.2', brand: 'Z.ai', logo: 'zhipuai', tier: 'epic', price: '开源 / 接入价', cp: 1950, minLab: 0, released: true },

  { id: 'gpt-56-luna', name: 'GPT-5.6 Luna', brand: 'OpenAI', logo: 'openai', tier: 'legendary', price: '$1.00 / $6.00', cp: 2450, minLab: 3, released: true },
  { id: 'gpt-56-terra', name: 'GPT-5.6 Terra', brand: 'OpenAI', logo: 'openai', tier: 'legendary', price: '$2.50 / $15.00', cp: 2700, minLab: 3, released: true },
  { id: 'claude-opus-48', name: 'Claude Opus 4.8', brand: 'Anthropic', logo: 'anthropic', tier: 'legendary', price: '$5.00 / $25.00', cp: 2850, minLab: 3, released: true },
  { id: 'grok-45', name: 'Grok 4.5', brand: 'xAI', logo: 'x', tier: 'legendary', price: '$2.00 / $6.00', cp: 3000, minLab: 3, released: true },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', brand: 'Anthropic', logo: 'anthropic', tier: 'legendary', price: '$3.00 / $15.00', cp: 3150, minLab: 3, released: true },
  { id: 'claude-mythos-5', name: 'Claude Mythos 5', brand: 'Anthropic', logo: 'anthropic', tier: 'legendary', price: '受限开放', cp: 3280, minLab: 3, released: true },
  { id: 'claude-fable-5', name: 'Claude Fable 5', brand: 'Anthropic', logo: 'anthropic', tier: 'legendary', price: '公开服务价', cp: 3400, minLab: 3, released: true },
  { id: 'gpt-56-sol', name: 'GPT-5.6 Sol', brand: 'OpenAI', logo: 'openai', tier: 'legendary', price: '$5.00 / $30.00', cp: 3600, minLab: 3, released: true },

  { id: 'gpt-6', name: 'GPT-6', brand: 'OpenAI', logo: 'openai', tier: 'mythical', price: '未发布 · 预测', cp: 6400, minLab: 4, released: false },
  { id: 'deepseek-v5', name: 'DeepSeek V5', brand: 'DeepSeek', logo: 'deepseek', tier: 'mythical', price: '未发布 · 预测', cp: 6600, minLab: 4, released: false },
  { id: 'gemini-4-ultra', name: 'Gemini 4 Ultra', brand: 'Google', logo: 'google', tier: 'mythical', price: '未发布 · 预测', cp: 6800, minLab: 4, released: false },
  { id: 'grok-5', name: 'Grok 5', brand: 'xAI', logo: 'x', tier: 'mythical', price: '未发布 · 预测', cp: 7000, minLab: 4, released: false },
  { id: 'claude-fable-6', name: 'Claude Fable 6', brand: 'Anthropic', logo: 'anthropic', tier: 'mythical', price: '未发布 · 预测', cp: 7200, minLab: 4, released: false },
  { id: 'gpt-7', name: 'GPT-7', brand: 'OpenAI', logo: 'openai', tier: 'mythical', price: '未发布 · 远期预测', cp: 7600, minLab: 4, released: false },
  { id: 'claude-opus-6', name: 'Claude Opus 6', brand: 'Anthropic', logo: 'anthropic', tier: 'mythical', price: '未发布 · 预测', cp: 7800, minLab: 4, released: false },
  { id: 'gemini-5-ultra', name: 'Gemini 5 Ultra', brand: 'Google', logo: 'google', tier: 'mythical', price: '未发布 · 远期预测', cp: 8000, minLab: 4, released: false },
]

const LEGACY_MODEL_IDS = {
  'grok-build': 'grok-4-fast',
  'claude-opus-5': 'claude-opus-48',
  'gpt-57-code': 'gpt-53-codex',
}

const TOKEN_AMOUNTS = [
  { amount: 1, label: '1M' },
  { amount: 2, label: '2M' },
  { amount: 5, label: '5M' },
  { amount: 10, label: '10M' },
  { amount: 20, label: '20M' },
  { amount: 50, label: '50M' },
  { amount: 100, label: '100M' },
  { amount: 500, label: '500M' },
  { amount: 1000, label: '1000M' },
  { amount: 10000, label: '1wM' },
]

const TOKEN_RATE_LEVELS = [
  [94, 3.5, 1.5, .5, .25, .12, .07, .04, .018, .002],
  [89, 5.5, 2.8, 1.2, .7, .4, .22, .12, .05, .01],
  [82, 8, 4.5, 2.4, 1.4, .8, .45, .3, .13, .02],
  [72, 11, 7, 4, 2.5, 1.5, 1, .65, .3, .05],
  [60, 14, 10, 6, 4, 2.5, 1.6, 1.1, .7, .1],
  [45, 17, 13, 9, 6, 4, 2.5, 1.8, 1.4, .3],
]

const GRAY_WORK_RANGES = {
  common: [20, 150],
  rare: [30, 200],
  epic: [50, 300],
  legendary: [80, 500],
  mythical: [100, 1000],
}

const UPGRADE_DEFS = {
  batch: { icon: '▦', name: '并行抽取协议', desc: '依次解锁 20 / 50 / 100 连抽', story: '通过并行队列跑完高并发抽取项目，让更多请求能在同一批次完成。', max: 3, base: 24 },
  income: { icon: '↗', name: '小游戏加速器', desc: '补给任务收益每级 +20%', story: '通过推荐模型跑完小游戏增长项目，提高了每次挑战带回的算力收益。', max: 5, base: 14 },
  discount: { icon: '％', name: '采购议价器', desc: '抽取价格每级 -5%，十连也靠它打折', story: '通过成本模型跑完供应商议价项目，压低了人民币和算力点的采购成本。', max: 5, base: 18 },
  lab: { icon: '⌬', name: '模型概率引擎', desc: '逐级提高高档模型概率；Lv.3 开传说，满级普通仅 20%', story: '通过模型路由与评测项目，独立提高高档模型进入抽取池的权重，不影响 Token 数量。', max: 4, base: 22 },
  luck: { icon: '✦', name: 'Token 额度扩容', desc: '逐级提高大额 Token 概率，不影响模型档位', story: '通过额度调度与尾部概率校准项目，让大额请求更常出现，同时保持模型概率完全独立。', max: 5, base: 28 },
  auto: { icon: '⟳', name: '自动抽取队列', desc: '从每 60 秒单抽升级到每秒十连', story: '通过代理模型跑完无人值守与高并发队列项目，让抽取终端逐步达到每秒十连。', max: 6, base: 36 },
  pity: { icon: '↓', name: '保底压缩器', desc: '传说硬保底每级降低 5 抽', story: '通过异常检测模型跑完坏运气修正项目，缩短了触发传说保底所需的队列。', max: 5, base: 26 },
  taskSlots: { icon: '☷', name: '任务并发额度', desc: '提高每日与每周可执行次数，满级无限', story: '通过调度模型跑完任务队列扩容项目，让更多互联网订单能够同时进入生产。', max: 4, base: 20 },
  taskQuota: { icon: '▤', name: '任务额度升级', desc: '提高单次任务消耗与合同金额', story: '通过商务模型跑完大客户额度审批项目，解锁了更高 Token 预算的互联网订单。', max: 5, base: 24 },
  taskProfit: { icon: '↟', name: '任务利润优化', desc: '每级提高任务收入 25%', story: '通过财务模型跑完报价与交付优化项目，提高了每份任务的实际利润。', max: 5, base: 30 },
}

const VALUE_UPGRADE_KEYS = ['discount', 'luck', 'pity', 'batch', 'income', 'auto', 'taskSlots', 'taskQuota', 'taskProfit']

const WORK_JOBS = [
  { id: 'labeling', name: '数据标注兼职', desc: '给训练数据分类、纠错和补标签。', duration: 30000, reward: 140, happinessCost: 2, tag: '短工' },
  { id: 'support', name: '在线客服值班', desc: '回复工单、整理常见问题并安抚客户。', duration: 60000, reward: 300, happinessCost: 4, tag: '标准' },
  { id: 'server', name: '机房夜班巡检', desc: '检查温度、日志和异常显卡节点。', duration: 90000, reward: 470, happinessCost: 6, tag: '稳定' },
  { id: 'bugfix', name: '紧急修复外包', desc: '接手线上故障并提交一个能用的修复。', duration: 120000, reward: 660, happinessCost: 8, tag: '技术岗' },
  { id: 'evaluation', name: '模型评测合同', desc: '运行测试集并整理能力与安全报告。', duration: 180000, reward: 1020, happinessCost: 12, tag: '高薪' },
  { id: 'consulting', name: '系统架构顾问', desc: '完成一次方案评审与成本优化建议。', duration: 300000, reward: 1800, happinessCost: 18, tag: '长期' },
]

const DAILY_TASKS = [
  { id: 'daily-api', name: '修复支付 API 告警', desc: '排查接口超时并补上回归测试。', modelId: 'deepseek-v32', cost: 0.2, chance: 0.88, reward: 24 },
  { id: 'daily-docs', name: '整理开源项目文档', desc: '补齐安装、配置和故障排查说明。', modelId: 'qwen3-coder', cost: 0.2, chance: 0.9, reward: 22 },
  { id: 'daily-ui', name: '检查移动端页面', desc: '找出布局溢出和交互可用性问题。', modelId: 'gpt-41-mini', cost: 0.2, chance: 0.86, reward: 28 },
]

const WEEKLY_TASKS = [
  { id: 'weekly-repo', name: '迁移大型 Monorepo', desc: '升级依赖并让完整测试矩阵通过。', modelId: 'gemini-35-flash', cost: 0.8, chance: 0.82, reward: 180 },
  { id: 'weekly-incident', name: '复盘生产事故', desc: '跨日志、代码和监控定位真正根因。', modelId: 'claude-sonnet-5', cost: 0.8, chance: 0.9, reward: 320 },
  { id: 'weekly-compiler', name: '重构编译工具链', desc: '完成长时间自主编码与性能验证。', modelId: 'gpt-56-sol', cost: 0.8, chance: 0.94, reward: 480 },
]

const LIFE_GOALS = {
  house: {
    name: '房子',
    icon: '⌂',
    levels: [
      { name: '温馨小屋', price: 200000, desc: '终于有一个放得下显卡和自己的小窝。' },
      { name: '城市大平层', price: 1000000, desc: '给机房、书房和生活都留出足够空间。' },
      { name: '海景智能别墅', price: 5000000, desc: '带独立机房、花园和永远看不完的海。' },
    ],
  },
  car: {
    name: '车子',
    icon: '◇',
    levels: [
      { name: '二手通勤车', price: 500000, desc: '能可靠地把你送到下一个项目现场。' },
      { name: '豪华智能电车', price: 2000000, desc: '自动驾驶和算力座舱终于都安排上了。' },
      { name: '限量未来超跑', price: 10000000, desc: '速度、设计和回头率全部拉满。' },
    ],
  },
  partner: {
    name: '女友',
    icon: '♡',
    levels: [
      { name: '心动相遇', price: 1000000, desc: '准备约会基金，遇见愿意理解你的人。' },
      { name: '稳定伴侣', price: 5000000, desc: '一起旅行、生活，也一起面对项目延期。' },
      { name: '人生搭档', price: 20000000, desc: '不是购买一个人，而是投入共同生活与未来。' },
    ],
  },
}

const FEMINIZATION_GOAL = {
  name: '投资女装',
  levels: [
    { name: '购买服装', price: 10000, desc: '购入第一套女装，幸福度回满。' },
    { name: '开始吃药', price: 100000, desc: '进入下一阶段，幸福度回满。' },
    { name: '完成手术', price: 1000000, desc: '完成特殊目标并触发恶坠结局。' },
  ],
}

const VENTURE_BANDS = [
  { id: 'seed', min: 100000, max: 499999, label: '10万–49万', prefixes: ['像素', '青柠', '微光', '纸飞机', '小鲸', '云芽', '松果', '星尘', '薄荷', '代码'], fields: ['工作室', '数据', '软件', '机器人', '网络'] },
  { id: 'growth', min: 500000, max: 1999999, label: '50万–199万', prefixes: ['远望', '矩阵', '蓝海', '灵犀', '极昼', '脉冲', '天穹', '启明', '涌现', '光年'], fields: ['智能', '科技', '算力', '系统', '云服务'] },
  { id: 'scale', min: 2000000, max: 9999999, label: '200万–999万', prefixes: ['寰宇', '量子', '万象', '超弦', '深空', '奇点', '泰坦', '昆仑', '长城', '银河'], fields: ['产业集团', '人工智能', '芯片科技', '具身智能', '基础设施'] },
  { id: 'mega', min: 10000000, max: Infinity, label: '1000万以上', prefixes: ['新纪元', '地平线', '联合未来', '全球智算', '星际资本', '创世引擎', '太初', '世界模型', '超级智能', '文明跃迁'], fields: ['控股', '研究院', '生态集团', '技术联盟', '产业基金'] },
]

function venturePool(amount) {
  const band = VENTURE_BANDS.find(item => amount >= item.min && amount <= item.max) || VENTURE_BANDS[VENTURE_BANDS.length - 1]
  return {
    ...band,
    companies: band.prefixes.flatMap((prefix, prefixIndex) =>
      band.fields.map((field, fieldIndex) => ({
        id: `${band.id}-${prefixIndex}-${fieldIndex}`,
        name: `${prefix}${field}`,
        sector: ['AI 招聘平台', '企业软件', '编程智能体', '算力服务', '机器人团队'][(prefixIndex + fieldIndex) % 5],
        risk: ['保守扩张', '稳健增长', '高波动押注'][(prefixIndex * 2 + fieldIndex) % 3],
      }))
    ),
  }
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
  gpuPending: { money: 0, tokens: {} },
  lastPassiveAt: Date.now(),
  taskReadyAt: 0,
  tasks: { dailyKey: '', weeklyKey: '', completed: {}, runs: { daily: 0, weekly: 0 }, grayHistory: [], hookHistory: [] },
  autoDrawEnabled: false,
  autoCurrency: 'compute',
  nextAutoAt: 0,
  stocks: { balance: 0, principal: 0, history: [], lastEntrySettlementAt: 0 },
  venture: { active: null, totalInvested: 0, totalReturned: 0, history: [] },
  lifeGoals: { house: 0, car: 0, partner: 0, victoryShown: false },
  lifeExtras: { cakes: 0, pcVisits: 0, feminization: 0 },
  status: { happiness: 100, health: 100, corruption: 0, hasHiv: false, infectedCount: 0, ending: null },
  work: { active: null, completed: 0, totalEarned: 0, history: [] },
  redeemedCodes: {},
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
  const level = Math.max(0, Math.min(4, lab))
  const baseRates = [
    { common: 80, rare: 18, epic: 2, legendary: 0, mythical: 0 },
    { common: 67, rare: 27, epic: 6, legendary: 0, mythical: 0 },
    { common: 52, rare: 33, epic: 15, legendary: 0, mythical: 0 },
    { common: 38, rare: 35, epic: 24, legendary: 3, mythical: 0 },
    { common: 20, rare: 35, epic: 30, legendary: 14.97, mythical: 0.03 },
  ][level]
  if (level < 3 || softPity <= 0) return baseRates
  const pityBoost = Math.min(softPity, Math.max(0, baseRates.common - 5) / 1.5)
  return {
    ...baseRates,
    common: baseRates.common - pityBoost * 1.5,
    epic: baseRates.epic + pityBoost * .5,
    legendary: baseRates.legendary + pityBoost,
  }
}

function tokenPool(luck = 0) {
  const level = Math.max(0, Math.min(5, luck))
  return TOKEN_AMOUNTS.map((token, index) => ({
    ...token,
    chance: TOKEN_RATE_LEVELS[level][index],
    weight: TOKEN_RATE_LEVELS[level][index],
  }))
}

function tokenEffect(amount) {
  if (amount >= 1000) return { id: 'storm', name: '奇点风暴' }
  if (amount >= 100) return { id: 'rainbow', name: '虹彩跃迁' }
  if (amount >= 10) return { id: 'wave', name: '额度波纹' }
  if (amount >= 2) return { id: 'glow', name: '能量流光' }
  return { id: 'base', name: '标准额度' }
}

function drawStats(luck = 0, lab = 0) {
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
        rarityRates[model.tier] += probability * 100
        expected += probability * value
      })
    })
  })

  return { rarityRates, expected: Math.round(expected) }
}

function drawCombination(luck = 0, lab = 0, softPity = 0, minimumTier = null) {
  const modelRates = modelTierRates(lab, softPity)
  const tokens = tokenPool(luck)
  const mythicalModels = MODELS.filter(model => model.tier === 'mythical' && model.minLab <= lab)
  if (mythicalModels.length && Math.random() < 0.0003) {
    const model = mythicalModels[Math.floor(Math.random() * mythicalModels.length)]
    const token = weightedPick(tokens, 'weight')
    return { model, token, value: model.cp * token.amount, rarity: model.tier }
  }

  const availableModels = MODELS.filter(model => model.minLab <= lab && model.tier !== 'mythical')
  const combinations = availableModels.flatMap(model => {
    const modelCount = availableModels.filter(item => item.tier === model.tier).length
    return tokens.map(token => {
      const value = model.cp * token.amount
      return {
        model,
        token,
        value,
        rarity: model.tier,
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

function formatDuration(duration) {
  if (duration < 60000) return `${Math.round(duration / 1000)} 秒`
  const minutes = Math.floor(duration / 60000)
  const seconds = Math.round((duration % 60000) / 1000)
  return seconds ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分钟`
}

function clampStat(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0))
}

function hookIncomeMultiplier(corruption = 0) {
  return 1 + Math.floor(Math.max(0, corruption) / 10) * 0.1
}

function pcPriceFor(corruption = 0) {
  const discount = Math.floor(Math.max(0, -corruption) / 10) * 0.05
  return Math.round(10000 * Math.max(0.5, 1 - discount))
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
  if (result.model.tier === 'mythical') return `神话级未发布模型 ${result.model.name} 降临！`
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
  return { common: 1, rare: 1.4, epic: 2, legendary: 3.5, mythical: 6 }[model.tier]
}

function upgradeCost(key, level) {
  const def = UPGRADE_DEFS[key]
  const tier = key === 'lab'
    ? ['common', 'rare', 'epic', 'legendary'][level]
    : level < 1 ? 'common' : level < 3 ? 'rare' : 'epic'
  return { tier, amount: Math.round(def.base * Math.pow(1.75, level)) }
}

function getInitialSave() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY))
    if (!stored) return DEFAULT_SAVE
    const isLegacySave = (stored.saveVersion || 1) < 2
    const { tax: legacyTax, ...storedUpgrades } = stored.upgrades || {}
    const { serviceFee: legacyServiceFee, ...storedStocks } = stored.stocks || {}
    const { diseasePending: legacyDiseasePending, ...storedLifeExtras } = stored.lifeExtras || {}
    const inventory = { ...(stored.inventory || {}) }
    Object.entries(LEGACY_MODEL_IDS).forEach(([legacyId, currentId]) => {
      if (!inventory[legacyId]) return
      inventory[currentId] = (inventory[currentId] || 0) + inventory[legacyId]
      delete inventory[legacyId]
    })
    return {
      ...DEFAULT_SAVE,
      ...stored,
      saveVersion: SAVE_VERSION,
      money: isLegacySave ? Number(stored.money || 0) + 900 : (stored.money ?? DEFAULT_SAVE.money),
      upgrades: { ...DEFAULT_SAVE.upgrades, ...storedUpgrades },
      inventory,
      history: stored.history || [],
      gpus: stored.gpus || [],
      gpuPending: {
        ...DEFAULT_SAVE.gpuPending,
        ...(stored.gpuPending || {}),
        tokens: stored.gpuPending?.tokens || {},
      },
      tasks: {
        ...DEFAULT_SAVE.tasks,
        ...(stored.tasks || {}),
        completed: stored.tasks?.completed || {},
        runs: { ...DEFAULT_SAVE.tasks.runs, ...(stored.tasks?.runs || {}) },
      },
      stocks: { ...DEFAULT_SAVE.stocks, ...storedStocks },
      venture: {
        ...DEFAULT_SAVE.venture,
        ...(stored.venture || {}),
        history: stored.venture?.history || [],
      },
      lifeGoals: { ...DEFAULT_SAVE.lifeGoals, ...(stored.lifeGoals || {}) },
      lifeExtras: { ...DEFAULT_SAVE.lifeExtras, ...storedLifeExtras },
      status: {
        ...DEFAULT_SAVE.status,
        ...(stored.status || {}),
        corruption: stored.status?.corruption ?? clampStat(100 - (stored.chastity ?? 100), -100, 100),
        hasHiv: stored.status?.hasHiv ?? Boolean(legacyDiseasePending),
        infectedCount: stored.status?.infectedCount ?? (legacyDiseasePending ? 1 : 0),
      },
      work: {
        ...DEFAULT_SAVE.work,
        ...(stored.work || {}),
        history: stored.work?.history || [],
      },
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
  const effect = tokenEffect(result.token.amount)
  return (
    <article className={`gacha-result-card tier-${result.rarity} token-fx-${effect.id}${featured ? ' featured' : ''}`} style={{ '--tier': meta.color }}>
      <div className="gacha-card-rays" />
      <span className="gacha-tier-label">{meta.name}</span>
      <ModelLogo model={result.model} />
      <strong>{result.model.name}</strong>
      <b className="gacha-token-amount">{result.token.label} Token</b>
      <small>{effect.name} · 总价值 ◈ {result.value.toLocaleString()}</small>
    </article>
  )
}

function StockCandlestickChart({ history }) {
  const canvasRef = useRef(null)
  const candles = useMemo(() => history.slice(0, 24).reverse().map(item => {
    const open = Number(item.open ?? item.before ?? 0)
    const close = Number(item.close ?? item.after ?? open)
    return {
      ...item,
      open,
      close,
      high: Number(item.high ?? Math.max(open, close) * 1.02),
      low: Number(item.low ?? Math.max(0, Math.min(open, close) * 0.98)),
    }
  }), [history])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const draw = () => {
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(320, bounds.width)
      const height = Math.max(220, bounds.height)
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      const context = canvas.getContext('2d')
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)

      const plot = { left: 14, top: 16, right: width - 64, bottom: height - 28 }
      context.strokeStyle = 'rgba(148, 163, 184, .12)'
      context.lineWidth = 1
      context.fillStyle = '#718096'
      context.font = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
      context.textAlign = 'left'

      if (!candles.length) {
        context.fillStyle = '#7f8ca5'
        context.font = '12px system-ui, sans-serif'
        context.textAlign = 'center'
        context.fillText('投入资金并完成结算后，这里会生成 K 线', width / 2, height / 2)
        return
      }

      const values = candles.flatMap(candle => [candle.high, candle.low])
      const rawMin = Math.min(...values)
      const rawMax = Math.max(...values)
      const padding = Math.max(1, (rawMax - rawMin) * 0.08)
      const minValue = Math.max(0, rawMin - padding)
      const maxValue = rawMax + padding
      const valueRange = Math.max(1, maxValue - minValue)
      const yFor = value => plot.bottom - ((value - minValue) / valueRange) * (plot.bottom - plot.top)

      for (let tick = 0; tick <= 4; tick += 1) {
        const y = plot.top + (plot.bottom - plot.top) * tick / 4
        const value = maxValue - valueRange * tick / 4
        context.beginPath()
        context.moveTo(plot.left, y)
        context.lineTo(plot.right, y)
        context.stroke()
        context.fillStyle = '#718096'
        context.textAlign = 'left'
        context.fillText(`¥${value >= 10000 ? `${(value / 10000).toFixed(1)}w` : value.toFixed(0)}`, plot.right + 8, y + 3)
      }

      const step = (plot.right - plot.left) / candles.length
      const bodyWidth = Math.max(3, Math.min(14, step * 0.58))
      candles.forEach((candle, index) => {
        const x = plot.left + step * (index + 0.5)
        const openY = yFor(candle.open)
        const closeY = yFor(candle.close)
        const highY = yFor(candle.high)
        const lowY = yFor(candle.low)
        const rising = candle.close >= candle.open
        const color = rising ? '#4ade80' : '#fb7185'
        context.strokeStyle = color
        context.fillStyle = color
        context.lineWidth = 1.25
        context.beginPath()
        context.moveTo(x, highY)
        context.lineTo(x, lowY)
        context.stroke()
        const bodyTop = Math.min(openY, closeY)
        const bodyHeight = Math.max(2, Math.abs(closeY - openY))
        if (rising) {
          context.strokeRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight)
        } else {
          context.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight)
        }
      })

      const labelIndexes = [...new Set([0, Math.floor((candles.length - 1) / 2), candles.length - 1])]
      context.fillStyle = '#718096'
      context.textAlign = 'center'
      labelIndexes.forEach(index => {
        const candle = candles[index]
        const x = plot.left + step * (index + 0.5)
        context.fillText(new Date(candle.at).toLocaleString(undefined, {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }), x, height - 8)
      })
    }

    draw()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', draw)
      return () => window.removeEventListener('resize', draw)
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [candles])

  return (
    <section className="gacha-stock-chart" aria-labelledby="gacha-stock-chart-title">
      <header>
        <div>
          <span>MARKET CANDLES</span>
          <h4 id="gacha-stock-chart-title">最近 24 次更新 K 线</h4>
        </div>
        <div className="gacha-stock-legend" aria-label="K 线图例">
          <span className="up"><i />上涨</span>
          <span className="down"><i />下跌</span>
          <small>{candles.length} / 24 根</small>
        </div>
      </header>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`股票账户最近 ${candles.length} 次结算的 K 线图`}
      />
    </section>
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
  const [ventureAmount, setVentureAmount] = useState('')
  const [redeemInput, setRedeemInput] = useState('')
  const [victoryOpen, setVictoryOpen] = useState(false)
  const [lifeEvent, setLifeEvent] = useState(null)
  const [jackpots, setJackpots] = useState([])
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
    if (save.status?.ending && lifeEvent?.type !== 'ending') {
      setLifeEvent({ type: 'ending', kind: save.status.ending })
    }
  }, [save.status?.ending, lifeEvent?.type])

  useEffect(() => {
    const active = save.work?.active
    if (!active || now < active.finishAt) return
    const job = WORK_JOBS.find(item => item.id === active.jobId)
    if (!job) {
      setSave(previous => ({ ...previous, work: { ...previous.work, active: null } }))
      return
    }
    const record = { id: `${active.finishAt}-${job.id}`, jobId: job.id, reward: job.reward, at: active.finishAt }
    const workingPastZero = (save.status?.happiness ?? 100) <= 0
    setSave(previous => {
      if (previous.work?.active?.finishAt !== active.finishAt) return previous
      const status = { ...DEFAULT_SAVE.status, ...(previous.status || {}) }
      const exhausted = status.happiness <= 0
      return {
        ...previous,
        money: previous.money + job.reward,
        status: {
          ...status,
          happiness: exhausted ? 0 : Math.max(0, status.happiness - job.happinessCost),
          health: exhausted ? Math.max(0, status.health - job.happinessCost) : status.health,
        },
        work: {
          ...previous.work,
          active: null,
          completed: (previous.work.completed || 0) + 1,
          totalEarned: (previous.work.totalEarned || 0) + job.reward,
          history: [record, ...(previous.work.history || [])].slice(0, 10),
        },
      }
    })
    setNotice(workingPastZero
      ? `打工完成：工资到账 ¥${job.reward.toLocaleString()}；幸福度已经为 0，本次健康度 −${job.happinessCost}。`
      : `打工完成：工资到账 ¥${job.reward.toLocaleString()}，幸福度 −${job.happinessCost}。`)
  }, [now, save.work?.active])

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
      const after = stocks.balance
      const swing = before * (0.015 + Math.random() * 0.085)
      const high = Math.max(before, after) + swing * (0.35 + Math.random() * 0.65)
      const low = Math.max(0, Math.min(before, after) - swing * (0.35 + Math.random() * 0.65))
      stocks.history = [{
        at: enteredAt,
        rate: returnRate,
        before,
        after,
        open: before,
        close: after,
        high,
        low,
      }, ...(stocks.history || [])].slice(0, 24)
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
        ...previous.tasks,
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

  const discount = save.upgrades.discount * 0.05
  const hardPity = 80 - save.upgrades.pity * 5
  const availableModels = MODELS.filter(model => model.minLab <= save.upgrades.lab)
  const currentAuto = autoConfig(save.upgrades.auto)
  const stats = useMemo(
    () => drawStats(save.upgrades.luck, save.upgrades.lab),
    [save.upgrades.luck, save.upgrades.lab],
  )

  const drawPrice = (count, type = currency) => {
    const base = type === 'money' ? 10 : 1500
    const value = base * count * (1 - discount)
    return type === 'money' ? Number(value.toFixed(2)) : Math.round(value)
  }

  const expectedReturn = stats.expected
  const maxExpectedReturn = useMemo(() => drawStats(5, 4).expected, [])

  const playSound = (tier) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      const context = new AudioContext()
      const notes = tier === 'mythical'
        ? [523, 659, 784, 1046, 1318, 1568]
        : tier === 'legendary' ? [392, 523, 659, 784, 1046] : tier === 'epic' ? [330, 440, 660] : [330, 494]
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = tier === 'mythical' || tier === 'legendary' ? 'triangle' : 'sine'
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
      const minimumTier = next.upgrades.lab >= 3 && next.sinceLegendary >= hardPity - 1
        ? 'legendary'
        : next.sinceEpic >= 29
          ? 'epic'
          : null
      const softPity = next.upgrades.lab >= 3 && next.sinceLegendary >= 59 ? Math.min(4, (next.sinceLegendary - 58) * 0.16) : 0
      const combination = drawCombination(next.upgrades.luck, next.upgrades.lab, softPity, minimumTier)
      const { model, token, value, rarity } = combination
      const result = { model, token, value, rarity, id: `${Date.now()}-${index}-${Math.random()}` }
      pulled.push(result)
      next.inventory[model.id] = (next.inventory[model.id] || 0) + token.amount
      next.sinceLegendary = next.upgrades.lab < 3 || TIER_ORDER.indexOf(rarity) >= TIER_ORDER.indexOf('legendary') ? 0 : next.sinceLegendary + 1
      next.sinceEpic = TIER_ORDER.indexOf(rarity) >= TIER_ORDER.indexOf('epic') ? 0 : next.sinceEpic + 1
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
      .filter(result => TIER_ORDER.indexOf(result.rarity) >= TIER_ORDER.indexOf('legendary'))
      .sort((a, b) => TIER_ORDER.indexOf(b.rarity) - TIER_ORDER.indexOf(a.rarity) || b.value - a.value)
    if (legendaryHits.length) setJackpots(previous => [...previous, ...(count > 1 ? [legendaryHits[0]] : legendaryHits)])
    clearTimeout(revealTimer.current)
    revealTimer.current = setTimeout(() => setRevealing(false), bestTier >= 3 ? 1700 : 850)
    setNotice('')
  }

  useEffect(() => {
    if (tab !== 'draw' || jackpots.length || !save.upgrades.auto || !save.autoDrawEnabled || now < (save.nextAutoAt || 0)) return
    const config = autoConfig(save.upgrades.auto)
    doDraw(config.count, save.autoCurrency || 'compute', true)
  }, [now, tab, jackpots.length, save.autoDrawEnabled, save.autoCurrency, save.nextAutoAt, save.upgrades.auto]) // eslint-disable-line react-hooks/exhaustive-deps

  const exchange = (model, requested) => {
    const owned = save.inventory[model.id] || 0
    const amount = requested === 'all' ? owned : Math.min(requested, owned)
    if (amount <= 0) return
    const gained = Math.floor(amount * model.cp)
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
      gained += Math.floor(amount * model.cp)
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
    setSave(previous => {
      const settled = settlePassive(previous, Date.now(), 1).save
      return {
        ...settled,
        money: currencyType === 'money' ? settled.money - price : settled.money,
        compute: currencyType === 'compute' ? settled.compute - price : settled.compute,
        gpus: [...settled.gpus, {
          uid: `${gpu.id}-${Date.now()}-${Math.random()}`,
          gpuId: gpu.id,
          mode: 'idle',
          modelId: 'deepseek-v4',
          modelFactor: 1,
        }],
      }
    })
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

  const claimGpuEarnings = () => {
    const settled = settlePassive(save, Date.now(), 1).save
    const pendingMoney = settled.gpuPending?.money || 0
    const pendingTokens = settled.gpuPending?.tokens || {}
    const pendingTokenTotal = Object.values(pendingTokens).reduce((sum, amount) => sum + amount, 0)
    if (pendingMoney <= 0 && pendingTokenTotal <= 0) {
      setSave(settled)
      setNotice('当前还没有可领取的显卡收益。')
      return
    }
    const inventory = { ...settled.inventory }
    Object.entries(pendingTokens).forEach(([modelId, amount]) => {
      inventory[modelId] = (inventory[modelId] || 0) + amount
    })
    setSave({
      ...settled,
      money: settled.money + pendingMoney,
      inventory,
      gpuPending: { money: 0, tokens: {} },
    })
    setNotice(`显卡收益已领取：¥${pendingMoney.toFixed(2)} 与 ${formatToken(pendingTokenTotal)} Token，待领取收益已归零。`)
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
    setSave(previous => ({
      ...previous,
      money: previous.money + amount,
      stocks: {
        ...previous.stocks,
        balance: previous.stocks.balance - amount,
        principal: requested === 'all' ? 0 : Math.max(0, previous.stocks.principal - amount),
      },
    }))
    setStockAmount('')
    setNotice(`已从股票账户提取 ¥${amount.toFixed(2)}，全额到账。`)
  }

  const startVentureInvestment = () => {
    const amount = Number(ventureAmount)
    if (save.venture?.active) {
      setNotice('请先从当前生成的 3 家候选企业中选择一家。')
      return
    }
    if (!Number.isFinite(amount) || amount < 100000) {
      setNotice('企业投资最低需要 ¥100,000。')
      return
    }
    if (amount > save.money) {
      setNotice('现金余额不足，无法完成这笔企业投资。')
      return
    }
    const band = venturePool(amount)
    const candidates = [...band.companies]
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1))
      ;[candidates[index], candidates[swap]] = [candidates[swap], candidates[index]]
    }
    const active = {
      id: `${Date.now()}-${Math.random()}`,
      amount,
      bandId: band.id,
      bandLabel: band.label,
      candidates: candidates.slice(0, 3),
      startedAt: Date.now(),
    }
    setSave(previous => ({
      ...previous,
      money: previous.money - amount,
      venture: {
        ...previous.venture,
        active,
        totalInvested: (previous.venture?.totalInvested || 0) + amount,
      },
    }))
    setVentureAmount('')
    setNotice(`已投入 ¥${amount.toLocaleString()}，从该价格区间的 50 家企业中生成了 3 家候选。`)
  }

  const chooseVentureCompany = company => {
    const active = save.venture?.active
    if (!active || !active.candidates.some(item => item.id === company.id)) return
    const totalInvested = save.venture.totalInvested || 0
    const totalReturned = save.venture.totalReturned || 0
    const remainingLossBudget = Math.max(0, totalInvested - totalReturned - 1)
    const maximumRate = Math.max(0, Math.min(500, Math.floor(remainingLossBudget / active.amount * 100)))
    const returnRate = Math.floor(Math.random() * (maximumRate + 1))
    const returned = Math.min(
      remainingLossBudget,
      Number((active.amount * returnRate / 100).toFixed(2)),
    )
    const record = {
      id: active.id,
      at: Date.now(),
      company,
      amount: active.amount,
      returnRate,
      returned,
    }
    setSave(previous => ({
      ...previous,
      money: previous.money + returned,
      venture: {
        ...previous.venture,
        active: null,
        totalReturned: (previous.venture.totalReturned || 0) + returned,
        history: [record, ...(previous.venture.history || [])].slice(0, 12),
      },
    }))
    setNotice(`${company.name} 项目结束：回收率 ${returnRate}%，返还 ¥${returned.toLocaleString()}；企业投资职业总账仍为亏损。`)
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
    setSave(previous => ({
      ...previous,
      money: previous.money - item.price,
      lifeGoals: nextGoals,
      status: { ...DEFAULT_SAVE.status, ...(previous.status || {}), happiness: 100 },
    }))
    setNotice(`人生目标升级：${goal.name} · ${item.name}`)
    if (won) setVictoryOpen(true)
  }

  const buyFeminizationGoal = () => {
    const currentLevel = save.lifeExtras?.feminization || 0
    const item = FEMINIZATION_GOAL.levels[currentLevel]
    if (!item) return
    if (save.money < item.price) {
      setNotice(`现金不足：完成“${item.name}”需要 ¥${item.price.toLocaleString()}。`)
      return
    }
    const nextLevel = currentLevel + 1
    const completed = nextLevel >= FEMINIZATION_GOAL.levels.length
    setSave(previous => {
      const status = { ...DEFAULT_SAVE.status, ...(previous.status || {}) }
      return {
        ...previous,
        money: previous.money - item.price,
        lifeExtras: { ...previous.lifeExtras, feminization: nextLevel },
        status: {
          ...status,
          happiness: 100,
          corruption: completed ? 100 : status.corruption,
          ending: completed ? 'fallen' : status.ending,
        },
      }
    })
    setNotice(`特殊目标升级：${item.name}，幸福度已回满。`)
    if (completed) setLifeEvent({ type: 'ending', kind: 'fallen' })
  }

  const buyCake = () => {
    const price = 10000
    if (save.money < price) {
      setNotice('现金不足：蛋糕需要 ¥10,000。')
      return
    }
    const availableCodes = Object.keys(REDEEM_CODES).filter(code => code !== 'quq' && !save.redeemedCodes?.[code])
    const codeWon = Math.random() < 0.1
    const code = codeWon
      ? (availableCodes.length ? availableCodes[Math.floor(Math.random() * availableCodes.length)] : Object.keys(REDEEM_CODES)[0])
      : ''
    setSave(previous => ({
      ...previous,
      money: previous.money - price,
      lifeExtras: { ...previous.lifeExtras, cakes: (previous.lifeExtras?.cakes || 0) + 1 },
    }))
    setLifeEvent({ type: 'cake', code })
  }

  const buyPcVisit = () => {
    const currentStatus = { ...DEFAULT_SAVE.status, ...(save.status || {}) }
    const price = pcPriceFor(currentStatus.corruption)
    if (save.money < price) {
      setNotice(`现金不足：本次 PC 需要 ¥${price.toLocaleString()}。`)
      return
    }
    const alreadyHasHiv = currentStatus.hasHiv
    const acquiredHiv = !alreadyHasHiv && Math.random() < 0.1
    const nextCorruption = clampStat(currentStatus.corruption - 1, -100, 100)
    const nextInfectedCount = alreadyHasHiv
      ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, currentStatus.infectedCount || 0) * 2)
      : acquiredHiv ? 1 : currentStatus.infectedCount
    const ending = nextCorruption <= -100 ? 'prison' : currentStatus.ending
    setSave(previous => ({
      ...previous,
      money: previous.money - price,
      lifeExtras: {
        ...previous.lifeExtras,
        pcVisits: (previous.lifeExtras?.pcVisits || 0) + 1,
      },
      status: {
        ...previous.status,
        happiness: 100,
        health: alreadyHasHiv ? Math.max(0, currentStatus.health - 2) : currentStatus.health,
        corruption: nextCorruption,
        hasHiv: alreadyHasHiv || acquiredHiv,
        infectedCount: nextInfectedCount,
        ending,
      },
    }))
    if (ending) setLifeEvent({ type: 'ending', kind: ending })
    else if (acquiredHiv) setLifeEvent({ type: 'hiv-acquired', source: 'PC' })
    else setLifeEvent({ type: 'pc-happy' })
  }

  const buyHealth = fullTreatment => {
    const price = fullTreatment ? 1000000 : 100000
    if (save.money < price) {
      setNotice(`现金不足：本次健康服务需要 ¥${price.toLocaleString()}。`)
      return
    }
    setSave(previous => {
      const status = { ...DEFAULT_SAVE.status, ...(previous.status || {}) }
      return {
        ...previous,
        money: previous.money - price,
        status: {
          ...status,
          health: fullTreatment ? 100 : Math.min(100, status.health + 50),
          hasHiv: fullTreatment ? false : status.hasHiv,
        },
      }
    })
    setNotice(fullTreatment
      ? '已支付 ¥1,000,000：健康度回满并去除艾滋状态。'
      : '已支付 ¥100,000：健康度恢复 50 点。')
  }

  const resetAfterEnding = () => {
    setSave({
      ...DEFAULT_SAVE,
      upgrades: { ...DEFAULT_SAVE.upgrades },
      redeemedCodes: { ...(save.redeemedCodes || {}) },
      lastPassiveAt: Date.now(),
    })
    setResults([])
    setJackpots([])
    setVictoryOpen(false)
    setLifeEvent(null)
    setTab('draw')
    setNotice('结局已完成，本机游戏进度已重置；已使用兑换码记录保留。')
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
      setNotice(`该任务需要先把模型概率引擎升级到 Lv.${model.minLab}。`)
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

  const runGrayWork = (model, requested) => {
    const owned = save.inventory[model.id] || 0
    const amount = requested === 'all' ? owned : Math.min(requested, owned)
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice(`没有可用于打灰的 ${model.name} Token。`)
      return
    }
    const [minRate, maxRate] = GRAY_WORK_RANGES[model.tier]
    const steps = Math.floor((maxRate - minRate) / 10) + 1
    const rate = minRate + Math.floor(Math.random() * steps) * 10
    const tokenCostValue = model.cp / 100 * amount
    const earned = Number((tokenCostValue * rate / 100).toFixed(2))
    const record = {
      id: `${Date.now()}-${model.id}-${Math.random()}`,
      at: Date.now(),
      modelId: model.id,
      amount,
      rate,
      earned,
    }
    setSave(previous => ({
      ...previous,
      money: previous.money + earned,
      inventory: { ...previous.inventory, [model.id]: Math.max(0, (previous.inventory[model.id] || 0) - amount) },
      tasks: {
        ...previous.tasks,
        grayHistory: [record, ...(previous.tasks.grayHistory || [])].slice(0, 8),
      },
    }))
    setNotice(`打灰完成：消耗 ${formatToken(amount)} ${model.name}，本次回款 ${rate}%，获得 ¥${earned.toLocaleString()}。`)
  }

  const startWork = job => {
    if (save.work?.active) {
      const activeJob = WORK_JOBS.find(item => item.id === save.work.active.jobId)
      setNotice(`正在进行“${activeJob?.name || '当前工作'}”，完成后才能接新岗位。`)
      return
    }
    const startedAt = Date.now()
    setSave(previous => ({
      ...previous,
      work: {
        ...previous.work,
        active: { jobId: job.id, startedAt, finishAt: startedAt + job.duration },
      },
    }))
    setNotice(`已开始：${job.name}，${formatDuration(job.duration)}后发放 ¥${job.reward}。`)
  }

  const sellHook = () => {
    const currentStatus = { ...DEFAULT_SAVE.status, ...(save.status || {}) }
    const alreadyHasHiv = currentStatus.hasHiv
    const acquiredHiv = !alreadyHasHiv && Math.random() < 0.05
    const nextCorruption = clampStat(currentStatus.corruption + 1, -100, 100)
    const multiplier = hookIncomeMultiplier(nextCorruption)
    const baseEarned = 1500 + Math.floor(Math.random() * 8501)
    const earned = Math.round(baseEarned * multiplier)
    const nextInfectedCount = alreadyHasHiv
      ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, currentStatus.infectedCount || 0) * 2)
      : acquiredHiv ? 1 : currentStatus.infectedCount
    const ending = nextCorruption >= 100 ? 'fallen' : currentStatus.ending
    const record = {
      id: `${Date.now()}-hook-${Math.random()}`,
      at: Date.now(),
      earned,
      baseEarned,
      multiplier,
      acquiredHiv,
    }
    setSave(previous => ({
      ...previous,
      money: previous.money + earned,
      status: {
        ...previous.status,
        health: alreadyHasHiv ? Math.max(0, currentStatus.health - 2) : currentStatus.health,
        corruption: nextCorruption,
        hasHiv: alreadyHasHiv || acquiredHiv,
        infectedCount: nextInfectedCount,
        ending,
      },
      tasks: {
        ...previous.tasks,
        hookHistory: [record, ...(previous.tasks.hookHistory || [])].slice(0, 8),
      },
    }))
    setNotice(`卖钩子完成：获得 ¥${earned.toLocaleString()}，恶坠度 +1${alreadyHasHiv ? '，健康度 −2' : ''}。`)
    if (ending) setLifeEvent({ type: 'ending', kind: ending })
    else if (acquiredHiv) setLifeEvent({ type: 'hiv-acquired', source: '卖钩子' })
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
  const rankedResults = [...results].sort((a, b) =>
    TIER_ORDER.indexOf(b.rarity) - TIER_ORDER.indexOf(a.rarity) || b.value - a.value
  )
  const showcasedResults = results.length >= 10 ? rankedResults.slice(0, 10) : results
  const gpuPendingPreview = settlePassive(save, now, typeof document !== 'undefined' && document.hidden ? .5 : 1).save.gpuPending || DEFAULT_SAVE.gpuPending
  const pendingGpuMoney = gpuPendingPreview.money || 0
  const pendingGpuTokens = Object.entries(gpuPendingPreview.tokens || {})
    .filter(([, amount]) => amount > 0)
  const pendingGpuTokenTotal = pendingGpuTokens.reduce((sum, [, amount]) => sum + amount, 0)
  const lifeCompleted = Object.entries(LIFE_GOALS).every(([key, goal]) => save.lifeGoals[key] >= goal.levels.length)
  const playerStatus = { ...DEFAULT_SAVE.status, ...(save.status || {}) }
  const currentPcPrice = pcPriceFor(playerStatus.corruption)
  const currentHookMultiplier = hookIncomeMultiplier(playerStatus.corruption)

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
          <span className="happiness"><small>幸福度</small><b>{playerStatus.happiness} / 100</b></span>
          <span className={`health${playerStatus.hasHiv ? ' hiv' : ''}`}><small>健康度</small><b>{playerStatus.health} / 100{playerStatus.hasHiv ? ' · 艾滋' : ''}</b></span>
          <span className="corruption"><small>恶坠度</small><b>{playerStatus.corruption > 0 ? '+' : ''}{playerStatus.corruption}</b></span>
        </div>
      </header>

      <nav className="gacha-tabs" aria-label="抽卡功能">
        {[
          ['draw', '✦', '抽取终端'],
          ['inventory', '▣', `Token 仓库 ${ownedModels.length ? `· ${ownedModels.length}` : ''}`],
          ['upgrade', '↗', '升级中心'],
          ['assets', '▧', `投资市场与显卡 ${save.gpus.length ? `· ${save.gpus.length}` : ''}`],
          ['earn', '⚒', save.work?.active ? '赚钱行业 · 进行中' : '赚钱行业'],
          ['life', '◇', '人生目标'],
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
            <div className={`gacha-reactor${revealing ? ' revealing' : ''}${results.some(r => TIER_ORDER.indexOf(r.rarity) >= TIER_ORDER.indexOf('legendary')) ? ' has-legendary' : ''}${results.some(r => r.rarity === 'mythical') ? ' has-mythical' : ''}`}>
              <div className="gacha-reactor-hud top">
                <span>POOL / LAB LV.{save.upgrades.lab}</span>
                <span>DRAW / {save.totalDraws.toLocaleString()}</span>
              </div>
              <div className="gacha-reactor-hud bottom">
                <span>VALUE / ◈{expectedReturn} CURRENT EV</span>
                <span>LAB / LV.{save.upgrades.lab}</span>
              </div>
              <div className="gacha-orbit orbit-one" />
              <div className="gacha-orbit orbit-two" />
              {!results.length ? (
                <div className="gacha-reactor-core">
                  <span>◈</span>
                  <strong>等待算力注入</strong>
                  <small>模型档位与 Token 数量独立抽取 · Lv.3 开传说 · 满级普通仅 20%</small>
                </div>
              ) : (
                <div className={`gacha-results count-${showcasedResults.length}`}>
                  {showcasedResults.map((result, index) => (
                    <ResultCard key={result.id} result={result} featured={showcasedResults.length === 1 || index === 0} />
                  ))}
                  {results.length >= 10 && (
                    <div className="gacha-more-results">
                      本次 {results.length} 抽按模型品质优先、总价值次优排序，展示前 10 个{results.length > 10 ? '；其余结果已收入仓库' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="gacha-pity">
              <span><b>史诗保底</b><i style={{ width: `${Math.min(100, save.sinceEpic / 30 * 100)}%` }} /></span>
              <em>{save.sinceEpic} / 30</em>
              <span className={save.upgrades.lab < 3 ? 'locked' : ''}><b>传说保底</b><i style={{ width: `${save.upgrades.lab >= 3 ? Math.min(100, save.sinceLegendary / hardPity * 100) : 0}%` }} /></span>
              <em>{save.upgrades.lab >= 3 ? `${save.sinceLegendary} / ${hardPity}` : 'Lv.3'}</em>
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
              <span>模型档位</span>
              {TIER_ORDER.map(tier => (
                <p key={tier}><i style={{ background: TIER_META[tier].color }} />{TIER_META[tier].name}<b>{tier === 'mythical' ? '满级 0.03%' : tier === 'legendary' ? 'Lv.3 开放' : '初始开放'}</b></p>
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
            <p>Token 按模型兑换基准全额换算为算力点；算力点只能用于抽奖与显卡购买。</p>
          </div>
          {!ownedModels.length ? (
            <div className="gacha-empty"><b>仓库还是空的</b><span>先去抽取终端获得第一份模型 Token。</span></div>
          ) : (
            <div className="gacha-inventory-grid">
              {ownedModels.map(model => {
                const owned = save.inventory[model.id]
                const exchangeValue = Math.floor(model.cp)
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
                    <div className="gacha-exchange-value"><small>每 1M 全额兑换</small><b>◈ {exchangeValue.toLocaleString()}</b></div>
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
            <p>模型档位概率与 Token 数量概率是两条完全独立的升级线。</p>
          </div>
          <div className="gacha-upgrade-section-head">
            <div><span>01</span><h4>提高总期望与运行效率</h4><p>当前兑换价值 ◈{expectedReturn}/抽，满级约 ◈{maxExpectedReturn}/抽。</p></div>
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
            <div><span>02</span><h4>模型概率曲线</h4><p>每级都会降低普通占比并提高高档模型概率；Lv.3 开放传说，Lv.4 开放神话。</p></div>
          </div>
          <div className="gacha-pool-roadmap">
            {[0, 1, 2, 3, 4].map(level => {
              const pool = level >= 3 ? MODELS.filter(model => model.minLab === level) : []
              const rates = modelTierRates(level)
              const headline = ['初始开放至史诗', '第一次概率强化', '第二次概率强化', '传说模型开放', '神话模型开放'][level]
              return (
                <article key={level} className={`${level === save.upgrades.lab ? 'current ' : ''}${level > save.upgrades.lab ? 'locked' : ''}`}>
                  <span>{level === 0 ? '初始概率' : `概率引擎 Lv.${level}`}</span>
                  <b>{headline}</b>
                  <p>{TIER_ORDER.filter(tier => rates[tier] > 0).map(tier => `${TIER_META[tier].name} ${rates[tier]}%`).join(' · ')}</p>
                  <div>
                    {level === 0 && <small>普通、稀有、史诗模型</small>}
                    {(level === 1 || level === 2) && <small>不新增档位，只提高高档概率</small>}
                    {pool.map(model => <small key={model.id}>{model.name}</small>)}
                  </div>
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
            const nextMilestone = ['第一次提高高档概率', '第二次提高高档概率', '解锁传说模型', '解锁神话模型'][level]
            return (
              <div className="gacha-pool-upgrade">
                <div><b>{level >= def.max ? '模型概率引擎已满级' : `下一步：${nextMilestone}`}</b>
                  <small className="gacha-upgrade-story">{def.story}</small>
                  {cost && <small>需要 {cost.amount}M {TIER_META[cost.tier].name} Token · 当前持有 {formatToken(owned)}</small>}
                </div>
                <button disabled={level >= def.max || owned < (cost?.amount || 0)} onClick={() => buyUpgrade('lab')}>
                  {level >= def.max ? '概率已满级' : '升级模型概率'}
                </button>
              </div>
            )
          })()}
        </section>
      )}

      {tab === 'assets' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>LOCAL GPU FARM</span><h3>显卡商店与本地机房</h3></div>
            <p>显卡收益在本机持续累计，点击领取后才进入余额与 Token 仓库；当前游戏倍率 ×{GPU_EARNING_MULTIPLIER}。</p>
          </div>
          <div className="gacha-gpu-pending">
            <div>
              <span>UNCLAIMED GPU OUTPUT · ×{GPU_EARNING_MULTIPLIER}</span>
              <h4>待领取显卡收益</h4>
              <p>现金 ¥{pendingGpuMoney.toFixed(2)} · Token {formatToken(pendingGpuTokenTotal)}</p>
            </div>
            <div className="gacha-gpu-pending-tokens">
              {pendingGpuTokens.length ? pendingGpuTokens.slice(0, 4).map(([modelId, amount]) => {
                const model = MODELS.find(item => item.id === modelId)
                return <span key={modelId}>{model?.name || modelId}<b>{formatToken(amount)}</b></span>
              }) : <small>收益会按当前显卡模式自动累积在这里</small>}
            </div>
            <button disabled={pendingGpuMoney <= 0 && pendingGpuTokenTotal <= 0} onClick={claimGpuEarnings}>领取全部并清零</button>
          </div>
          <div className="gacha-gpu-shop">
            {GPU_CATALOG.map(gpu => (
              <article key={gpu.id} className="gacha-gpu-card">
                <div className="gacha-gpu-mark">RTX</div>
                <div>
                  <span>{gpu.vram}GB GDDR7 · {gpu.aiTops.toLocaleString()} AI TOPS</span>
                  <h4>{gpu.name}</h4>
                  <p>Qwen3 RAG 约 {gpu.ragTps} tok/s · 游戏挖矿约 ¥{(gpu.miningPerMinute * GPU_EARNING_MULTIPLIER * 1440).toFixed(2)}/天</p>
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
                      {owned.mode === 'mining' && `累计约 ¥${(gpu.miningPerMinute * GPU_EARNING_MULTIPLIER).toFixed(2)}/分钟`}
                      {owned.mode === 'ai' && `累计约 ${formatToken(gpu.tokenMPerMinute * GPU_EARNING_MULTIPLIER / Math.max(1, owned.modelFactor || 1))}/分钟`}
                      {owned.mode === 'idle' && '不产生收益'}
                    </small>
                    <button className="gacha-sell-gpu" onClick={() => sellGpu(owned, gpu)}>卖出 ¥{Math.floor(gpu.marketPrice / 2).toLocaleString()}</button>
                  </article>
                )
              })}
            </div>
          )}
          <div className="gacha-rule-notes">
            <p><b>本地累计：</b>整个网站打开时每 60 秒把产出写入待领取池；关闭页面或隐藏标签后，按本地时间补算 50% 收益，单次最多补算 30 天。</p>
            <p><b>手动领取：</b>挖矿累计模拟人民币，运行 AI 累计所选模型 Token；点击“领取全部并清零”后才会进入正式资产。</p>
            <p><b>游戏倍率：</b>现金和 Token 产出均为基础速率的 {GPU_EARNING_MULTIPLIER} 倍；高品质模型训练更慢，但兑换价值更高。</p>
            <p><b>买卖规则：</b>人民币与算力点购买都按市场正版参考价换算；卖出统一按正版价格的一半回收，出售前产生的收益仍保留在待领取池。</p>
          </div>
        </section>
      )}

      {tab === 'assets' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>LOCAL PAPER MARKET</span><h3>模拟股票账户</h3></div>
            <p>每次重新进入抽卡页面结算一次；随机抽取 −30% 至 +30% 的整数百分位，结果保留两位小数。</p>
          </div>
          <div className="gacha-stock-overview">
            <article><span>股票市值</span><b>¥{save.stocks.balance.toFixed(2)}</b><small>未提取资产</small></article>
            <article><span>累计投入本金</span><b>¥{save.stocks.principal.toFixed(2)}</b><small>仅作盈亏参考</small></article>
            <article><span>账面盈亏</span><b className={save.stocks.balance - save.stocks.principal >= 0 ? 'up' : 'down'}>{save.stocks.balance - save.stocks.principal >= 0 ? '+' : ''}¥{(save.stocks.balance - save.stocks.principal).toFixed(2)}</b><small>实时账面结果</small></article>
            <article><span>资金取回</span><b>100%</b><small>提取金额全额到账</small></article>
          </div>
          <StockCandlestickChart history={save.stocks.history || []} />
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
            <p>每次重新进入时从 −30% 至 +30% 的整数波动中随机结算，并带有轻微负期望；股票资金可随时全额取回。详细概率统一列在“概率与定价”。</p>
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
          <section className="gacha-venture">
            <div className="gacha-panel-title compact">
              <div><span>RECRUITING VENTURE MARKET</span><h3>企业投资与招聘市场</h3></div>
              <p>最低投入 ¥100,000；每个金额区间有 50 家候选企业，每次随机出现 3 家供你选择。</p>
            </div>
            <div className="gacha-venture-overview">
              <article><span>职业累计投入</span><b>¥{(save.venture?.totalInvested || 0).toLocaleString()}</b></article>
              <article><span>职业累计返还</span><b>¥{(save.venture?.totalReturned || 0).toLocaleString()}</b></article>
              <article><span>职业总账</span><b className="down">−¥{Math.max(0, (save.venture?.totalInvested || 0) - (save.venture?.totalReturned || 0)).toLocaleString()}</b></article>
              <article><span>候选库</span><b>每档 50 家</b></article>
            </div>
            {!save.venture?.active ? (
              <div className="gacha-venture-entry">
                <label htmlFor="venture-amount">本轮投资金额</label>
                <input
                  id="venture-amount"
                  type="number"
                  min="100000"
                  step="10000"
                  value={ventureAmount}
                  onChange={event => setVentureAmount(event.target.value)}
                  placeholder="至少 100000"
                />
                <div>
                  {[100000, 500000, 2000000, 10000000].map(amount => (
                    <button key={amount} onClick={() => setVentureAmount(String(amount))}>
                      ¥{amount >= 10000 ? `${amount / 10000}万` : amount}
                    </button>
                  ))}
                </div>
                <button className="primary" onClick={startVentureInvestment}>投资并生成 3 家企业</button>
              </div>
            ) : (
              <div className="gacha-venture-candidates">
                <header>
                  <div><span>本轮投入</span><b>¥{save.venture.active.amount.toLocaleString()}</b></div>
                  <small>{save.venture.active.bandLabel} · 已从 50 家候选中随机抽取</small>
                </header>
                <div>
                  {save.venture.active.candidates.map(company => (
                    <article key={company.id}>
                      <span>{company.sector}</span>
                      <h4>{company.name}</h4>
                      <p>{company.risk} · 招聘团队正在扩张</p>
                      <button onClick={() => chooseVentureCompany(company)}>选择这家企业</button>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {!!save.venture?.history?.length && (
              <div className="gacha-venture-history">
                <h4>最近企业投资</h4>
                {save.venture.history.slice(0, 6).map(item => (
                  <div key={item.id}>
                    <span>{new Date(item.at).toLocaleString()}</span>
                    <b>{item.company.name} · 回收率 {item.returnRate}%</b>
                    <small>投入 ¥{item.amount.toLocaleString()} → 返还 ¥{item.returned.toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
            <div className="gacha-stock-rule">
              <b>总账必亏规则</b>
              <p>单次回收率会在 0%–500% 范围内随机；系统按历史累计亏损额度限制本轮上限，确保企业投资职业的累计返还始终低于累计投入。</p>
            </div>
          </section>
        </section>
      )}

      {tab === 'earn' && (() => {
        const active = save.work?.active
        const activeJob = active ? WORK_JOBS.find(job => job.id === active.jobId) : null
        const remaining = active ? Math.max(0, active.finishAt - now) : 0
        const progress = active ? Math.min(100, Math.max(0, (now - active.startedAt) / (active.finishAt - active.startedAt) * 100)) : 0
        return (
          <section className="gacha-panel gacha-work-panel">
            <div className="gacha-panel-title">
              <div><span>ALL MONEY-MAKING INDUSTRIES</span><h3>赚钱行业</h3></div>
              <p>打工岗位、卖钩子、Token 打灰与互联网任务统一集中在这里；基准打工收入约为每分钟 ¥300。</p>
            </div>
            <div className="gacha-work-hero">
              <div><span>当前模拟余额</span><b>¥{save.money.toFixed(2)}</b></div>
              <div><span>累计打工收入</span><b>¥{(save.work?.totalEarned || 0).toLocaleString()}</b></div>
              <div><span>完成岗位</span><b>{save.work?.completed || 0} 次</b></div>
              <p>打工会消耗幸福度；幸福度已经为 0 时继续打工，改为消耗同等健康度。计时保存在本机存档中。</p>
            </div>
            {active && activeJob && (
              <div className="gacha-work-active" role="status">
                <div>
                  <span>正在工作</span>
                  <h4>{activeJob.name}</h4>
                  <p>预计工资 ¥{activeJob.reward} · 消耗 {playerStatus.happiness > 0 ? '幸福度' : '健康度'} {activeJob.happinessCost} · 剩余 {formatDuration(remaining)}</p>
                </div>
                <b>{Math.ceil(remaining / 1000)}s</b>
                <i><span style={{ width: `${progress}%` }} /></i>
              </div>
            )}
            <div className="gacha-work-grid">
              {WORK_JOBS.map(job => {
                const isActive = active?.jobId === job.id
                return (
                  <article key={job.id} className={isActive ? 'active' : ''}>
                    <span>{job.tag}</span>
                    <h4>{job.name}</h4>
                    <p>{job.desc}</p>
                    <div><b>¥{job.reward}</b><small>{formatDuration(job.duration)} · 约 ¥{Math.round(job.reward / job.duration * 60000)}/分钟 · {playerStatus.happiness > 0 ? '幸福' : '健康'} −{job.happinessCost}</small></div>
                    <button disabled={Boolean(active)} onClick={() => startWork(job)}>
                      {isActive ? '工作进行中' : active ? '已有工作' : '开始打工'}
                    </button>
                  </article>
                )
              })}
            </div>
            {!!save.work?.history?.length && (
              <div className="gacha-work-history">
                <h4>最近工资记录</h4>
                {save.work.history.map(item => {
                  const job = WORK_JOBS.find(candidate => candidate.id === item.jobId)
                  return (
                    <div key={item.id}>
                      <span>{new Date(item.at).toLocaleString()}</span>
                      <b>{job?.name || '已下线岗位'}</b>
                      <small>+¥{item.reward.toLocaleString()}</small>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })()}

      {tab === 'life' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>ENDGAME GOALS</span><h3>人生目标清单</h3></div>
            <p>用赚钱行业、投资市场和显卡机房带回的现金，逐级完成房子、车子和女友目标。</p>
          </div>
          <div className="gacha-wellbeing">
            <div className="gacha-wellbeing-stats">
              <article><span>幸福度</span><b>{playerStatus.happiness} / 100</b><i><em style={{ width: `${playerStatus.happiness}%` }} /></i></article>
              <article className={playerStatus.hasHiv ? 'danger' : ''}><span>健康度</span><b>{playerStatus.health} / 100</b><i><em style={{ width: `${playerStatus.health}%` }} /></i><small>{playerStatus.hasHiv ? '艾滋状态 · PC/卖钩子健康 −2' : '当前没有艾滋'}</small></article>
              <article><span>恶坠度</span><b>{playerStatus.corruption > 0 ? '+' : ''}{playerStatus.corruption}</b><i><em style={{ width: `${(playerStatus.corruption + 100) / 2}%` }} /></i></article>
              <article><span>累计艾滋人数</span><b>{playerStatus.infectedCount.toLocaleString()}</b><small>艾滋状态下每次 PC 或卖钩子翻倍</small></article>
            </div>
            <div className="gacha-health-actions">
              <button disabled={save.money < 100000 || playerStatus.health >= 100} onClick={() => buyHealth(false)}>¥10万 · 健康 +50</button>
              <button disabled={save.money < 1000000 || (playerStatus.health >= 100 && !playerStatus.hasHiv)} onClick={() => buyHealth(true)}>¥100万 · 健康回满并去除艾滋</button>
            </div>
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
          <div className="gacha-life-extras">
            <article className="cake">
              <span>PORTAL SPECIAL</span>
              <h4>蛋糕 · ¥10,000 / 个</h4>
              <p>买下以后会告诉你一个关于蛋糕的重要事实；另有 10% 概率获得一个隐藏兑换码。</p>
              <small>已经买了 {save.lifeExtras?.cakes || 0} 个蛋糕</small>
              <button onClick={buyCake}>买一个蛋糕</button>
            </article>
            <article className="pc">
              <span>PC SERVICE</span>
              <h4>PC · ¥{currentPcPrice.toLocaleString()} / 次</h4>
              <p>幸福度回满、恶坠度 −1；有 10% 概率获得艾滋。艾滋状态下进行 PC 还会使健康度 −2、累计艾滋人数翻倍。</p>
              <small>已经 PC {save.lifeExtras?.pcVisits || 0} 次 · 每 −10 恶坠度价格再降 5%</small>
              <button onClick={buyPcVisit}>进行一次 PC</button>
            </article>
          </div>
          <article className="gacha-feminization-goal">
            <header>
              <div><span>SPECIAL ENDING ROUTE</span><h4>{FEMINIZATION_GOAL.name}</h4><p>特殊目标每级都会回满幸福度；三级全部完成后立即触发恶坠结局。</p></div>
              <b>Lv.{save.lifeExtras?.feminization || 0}/3</b>
            </header>
            <div>
              {FEMINIZATION_GOAL.levels.map((level, index) => {
                const currentLevel = save.lifeExtras?.feminization || 0
                return (
                  <section key={level.name} className={index < currentLevel ? 'done' : index === currentLevel ? 'next' : ''}>
                    <span>{index + 1}</span>
                    <div><b>{level.name}</b><small>{level.desc}</small></div>
                    <em>¥{level.price.toLocaleString()}</em>
                  </section>
                )
              })}
            </div>
            <button disabled={(save.lifeExtras?.feminization || 0) >= 3} onClick={buyFeminizationGoal}>
              {(save.lifeExtras?.feminization || 0) >= 3
                ? '特殊目标已完成'
                : `完成下一步 · ¥${FEMINIZATION_GOAL.levels[save.lifeExtras?.feminization || 0].price.toLocaleString()}`}
            </button>
          </article>
          {lifeCompleted && (
            <button className="gacha-life-settlement" onClick={() => setVictoryOpen(true)}>
              查看人生赢家结算 · 当前买过 {save.lifeExtras?.cakes || 0} 个蛋糕
            </button>
          )}
          <div className="gacha-stock-rule life-note">
            <b>关于“女友”</b>
            <p>这里的花费代表约会、共同旅行和生活基金，不是把人当作可以买卖的物品。真正的关系当然不能用价格衡量。</p>
          </div>
        </section>
      )}

      {tab === 'earn' && (
        <section className="gacha-panel">
          <div className="gacha-panel-title">
            <div><span>INTERNET CONTRACTS</span><h3>Token 工作台与互联网任务</h3></div>
            <p>打灰工作随时可跑；每日与每周任务有额度限制，但单位 Token 的总收益更高。</p>
          </div>
          <article className="gacha-hook-task">
            <div className="gacha-hook-mark">!</div>
            <div>
              <span>HIGH RISK · INSTANT CASH</span>
              <h4>卖钩子</h4>
              <p>基础收入随机 ¥1,500–10,000，恶坠度 +1；每 +10 恶坠度，收入倍率增加 10%。每次有 5% 概率获得艾滋。</p>
              {!!save.tasks.hookHistory?.length && (
                <small>上次收入 ¥{save.tasks.hookHistory[0].earned.toLocaleString()} · 已选择 {save.tasks.hookHistory.length} 次记录</small>
              )}
            </div>
            <div className="gacha-hook-action">
              <span>恶坠度 <b>{playerStatus.corruption > 0 ? '+' : ''}{playerStatus.corruption}</b> · 收入 ×{currentHookMultiplier.toFixed(1)}</span>
              <button onClick={sellHook}>卖钩子 · 恶坠度 +1</button>
            </div>
          </article>
          <div className="gacha-task-group gacha-gray-work">
            <h4>AI 额度打灰<span>每个 10% 回款档位等概率</span></h4>
            <p className="gacha-gray-intro">任意模型 Token 都能投入。模型越稀有，可能回款范围越高；回款基数按该模型每 1M 的游戏内成本计算。</p>
            <div className="gacha-gray-rates" aria-label="各模型档位打灰回款范围">
              {TIER_ORDER.map(tier => (
                <span key={tier} style={{ '--tier': TIER_META[tier].color }}>
                  {TIER_META[tier].name} {GRAY_WORK_RANGES[tier][0]}%–{GRAY_WORK_RANGES[tier][1]}%
                </span>
              ))}
            </div>
            {!ownedModels.length ? (
              <div className="gacha-empty small"><b>暂无可用 Token</b><span>抽到任意模型 Token 后即可开始打灰。</span></div>
            ) : (
              <div className="gacha-gray-grid">
                {ownedModels.map(model => {
                  const owned = save.inventory[model.id] || 0
                  const [minRate, maxRate] = GRAY_WORK_RANGES[model.tier]
                  const expectedRate = (minRate + maxRate) / 2
                  const expectedPerM = model.cp / 100 * expectedRate / 100
                  return (
                    <article className={`gacha-gray-card tier-${model.tier}`} key={model.id}>
                      <ModelLogo model={model} />
                      <div>
                        <span>{TIER_META[model.tier].name} · 持有 {formatToken(owned)}</span>
                        <h4>{model.name}</h4>
                        <p>回款 {minRate}%–{maxRate}% · 平均 {expectedRate}%</p>
                        <small>平均约 ¥{expectedPerM.toFixed(2)} / 1M</small>
                      </div>
                      <div className="gacha-gray-actions">
                        <button disabled={owned < 10} onClick={() => runGrayWork(model, 10)}>消耗 10M</button>
                        <button disabled={owned < 100} onClick={() => runGrayWork(model, 100)}>消耗 100M</button>
                        <button disabled={owned <= 0} onClick={() => runGrayWork(model, 'all')}>全部投入</button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
            {!!save.tasks.grayHistory?.length && (
              <div className="gacha-gray-history">
                {save.tasks.grayHistory.slice(0, 5).map(item => {
                  const model = MODELS.find(candidate => candidate.id === item.modelId)
                  return (
                    <div key={item.id}>
                      <span>{new Date(item.at).toLocaleString()}</span>
                      <b>{model?.name || '未知模型'} · {formatToken(item.amount)}</b>
                      <small>{item.rate}% → ¥{item.earned.toLocaleString()}</small>
                    </div>
                  )
                })}
              </div>
            )}
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
                        {exhausted ? '额度已用完' : locked ? `概率引擎 Lv.${model.minLab}` : '执行任务'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          )})}
          <div className="gacha-rule-notes">
            <p><b>打灰回款：</b>普通 / 稀有 / 史诗 / 传说 / 神话分别从 20%–150%、30%–200%、50%–300%、80%–500%、100%–1000% 中抽取；区间内每个 10% 档位等概率。</p>
            <p><b>任务优先级：</b>每日与每周任务有次数和指定模型限制，但其单位 Token 的期望收益高于对应档位打灰工作的最高回款，优先完成固定任务一定更划算。</p>
          </div>
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
            <article><span>当前兑换价值</span><b>◈{expectedReturn} / 抽</b><small>初始现金回收约 {Math.round(drawStats(0, 0).expected / 10)}%</small></article>
            <article><span>最高 Token 额度</span><b>1wM</b><small>概率统一见表格末栏</small></article>
            <article><span>当前模型概率</span><b>引擎 Lv.{save.upgrades.lab}</b><small>普通模型 {stats.rarityRates.common.toFixed(2)}%</small></article>
          </div>
          <div className="gacha-table-wrap">
            <table className="gacha-model-table">
              <thead><tr><th>模型档位</th><th>解锁等级</th><th>定位</th><th>当前档位概率</th></tr></thead>
              <tbody>
                {[
                  ['common', 'Lv.0', '基础模型'],
                  ['rare', 'Lv.0', '稳定进阶模型'],
                  ['epic', 'Lv.0', '高性能模型'],
                  ['legendary', 'Lv.3', '顶级模型与大奖演出'],
                  ['mythical', 'Lv.4', '未发布性能预测模型'],
                ].map(([tier, unlock, description]) => (
                  <tr key={tier}>
                    <td><span className={`gacha-table-tier tier-${tier}`}>{TIER_META[tier].name}</span></td>
                    <td>{unlock}</td>
                    <td>{description}</td>
                    <td>{stats.rarityRates[tier].toFixed(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gacha-table-wrap">
            <table className="gacha-model-table">
              <thead><tr><th>模型档位</th><th>模型</th><th>公开 / 参考接入价</th><th>能力兑换基准</th><th>发布与解锁状态</th><th>当前模型概率</th></tr></thead>
              <tbody>
                {MODELS.map(model => (
                  <tr key={model.id}>
                    <td><span className={`gacha-table-tier tier-${model.tier}`}>{TIER_META[model.tier].name}</span></td>
                    <td><b>{model.name}</b></td>
                    <td>{model.price}</td>
                    <td>◈ {model.cp.toLocaleString()} / M</td>
                    <td>{model.released ? '已发布' : '预测 · 未发布'} · {model.minLab <= save.upgrades.lab ? '池中' : `概率引擎 Lv.${model.minLab}`}</td>
                    <td className={model.minLab > save.upgrades.lab ? 'gacha-locked-rate' : ''}>{model.minLab <= save.upgrades.lab ? `${modelChance(model, save.upgrades.lab).toFixed(3)}%` : '锁定'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="gacha-table-wrap gacha-token-table-wrap">
            <table className="gacha-model-table">
              <thead><tr><th>Token 额度</th><th>独立边框特效</th><th>当前概率</th><th>满级概率</th></tr></thead>
              <tbody>
                {(() => {
                  const pool = tokenPool(save.upgrades.luck)
                  const totalWeight = pool.reduce((sum, token) => sum + token.weight, 0)
                  const maxPool = tokenPool(5)
                  const maxWeight = maxPool.reduce((sum, token) => sum + token.weight, 0)
                  return pool.map((token, index) => {
                    const effect = tokenEffect(token.amount)
                    return (
                      <tr key={token.label}>
                        <td><b>{token.label}</b></td>
                        <td>{effect.name}</td>
                        <td>{(token.weight / totalWeight * 100).toFixed(token.amount >= 1000 ? 4 : 3)}%</td>
                        <td>{(maxPool[index].weight / maxWeight * 100).toFixed(token.amount >= 1000 ? 4 : 3)}%</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
          <div className="gacha-rule-notes">
            <p><b>模型与数量分离：</b>先按模型概率引擎抽普通、稀有、史诗、传说或神话模型，再独立抽 Token 数量。大量普通 Token 不会把模型变成传说，小量传说 Token 也仍然是传说模型。</p>
            <p><b>模型概率：</b>初始池开放普通、稀有与史诗，Lv.1 和 Lv.2 继续提高好模型概率，Lv.3 才能抽到传说，Lv.4 开放神话。满级普通模型降至 20%，神话固定为 0.03%。</p>
            <p><b>Token 特效：</b>Token 数量不改变模型档位，只强化卡片额度特效：2M 起流光、10M 起波纹、100M 起虹彩、1000M 起奇点风暴。</p>
            <p><b>多连展示：</b>十连及以上会先比较模型档位，再比较“模型兑换基准 × Token 数量”的总价值，只展示排序最高的前 10 个；全部抽取结果仍会进入仓库。</p>
            <p><b>升级效果：</b>模型概率引擎只调整模型档位；Token 额度扩容只调整数量概率；保底只作用于已解锁的模型档位，两条概率线互不串联。</p>
            <p><b>模型分档：</b>普通到传说只收录已经正式发布或公开可用的模型，并按综合能力、编程与代理能力重新分级；所有尚未发布的预测型号只存在于神话池。</p>
            <p><b>能力原则：</b>兑换基准主要参考厂商公开能力表、编程与代理评测，再结合接入成本做游戏化微调；神话模型没有真实售价，页面只标记为未发布预测。</p>
            <p><b>经济曲线：</b>初始现金抽兑换期望约 {Math.round(drawStats(0, 0).expected / 10)}%，算力抽因溢价更低；模型概率、Token 额度和折扣升级后可继续提高回报。Token 与算力点都不能兑换现金。</p>
            <p><b>股票概率：</b>−30 至 −1 合计 53%，+1 至 +30 合计 46%，0 为 1%；区间内整数等概率，单次期望约 −1.09%，账户资金全额取回。</p>
            <p><b>企业投资：</b>每个价格区间有 50 家候选企业，投入后随机展示 3 家；单次回收率 0%–500%，但职业累计返还始终低于累计投入。</p>
            <p><b>其他资产：</b>股票每次重新进入时结算且为负期望；显卡按 ×{GPU_EARNING_MULTIPLIER} 游戏速率累计到待领取池，可用现金或算力点购买，并按正版价格的一半卖出。</p>
            <p><b>人生状态：</b>打工消耗幸福度，幸福度为 0 后继续打工改扣健康度；PC 与人生目标回满幸福度。卖钩子有 5%、PC 有 10% 概率获得艾滋，艾滋状态下再次进行任一行为会扣 2 健康并令累计艾滋人数翻倍。</p>
            <p><b>恶坠结局：</b>卖钩子令恶坠度 +1 并按每 +10 提高 10% 收入；PC 令恶坠度 −1 并按每 −10 降低 5% 价格。达到 +100、−100 或完成女装特殊目标时触发对应结局。</p>
          </div>
          <button className="gacha-reset" onClick={resetSave}>重置本机模拟存档</button>
        </section>
      )}

      <section className="gacha-redeem" aria-labelledby="gacha-redeem-title">
        <div className="gacha-redeem-mark">⌘</div>
        <div>
          <span>LOCAL BONUS CHANNEL</span>
          <h3 id="gacha-redeem-title">兑换码</h3>
          <p>每个兑换码仅能在本机存档使用一次</p>
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
        <div className={`gacha-jackpot${jackpot.rarity === 'mythical' ? ' mythical' : ''}`} role="dialog" aria-modal="true" aria-labelledby="gacha-jackpot-title">
          <div className="gacha-jackpot-beams" />
          <article>
            <span className="gacha-jackpot-kicker">✦ {jackpot.rarity === 'mythical' ? 'MYTHICAL MODEL' : 'LEGENDARY JACKPOT'} ✦</span>
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
            <b>{jackpot.rarity === 'mythical' ? '神话' : '金色'}总价值 ◈ {jackpot.value.toLocaleString()}</b>
            <small>品质由 {jackpot.model.cp.toLocaleString()} 算力点/M × {jackpot.token.amount.toLocaleString()}M 判定</small>
            <button onClick={() => setJackpots(previous => previous.slice(1))}>
              {jackpots.length > 1 ? `收下奖励 · 还有 ${jackpots.length - 1} 个大奖` : `收下${jackpot.rarity === 'mythical' ? '神话' : '传说'}奖励`}
            </button>
          </article>
        </div>
        )
      })()}

      {lifeEvent && (
        <div className={`gacha-life-event ${lifeEvent.type}`} role="dialog" aria-modal="true" aria-labelledby="gacha-life-event-title">
          <article>
            {lifeEvent.type === 'cake' && (
              <>
                <span>APERTURE LABS NOTICE</span>
                <h3 id="gacha-life-event-title">蛋糕是个谎言</h3>
                <p>你花 ¥10,000 买到了一条经典真相。蛋糕数量已经记入人生结算。</p>
                {lifeEvent.code
                  ? <div className="gacha-cake-code"><small>10% 隐藏奖励命中</small><b>{lifeEvent.code}</b><p>请复制后到页面底部兑换；兑换码不会加入公开列表。</p></div>
                  : <small>这次没有抽到隐藏兑换码。</small>}
                <button onClick={() => setLifeEvent(null)}>我早就知道</button>
              </>
            )}
            {lifeEvent.type === 'pc-happy' && (
              <>
                <span>NIGHT COMPLETE</span>
                <h3 id="gacha-life-event-title">很开心，很爽</h3>
                <p>幸福度已经回满，恶坠度 −1。本次没有获得新的艾滋状态。</p>
                <button onClick={() => setLifeEvent(null)}>继续游戏</button>
              </>
            )}
            {lifeEvent.type === 'hiv-acquired' && (
              <>
                <span>MEDICAL EMERGENCY</span>
                <h3 id="gacha-life-event-title">你获得了艾滋</h3>
                <p>本次由 {lifeEvent.source} 触发。累计艾滋人数从 1 开始；今后每次 PC 或卖钩子都会使人数翻倍，并使健康度 −2。</p>
                <button onClick={() => setLifeEvent(null)}>知道了</button>
              </>
            )}
            {lifeEvent.type === 'ending' && (
              <>
                <span>{lifeEvent.kind === 'fallen' ? 'CORRUPTION ENDING' : 'PRISON ENDING'}</span>
                <h3 id="gacha-life-event-title">
                  {lifeEvent.kind === 'fallen' ? '图灵派雌坠小南娘结局' : '入狱结局'}
                </h3>
                <p>
                  {lifeEvent.kind === 'fallen'
                    ? '恶坠度已经达到 +100，或女装特殊目标全部完成。'
                    : '恶坠度已经达到 −100。'}
                  确认结局后，本机游戏进度会重置。
                </p>
                {playerStatus.infectedCount > 0 && <b className="gacha-ending-infections">你让 {playerStatus.infectedCount.toLocaleString()} 人得了艾滋</b>}
                <button className="danger" onClick={resetAfterEnding}>确认结局并重置游戏</button>
              </>
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
            <div><b>海景智能别墅</b><b>限量未来超跑</b><b>人生搭档</b><b>买过 {save.lifeExtras?.cakes || 0} 个蛋糕</b><b>幸福度 {playerStatus.happiness}</b><b>健康度 {playerStatus.health}</b><b>恶坠度 {playerStatus.corruption > 0 ? '+' : ''}{playerStatus.corruption}</b></div>
            {playerStatus.infectedCount > 0 && <p className="gacha-victory-infections">你让 {playerStatus.infectedCount.toLocaleString()} 人得了艾滋</p>}
            <button onClick={() => setVictoryOpen(false)}>继续我的人生</button>
          </article>
        </div>
      )}
    </div>
  )
}
