export const STAR_ENGINE_APP_ID = 2622000

export const GAME_CATEGORY_OPTIONS = [
  { id: 'singleplayer', label: '单人', icon: 'fa-user', description: '只支持单人游玩的游戏' },
  { id: 'multiplayer', label: '多人', icon: 'fa-users', description: '只支持多人游玩的游戏' },
  { id: 'both', label: '单人 + 多人', icon: 'fa-user-group', description: '单人、多人模式都支持' },
  { id: 'software', label: '功能软件', icon: 'fa-screwdriver-wrench', description: '番茄钟、桌面工具和创作软件' },
  { id: 'junk', label: '垃圾游戏', icon: 'fa-trash-can', description: '零启动时长或免费游戏' },
  { id: 'star-engine', label: '星引擎排队', icon: 'fa-star', description: '星引擎派对专属分类' },
]

const SOFTWARE_APP_IDS = new Set([
  431960, // Wallpaper Engine
  404790, // Godot Engine
  616720, // Live2DViewerEX
  993090, // Lossless Scaling
  1325860, // VTube Studio
  2113850, // Spirit City: Lofi Sessions
  2826180, // ChillPulse
  3213850, // gogh: Focus with Your Avatar
  3548580, // Chill with You: Lo-Fi Story
])

const SOFTWARE_GENRE_IDS = new Set(['51', '52', '53', '54', '55', '57', '58', '59', '60'])
const NON_GAME_STORE_TYPES = new Set(['application', 'tool'])

function isSoftware(game) {
  const appid = Number(game.appid)
  const storeInfo = game.storeInfo || {}
  if (SOFTWARE_APP_IDS.has(appid)) return true
  if (NON_GAME_STORE_TYPES.has(storeInfo.type)) return true
  return (storeInfo.genreIds || []).some(id => SOFTWARE_GENRE_IDS.has(String(id)))
}

export function getGameCategory(game) {
  if (Number(game.appid) === STAR_ENGINE_APP_ID) return 'star-engine'
  if (isSoftware(game)) return 'software'
  if (!game.playtimeForever || game.storeInfo?.isFree) return 'junk'

  const categoryIds = new Set((game.storeInfo?.categoryIds || []).map(Number))
  const supportsSingleplayer = categoryIds.has(2)
  const supportsMultiplayer = categoryIds.has(1)

  if (supportsSingleplayer && supportsMultiplayer) return 'both'
  if (supportsMultiplayer) return 'multiplayer'
  return 'singleplayer'
}

export function getGameCategoryOption(categoryId) {
  return GAME_CATEGORY_OPTIONS.find(option => option.id === categoryId)
}
