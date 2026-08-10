import { useEffect, useMemo, useState } from 'react'

const INITIAL_LIMIT = 12

function formatPlaytime(minutes = 0) {
  if (minutes < 60) return `${minutes} 分钟`
  const hours = minutes / 60
  return `${hours >= 100 ? Math.round(hours) : hours.toFixed(1)} 小时`
}

function formatLastPlayed(value) {
  if (!value) return '还没玩过'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export default function SteamLibrary() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('played')
  const [sort, setSort] = useState('playtime')
  const [limit, setLimit] = useState(INITIAL_LIMIT)

  useEffect(() => {
    fetch(`/materials/steam-library.json?v=${Date.now()}`, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Steam 数据加载失败')
        return response.json()
      })
      .then(setData)
      .catch(() => setError(true))
  }, [])

  useEffect(() => setLimit(INITIAL_LIMIT), [search, scope, sort])

  const games = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = (data?.games || []).filter(game => {
      if (scope === 'recent' && !game.playtimeTwoWeeks) return false
      if (scope === 'played' && !game.playtimeForever) return false
      return !query || game.name.toLowerCase().includes(query)
    })

    return [...filtered].sort((left, right) => {
      if (sort === 'recent') return (new Date(right.lastPlayed || 0)) - (new Date(left.lastPlayed || 0))
      if (sort === 'name') return left.name.localeCompare(right.name, 'zh-CN')
      return scope === 'recent'
        ? right.playtimeTwoWeeks - left.playtimeTwoWeeks
        : right.playtimeForever - left.playtimeForever
    })
  }, [data, search, scope, sort])

  if (error) {
    return <div className="steam-state"><i className="fas fa-triangle-exclamation" /><p>Steam 游戏库暂时加载失败</p></div>
  }

  if (!data) {
    return <div className="steam-state"><i className="fas fa-spinner fa-spin" /><p>正在读取 Steam 游戏库……</p></div>
  }

  if (data.status === 'setup_required') {
    return (
      <div className="steam-state steam-state-setup">
        <i className="fab fa-steam" />
        <p>Steam 数据等待首次同步</p>
        <span>配置完成后，游戏库会自动出现在这里。</span>
      </div>
    )
  }

  const shownGames = games.slice(0, limit)

  return (
    <>
      <div className="steam-profile-card">
        <div className="steam-profile-main">
          <img src={data.profile.avatar} alt={`${data.profile.name} 的 Steam 头像`} />
          <div>
            <span>STEAM LIBRARY</span>
            <h2>{data.profile.name}</h2>
            <a href={data.profile.url} target="_blank" rel="noopener">
              打开 Steam 主页 <i className="fas fa-arrow-up-right-from-square" />
            </a>
          </div>
        </div>
        <div className="steam-profile-stats">
          <div><strong>{data.stats.gameCount}</strong><span>款游戏</span></div>
          <div><strong>{data.stats.playedGameCount}</strong><span>玩过</span></div>
          <div><strong>{formatPlaytime(data.stats.totalMinutes)}</strong><span>总游玩时间</span></div>
        </div>
      </div>

      <div className="steam-library-controls">
        <div className="docs-search steam-search">
          <i className="fas fa-search" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="搜索 Steam 游戏……"
            aria-label="搜索 Steam 游戏"
          />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="清除搜索"><i className="fas fa-times" /></button>}
        </div>
        <div className="steam-scope" aria-label="游戏范围">
          <button type="button" className={scope === 'played' ? 'active' : ''} onClick={() => setScope('played')}>玩过的</button>
          <button type="button" className={scope === 'recent' ? 'active' : ''} onClick={() => setScope('recent')}>近两周</button>
          <button type="button" className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>全部</button>
        </div>
        <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Steam 游戏排序">
          <option value="playtime">按游玩时长</option>
          <option value="recent">按最近游玩</option>
          <option value="name">按游戏名称</option>
        </select>
      </div>

      {shownGames.length ? (
        <>
          <div className="steam-games-grid">
            {shownGames.map(game => (
              <a className="steam-game-card" href={game.storeUrl} target="_blank" rel="noopener" key={game.appid}>
                <div className="steam-game-cover">
                  <img src={game.headerUrl} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none' }} />
                  {game.playtimeTwoWeeks > 0 && <span>近两周 {formatPlaytime(game.playtimeTwoWeeks)}</span>}
                </div>
                <div className="steam-game-copy">
                  <h3>{game.name}</h3>
                  <div className="steam-game-time">
                    <strong>{formatPlaytime(game.playtimeForever)}</strong>
                    <span>{formatLastPlayed(game.lastPlayed)}</span>
                  </div>
                  <div className="steam-playtime-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(3, Math.min(100, (game.playtimeForever / Math.max(games[0]?.playtimeForever || 1, 1)) * 100))}%` }} />
                  </div>
                </div>
              </a>
            ))}
          </div>
          {games.length > limit && (
            <div className="steam-show-more">
              <button type="button" className="btn btn-outline" onClick={() => setLimit(current => current + 12)}>
                再显示 {Math.min(12, games.length - limit)} 款 <i className="fas fa-chevron-down" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="steam-state"><i className="fas fa-ghost" /><p>这里没有符合条件的游戏</p></div>
      )}

      <p className="steam-updated-at">
        <i className="fas fa-arrows-rotate" /> 数据更新于 {new Date(data.updatedAt).toLocaleString('zh-CN')}
      </p>
    </>
  )
}
