import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

const WHU = { lat: 30.5308439, lon: 114.3546982, label: '武汉大学信息学部' }
const WHU_CAMPUS_BOUNDS = [
  { minLat: 30.5262, maxLat: 30.5360, minLon: 114.3495, maxLon: 114.3608 },
  { minLat: 30.5300, maxLat: 30.5490, minLon: 114.3570, maxLon: 114.3830 },
]
const WHU_INFORMATION_FOOD = [
  { id: 'whu-info-canteen-1', name: '信息学部学生一食堂', type: 'canteen', lat: 30.528325, lon: 114.359267, priority: 'information-campus' },
  { id: 'whu-info-canteen-2', name: '信息学部学生二食堂', type: 'canteen', lat: 30.52703, lon: 114.358662, priority: 'information-campus' },
  { id: 'whu-info-canteen-3', name: '信息学部学生三食堂', type: 'canteen', lat: 30.52716, lon: 114.358375, priority: 'information-campus' },
  { id: 'whu-info-canteen-4', name: '信息学部学生四食堂', type: 'canteen', lat: 30.52716, lon: 114.358375, priority: 'information-campus' },
  { id: 'whu-info-xinghuyuan', name: '星湖园餐厅', type: 'restaurant', lat: 30.5327278, lon: 114.3550221 },
].map(place => ({ ...place, isCampus: true }))
const INSTALLED_STORAGE_KEY = 'awa-installed-steam-games'
const FOOD_TYPES = {
  restaurant: '餐厅',
  fast_food: '快餐',
  cafe: '咖啡甜品',
  food_court: '美食城',
  canteen: '食堂',
}

function distanceBetween(lat1, lon1, lat2, lon2) {
  const radians = value => value * Math.PI / 180
  const earthRadius = 6371
  const latDistance = radians(lat2 - lat1)
  const lonDistance = radians(lon2 - lon1)
  const value = Math.sin(latDistance / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(lonDistance / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function isInsideWhuCampus(lat, lon) {
  return WHU_CAMPUS_BOUNDS.some(bounds => lat >= bounds.minLat && lat <= bounds.maxLat
    && lon >= bounds.minLon && lon <= bounds.maxLon)
}

function getFoodWeight(place) {
  const distanceWeight = 1 / Math.max(0.2, Math.sqrt(place.distance))
  if (place.priority === 'information-campus') return distanceWeight * 6
  if (place.isCampus) return distanceWeight * 3
  return distanceWeight
}

function getInformationCampusFood(origin, radius) {
  return WHU_INFORMATION_FOOD
    .map(place => ({ ...place, distance: distanceBetween(origin.lat, origin.lon, place.lat, place.lon) }))
    .filter(place => place.distance <= radius / 1000)
}

function weightedPick(items, getWeight) {
  if (!items.length) return null
  const weights = items.map(item => Math.max(0.001, getWeight(item)))
  let cursor = Math.random() * weights.reduce((sum, weight) => sum + weight, 0)
  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index]
    if (cursor <= 0) return items[index]
  }
  return items.at(-1)
}

function formatPlaytime(minutes = 0) {
  if (!minutes) return '暂无时长'
  const hours = minutes / 60
  return `${hours >= 100 ? Math.round(hours) : hours.toFixed(1)} 小时`
}

function parseManifest(text) {
  const appid = text.match(/"appid"\s+"(\d+)"/i)?.[1]
  const name = text.match(/"name"\s+"((?:\\.|[^"])*)"/i)?.[1]?.replace(/\\"/g, '"')
  return appid && name ? { appid: Number(appid), name } : null
}

async function readManifestFiles(files) {
  const manifests = []
  for (const file of files) {
    if (!/^appmanifest_\d+\.acf$/i.test(file.name)) continue
    const game = parseManifest(await file.text())
    if (game) manifests.push(game)
  }
  return manifests
}

function TodayPicker() {
  const [restaurants, setRestaurants] = useState([])
  const [foodMode, setFoodMode] = useState('whu')
  const [foodType, setFoodType] = useState('all')
  const [radius, setRadius] = useState(2000)
  const [foodStatus, setFoodStatus] = useState('idle')
  const [foodError, setFoodError] = useState('')
  const [foodResult, setFoodResult] = useState(null)
  const [foodOrigin, setFoodOrigin] = useState(WHU)
  const [steamData, setSteamData] = useState(null)
  const [installedGames, setInstalledGames] = useState(() => {
    try { return JSON.parse(localStorage.getItem(INSTALLED_STORAGE_KEY) || '[]') }
    catch { return [] }
  })
  const [gameScope, setGameScope] = useState('all')
  const [gameWeight, setGameWeight] = useState('playtime')
  const [gameResult, setGameResult] = useState(null)
  const [gameStatus, setGameStatus] = useState('idle')
  const [scanStatus, setScanStatus] = useState('idle')
  const [scanMessage, setScanMessage] = useState('')
  const manifestInputRef = useRef(null)
  const foodRequestRef = useRef({ id: 0, controller: null })
  const foodTimerRef = useRef(null)
  const gameTimerRef = useRef(null)

  useEffect(() => {
    fetch(`/materials/steam-library.json?v=${Date.now()}`, { cache: 'no-store' })
      .then(response => response.json())
      .then(setSteamData)
      .catch(() => setSteamData({ status: 'unavailable', games: [] }))
    return () => {
      foodRequestRef.current.id += 1
      foodRequestRef.current.controller?.abort()
      clearInterval(foodTimerRef.current)
      clearInterval(gameTimerRef.current)
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(installedGames)) }
    catch { /* Installed-game detection still works for this visit. */ }
  }, [installedGames])

  const loadRestaurants = async (mode, requestedRadius = radius) => {
    const requestId = foodRequestRef.current.id + 1
    foodRequestRef.current.id = requestId
    foodRequestRef.current.controller?.abort()
    foodRequestRef.current.controller = null
    setFoodMode(mode)
    setFoodStatus('loading')
    setFoodError('')
    setFoodResult(null)
    setRestaurants([])
    let origin = mode === 'whu' ? WHU : null
    if (origin) setFoodOrigin(origin)
    try {
      if (mode === 'nearby') {
        if (!navigator.geolocation) throw new Error('当前浏览器不支持定位')
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 5 * 60 * 1000,
        }))
        if (requestId !== foodRequestRef.current.id) return
        origin = { lat: position.coords.latitude, lon: position.coords.longitude, label: '我的位置' }
        setFoodOrigin(origin)
      }

      const query = `[out:json][timeout:18];nwr(around:${requestedRadius},${origin.lat},${origin.lon})[amenity~"^(restaurant|fast_food|cafe|food_court|canteen)$"][name];out center tags;`
      const controller = new AbortController()
      foodRequestRef.current.controller = controller
      const timeoutId = setTimeout(() => controller.abort(), 20000)
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId)
        if (foodRequestRef.current.controller === controller) foodRequestRef.current.controller = null
      })
      if (requestId !== foodRequestRef.current.id) return
      if (!response.ok) throw new Error(`附近店铺查询失败（${response.status}）`)
      const payload = await response.json()
      if (requestId !== foodRequestRef.current.id) return
      const seen = new Set()
      const places = payload.elements.flatMap(element => {
        const lat = element.lat ?? element.center?.lat
        const lon = element.lon ?? element.center?.lon
        const name = element.tags?.['name:zh'] || element.tags?.name
        if (!lat || !lon || !name) return []
        const key = `${name}-${Math.round(lat * 10000)}-${Math.round(lon * 10000)}`
        if (seen.has(key)) return []
        seen.add(key)
        return [{
          id: `${element.type}-${element.id}`,
          name,
          type: element.tags.amenity,
          cuisine: element.tags.cuisine || '',
          lat,
          lon,
          distance: distanceBetween(origin.lat, origin.lon, lat, lon),
          isCampus: isInsideWhuCampus(lat, lon) || /武汉大学|武大/.test(name),
        }]
      })
      const fixedPlaces = getInformationCampusFood(origin, requestedRadius)
      const mergedPlaces = [...fixedPlaces, ...places]
        .filter((place, index, all) => all.findIndex(candidate => candidate.name === place.name) === index)
        .sort((left, right) => left.distance - right.distance)
      if (!mergedPlaces.length) throw new Error('这个范围内没有找到餐厅，试试扩大范围')
      setFoodOrigin(origin)
      setRestaurants(mergedPlaces)
      setFoodStatus('ready')
    } catch (error) {
      if (requestId !== foodRequestRef.current.id) return
      const fixedPlaces = origin ? getInformationCampusFood(origin, requestedRadius) : []
      if (fixedPlaces.length) {
        setFoodOrigin(origin)
        setRestaurants(fixedPlaces)
        setFoodStatus('ready')
        return
      }
      if (error.code === 1) setFoodError('定位权限被拒绝，可以改用“信息学部附近”')
      else if (error.code === 2) setFoodError('暂时无法获取位置，可以稍后重试')
      else if (error.code === 3) setFoodError('定位超时，可以稍后重试')
      else setFoodError(error.message || '查询失败，请稍后重试')
      setFoodStatus('error')
    }
  }

  useEffect(() => { loadRestaurants('whu', radius) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const availableRestaurants = useMemo(() => restaurants.filter(place => foodType === 'all' || place.type === foodType), [restaurants, foodType])

  const drawFood = () => {
    if (!availableRestaurants.length || foodStatus === 'rolling') return
    setFoodStatus('rolling')
    clearInterval(foodTimerRef.current)
    let ticks = 0
    foodTimerRef.current = setInterval(() => {
      const preview = availableRestaurants[Math.floor(Math.random() * availableRestaurants.length)]
      setFoodResult(preview)
      ticks += 1
      if (ticks >= 14) {
        clearInterval(foodTimerRef.current)
        const pool = availableRestaurants.length > 1 && foodResult
          ? availableRestaurants.filter(place => place.id !== foodResult.id)
          : availableRestaurants
        setFoodResult(weightedPick(pool, getFoodWeight))
        setFoodStatus('ready')
      }
    }, 65)
  }

  const steamGames = steamData?.games || []
  const allGames = useMemo(() => {
    const merged = new Map(steamGames.map(game => [Number(game.appid), { ...game, installed: false }]))
    installedGames.forEach(game => merged.set(Number(game.appid), {
      headerUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
      storeUrl: `https://store.steampowered.com/app/${game.appid}/`,
      playtimeForever: 0,
      ...merged.get(Number(game.appid)),
      ...game,
      installed: true,
    }))
    return [...merged.values()]
  }, [steamGames, installedGames])

  const gamePool = useMemo(() => gameScope === 'installed' ? allGames.filter(game => game.installed) : allGames, [allGames, gameScope])

  const addInstalledGames = games => {
    if (!games.length) {
      setScanStatus('error')
      setScanMessage('没有找到 appmanifest_*.acf，请选择 SteamLibrary/steamapps 文件夹')
      return
    }
    setInstalledGames(current => {
      const merged = new Map(current.map(game => [Number(game.appid), game]))
      games.forEach(game => merged.set(Number(game.appid), game))
      return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name))
    })
    setGameScope('installed')
    setScanStatus('ready')
    setScanMessage(`已在本机识别 ${games.length} 款 Steam 游戏`)
  }

  const scanSteamFolder = async () => {
    if (!window.showDirectoryPicker) {
      manifestInputRef.current?.click()
      return
    }
    setScanStatus('loading')
    setScanMessage('正在读取 Steam 清单……')
    try {
      let directory = await window.showDirectoryPicker({ id: 'awa-steamapps', mode: 'read' })
      if (directory.name.toLowerCase() !== 'steamapps') {
        try { directory = await directory.getDirectoryHandle('steamapps') }
        catch { /* The user may already have selected a library-like folder. */ }
      }
      const files = []
      for await (const entry of directory.values()) {
        if (entry.kind === 'file' && /^appmanifest_\d+\.acf$/i.test(entry.name)) files.push(await entry.getFile())
      }
      addInstalledGames(await readManifestFiles(files))
    } catch (error) {
      if (error.name === 'AbortError') {
        setScanStatus('idle')
        setScanMessage('')
      } else {
        setScanStatus('error')
        setScanMessage('读取失败，请直接选择 steamapps 里的 appmanifest 文件')
      }
    }
  }

  const importManifestFiles = async event => {
    setScanStatus('loading')
    const games = await readManifestFiles([...event.target.files])
    addInstalledGames(games)
    event.target.value = ''
  }

  const drawGame = () => {
    if (!gamePool.length || gameStatus === 'rolling') return
    setGameStatus('rolling')
    clearInterval(gameTimerRef.current)
    let ticks = 0
    gameTimerRef.current = setInterval(() => {
      setGameResult(gamePool[Math.floor(Math.random() * gamePool.length)])
      ticks += 1
      if (ticks >= 14) {
        clearInterval(gameTimerRef.current)
        const pool = gamePool.length > 1 && gameResult ? gamePool.filter(game => game.appid !== gameResult.appid) : gamePool
        const selected = weightedPick(pool, game => gameWeight === 'playtime' ? Math.max(game.playtimeForever || 0, 30) : 1)
        const totalWeight = pool.reduce((sum, game) => sum + (gameWeight === 'playtime' ? Math.max(game.playtimeForever || 0, 30) : 1), 0)
        setGameResult({ ...selected, drawChance: ((gameWeight === 'playtime' ? Math.max(selected.playtimeForever || 0, 30) : 1) / totalWeight) * 100 })
        setGameStatus('ready')
      }
    }, 65)
  }

  return (
    <div className="page today-picker-page">
      <section className="today-picker-hero">
        <span>LET AWA DECIDE</span>
        <h1>今天选什么？</h1>
        <p>别纠结了，交给概率。</p>
      </section>

      <div className="today-picker-grid">
        <section className="decision-card food-decision-card">
          <header>
            <div className="decision-icon"><i className="fas fa-utensils" /></div>
            <div><span>WHAT TO EAT</span><h2>今天吃什么</h2></div>
          </header>

          <div className="decision-segments">
            <button type="button" className={foodMode === 'whu' ? 'active' : ''} onClick={() => loadRestaurants('whu')}><i className="fas fa-school" /> 信息学部附近</button>
            <button type="button" className={foodMode === 'nearby' ? 'active' : ''} onClick={() => loadRestaurants('nearby')}><i className="fas fa-location-crosshairs" /> 我附近</button>
          </div>
          <div className="decision-options">
            <label>范围
              <select value={radius} onChange={event => { const next = Number(event.target.value); setRadius(next); loadRestaurants(foodMode, next) }}>
                <option value="1000">1 公里</option>
                <option value="2000">2 公里</option>
                <option value="3000">3 公里</option>
                <option value="5000">5 公里</option>
              </select>
            </label>
            <label>类型
              <select value={foodType} onChange={event => { setFoodType(event.target.value); setFoodResult(null) }}>
                <option value="all">什么都吃</option>
                <option value="canteen">食堂</option>
                <option value="restaurant">餐厅</option>
                <option value="fast_food">快餐</option>
                <option value="food_court">美食城</option>
                <option value="cafe">咖啡甜品</option>
              </select>
            </label>
          </div>

          <div className={`decision-result food-result${foodStatus === 'rolling' ? ' rolling' : ''}`}>
            {foodResult ? (
              <>
                <span>{foodResult.priority === 'information-campus' ? '信部优先 · ' : foodResult.isCampus ? '校内优先 · ' : ''}{FOOD_TYPES[foodResult.type] || '吃点好的'} · 距{foodOrigin.label} {foodResult.distance.toFixed(1)} km</span>
                <h3>{foodResult.name}</h3>
                {foodResult.cuisine && <p>{foodResult.cuisine.replaceAll(';', ' · ')}</p>}
                <a href={`https://www.openstreetmap.org/?mlat=${foodResult.lat}&mlon=${foodResult.lon}#map=18/${foodResult.lat}/${foodResult.lon}`} target="_blank" rel="noopener">
                  看看在哪 <i className="fas fa-arrow-up-right-from-square" />
                </a>
              </>
            ) : foodStatus === 'loading' ? (
              <><i className="fas fa-spinner fa-spin" /><p>正在找附近能吃的……</p></>
            ) : foodStatus === 'error' ? (
              <><i className="fas fa-location-dot" /><p>{foodError}</p></>
            ) : (
              <><i className="fas fa-bowl-food" /><p>先选一个范围</p></>
            )}
          </div>
          <button type="button" className="decision-draw-button food-draw-button" disabled={!availableRestaurants.length || foodStatus === 'loading' || foodStatus === 'rolling'} onClick={drawFood}>
            <i className={`fas ${foodStatus === 'rolling' ? 'fa-dice fa-spin' : 'fa-wand-magic-sparkles'}`} />
            {foodStatus === 'rolling' ? '命运正在选择' : foodResult ? '不满意，再来一次' : `从 ${availableRestaurants.length} 家里抽一个`}
          </button>
          <small className="decision-privacy"><i className="fas fa-shield-halved" /> 定位只用于本次查询，不会保存 · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></small>
        </section>

        <section className="decision-card game-decision-card">
          <header>
            <div className="decision-icon"><i className="fab fa-steam" /></div>
            <div><span>WHAT TO PLAY</span><h2>今天玩什么</h2></div>
          </header>

          <div className="decision-segments">
            <button type="button" className={gameScope === 'all' ? 'active' : ''} onClick={() => { setGameScope('all'); setGameResult(null) }}><i className="fas fa-layer-group" /> 整个库</button>
            <button type="button" className={gameScope === 'installed' ? 'active' : ''} onClick={() => { setGameScope('installed'); setGameResult(null) }} disabled={!installedGames.length}><i className="fas fa-hard-drive" /> 已安装 {installedGames.length || ''}</button>
          </div>
          <div className="decision-options">
            <label>抽取方式
              <select value={gameWeight} onChange={event => { setGameWeight(event.target.value); setGameResult(null) }}>
                <option value="playtime">按游玩时间比例</option>
                <option value="equal">每款概率相同</option>
              </select>
            </label>
          </div>

          <div className={`decision-result game-result${gameStatus === 'rolling' ? ' rolling' : ''}`}>
            {gameResult ? (
              <>
                <div className="game-result-cover">
                  <img src={gameResult.headerUrl} alt="" onError={event => { event.currentTarget.style.display = 'none' }} />
                  {gameResult.installed && <span><i className="fas fa-hard-drive" /> 已安装</span>}
                </div>
                <div className="game-result-copy">
                  <span>{formatPlaytime(gameResult.playtimeForever)} · 本轮概率 {gameResult.drawChance?.toFixed(1) || '—'}%</span>
                  <h3>{gameResult.name}</h3>
                  <div>
                    {gameResult.installed && <a href={`steam://run/${gameResult.appid}`}><i className="fas fa-play" /> 启动游戏</a>}
                    <a href={gameResult.storeUrl} target="_blank" rel="noopener">Steam 页面 <i className="fas fa-arrow-up-right-from-square" /></a>
                  </div>
                </div>
              </>
            ) : gameStatus === 'rolling' ? (
              <><i className="fas fa-dice fa-spin" /><p>正在翻你的游戏库……</p></>
            ) : (
              <><i className="fab fa-steam" /><p>{gamePool.length ? `有 ${gamePool.length} 款游戏等待被选中` : '还没有可抽取的游戏'}</p></>
            )}
          </div>
          <button type="button" className="decision-draw-button game-draw-button" disabled={!gamePool.length || gameStatus === 'rolling'} onClick={drawGame}>
            <i className={`fas ${gameStatus === 'rolling' ? 'fa-dice fa-spin' : 'fa-gamepad'}`} />
            {gameStatus === 'rolling' ? '命运正在选择' : gameResult ? '不想玩，换一个' : '帮我挑一款'}
          </button>

          <div className="installed-game-reader">
            <button type="button" onClick={scanSteamFolder} disabled={scanStatus === 'loading'}>
              <i className={`fas ${scanStatus === 'loading' ? 'fa-spinner fa-spin' : 'fa-folder-open'}`} /> 读取已安装 Steam 游戏
            </button>
            <button type="button" className="manifest-fallback" onClick={() => manifestInputRef.current?.click()}>选择清单文件</button>
            <input ref={manifestInputRef} type="file" accept=".acf" multiple hidden onChange={importManifestFiles} />
            {scanMessage && <p className={scanStatus === 'error' ? 'is-error' : ''}>{scanMessage}</p>}
            <small>选择 SteamLibrary 里的 <strong>steamapps</strong> 文件夹，只读取 appmanifest 清单；不会读取游戏内容或上传文件。</small>
          </div>

          {steamData?.status !== 'ready' && (
            <p className="steam-sync-hint"><i className="fas fa-circle-info" /> Steam 在线库尚未同步，<Link to="/games">完成 Steam 配置</Link>后可按真实游玩时长抽取。</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default TodayPicker
