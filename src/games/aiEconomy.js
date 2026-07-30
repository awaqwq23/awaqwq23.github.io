import { useEffect } from 'react'

export const ECONOMY_SAVE_KEY = 'ai_token_gacha_v1'
export const GPU_EARNING_MULTIPLIER = 100

export const GPU_CATALOG = [
  {
    id: 'rtx-5060-ti-16',
    name: 'RTX 5060 Ti 16GB',
    marketPrice: 4699,
    gamePrice: 4699,
    vram: 16,
    aiTops: 759,
    ragTps: 115,
    miningPerMinute: 0.0082,
    tokenMPerMinute: 0.05,
  },
  {
    id: 'rtx-5070-ti-16',
    name: 'RTX 5070 Ti 16GB',
    marketPrice: 8699,
    gamePrice: 8699,
    vram: 16,
    aiTops: 1406,
    ragTps: 211,
    miningPerMinute: 0.0214,
    tokenMPerMinute: 0.09,
  },
  {
    id: 'rtx-5090d-v2',
    name: 'RTX 5090 D V2 24GB',
    marketPrice: 25999,
    gamePrice: 25999,
    vram: 24,
    aiTops: 2514,
    ragTps: 308,
    miningPerMinute: 0.0386,
    tokenMPerMinute: 0.16,
  },
]

export function readEconomy() {
  try {
    return JSON.parse(localStorage.getItem(ECONOMY_SAVE_KEY)) || null
  } catch {
    return null
  }
}

export function writeEconomy(save) {
  localStorage.setItem(ECONOMY_SAVE_KEY, JSON.stringify(save))
  window.dispatchEvent(new CustomEvent('ai-economy-update', { detail: save }))
  return save
}

export function creditGameReward({ compute = 0, money = 0, modelId, tokenM = 0 }) {
  const save = readEconomy() || {
    saveVersion: 2,
    money: 1000,
    compute: 0,
    inventory: {},
    gpus: [],
    gpuPending: { money: 0, tokens: {} },
    lastPassiveAt: Date.now(),
  }
  const inventory = { ...(save.inventory || {}) }
  if (modelId && tokenM > 0) inventory[modelId] = (inventory[modelId] || 0) + tokenM
  return writeEconomy({
    ...save,
    money: (save.money || 0) + money,
    compute: (save.compute || 0) + compute,
    inventory,
  })
}

export function settlePassive(save, at = Date.now(), multiplier = 1) {
  if (!save) return { save, money: 0, tokenM: 0 }
  const from = save.lastPassiveAt || at
  const minutes = Math.max(0, Math.min(60 * 24 * 30, (at - from) / 60000))
  if (minutes < 0.01) return { save: { ...save, lastPassiveAt: at }, money: 0, tokenM: 0 }

  let money = 0
  let tokenM = 0
  const pending = {
    money: save.gpuPending?.money || 0,
    tokens: { ...(save.gpuPending?.tokens || {}) },
  }
  for (const owned of save.gpus || []) {
    const gpu = GPU_CATALOG.find(item => item.id === owned.gpuId)
    if (!gpu || owned.mode === 'idle') continue
    if (owned.mode === 'mining') {
      money += gpu.miningPerMinute * minutes * multiplier * GPU_EARNING_MULTIPLIER
    } else if (owned.mode === 'ai' && owned.modelId) {
      const generated = gpu.tokenMPerMinute * minutes * multiplier * GPU_EARNING_MULTIPLIER / Math.max(1, owned.modelFactor || 1)
      pending.tokens[owned.modelId] = (pending.tokens[owned.modelId] || 0) + generated
      tokenM += generated
    }
  }
  pending.money += money
  return {
    money,
    tokenM,
    save: {
      ...save,
      gpuPending: pending,
      lastPassiveAt: at,
    },
  }
}

export function useEconomyClock() {
  useEffect(() => {
    const settle = multiplier => {
      const current = readEconomy()
      if (!current) return
      writeEconomy(settlePassive(current, Date.now(), multiplier).save)
    }

    // 首次进入时，上次记录点至今按离线 50% 结算。
    settle(0.5)
    const timer = setInterval(() => settle(document.hidden ? 0.5 : 1), 60000)
    const onVisibility = () => settle(document.hidden ? 1 : 0.5)
    const onBeforeUnload = () => settle(1)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      settle(1)
    }
  }, [])
}
