import { useEffect, useMemo, useState } from 'react'

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'RELEASING', label: '连载中' },
  { id: 'NOT_YET_RELEASED', label: '待播' },
  { id: 'FINISHED', label: '已完结' },
]

const STATUS_COPY = {
  RELEASING: { label: '连载中', icon: 'fa-satellite-dish' },
  NOT_YET_RELEASED: { label: '待播', icon: 'fa-hourglass-half' },
  FINISHED: { label: '已完结', icon: 'fa-circle-check' },
  CANCELLED: { label: '已取消', icon: 'fa-circle-xmark' },
  HIATUS: { label: '暂停更新', icon: 'fa-pause' },
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const syncFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatCountdown(target, now) {
  const distance = new Date(target).getTime() - now
  if (distance <= 0) return '已经播出，等待下次同步'
  const totalMinutes = Math.floor(distance / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}天 ${hours}小时后`
  if (hours > 0) return `${hours}小时 ${minutes}分钟后`
  return `${Math.max(1, minutes)}分钟后`
}

function getSortTime(entry) {
  if (entry.nextAiringAt) return new Date(entry.nextAiringAt).getTime()
  if (entry.status === 'FINISHED') return Number.MAX_SAFE_INTEGER
  return Number.MAX_SAFE_INTEGER - 1
}

function AnimeCard({ entry, now }) {
  const status = STATUS_COPY[entry.status] || { label: '状态未知', icon: 'fa-circle-question' }
  const progress = entry.totalEpisodes
    ? Math.min(100, Math.round(entry.releasedEpisodes / entry.totalEpisodes * 100))
    : 0
  const episodeCopy = entry.totalEpisodes
    ? `${entry.releasedEpisodes} / ${entry.totalEpisodes} 集`
    : `已更新 ${entry.releasedEpisodes} 集`

  return (
    <article className={`anime-card status-${entry.status.toLowerCase()}`} style={{ '--anime-accent': entry.coverColor || '#3b82f6' }}>
      <div className="anime-cover">
        {entry.coverImage ? (
          <img src={entry.coverImage} alt={`${entry.title}封面`} loading="lazy" onError={event => { event.currentTarget.style.display = 'none' }} />
        ) : null}
        <span className="anime-cover-fallback"><i className="fas fa-tv" /></span>
        <span className="anime-status"><i className={`fas ${status.icon}`} /> {status.label}</span>
      </div>

      <div className="anime-card-body">
        <div className="anime-title-row">
          <div>
            <h2>{entry.title}</h2>
            <p>{entry.subtitle}</p>
          </div>
          <strong>{episodeCopy}</strong>
        </div>

        {entry.totalEpisodes && (
          <div className="anime-progress" aria-label={`更新进度 ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="anime-schedule">
          {entry.nextAiringAt ? (
            <>
              <div className="anime-schedule-icon"><i className="fas fa-calendar-day" /></div>
              <div>
                <span>第 {entry.nextEpisode} 集 · 北京时间</span>
                <strong>{dateTimeFormatter.format(new Date(entry.nextAiringAt))}</strong>
                <small>{formatCountdown(entry.nextAiringAt, now)}</small>
              </div>
            </>
          ) : entry.status === 'FINISHED' ? (
            <>
              <div className="anime-schedule-icon complete"><i className="fas fa-flag-checkered" /></div>
              <div><span>放送状态</span><strong>全篇已经完结</strong><small>{entry.endDate ? `完结日期 ${entry.endDate}` : '全部集数均已更新'}</small></div>
            </>
          ) : (
            <>
              <div className="anime-schedule-icon waiting"><i className="fas fa-clock" /></div>
              <div><span>下一次更新</span><strong>等待官方公布</strong><small>每日查询时会自动补上</small></div>
            </>
          )}
        </div>

        {entry.note && <p className="anime-note"><i className="fas fa-circle-info" /> {entry.note}</p>}
        <a className="anime-source-link" href={entry.siteUrl} target="_blank" rel="noopener noreferrer">
          在 AniList 查看条目 <i className="fas fa-arrow-up-right-from-square" />
        </a>
      </div>
    </article>
  )
}

export default function AnimeTracker() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/data/anime-tracker.json?v=${Date.now()}`, { cache: 'no-store', signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`读取失败（${response.status}）`)
        return response.json()
      })
      .then(setData)
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message || '追番数据暂时无法读取')
      })
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [])

  const entries = useMemo(() => (data?.entries || [])
    .filter(entry => filter === 'all' || entry.status === filter)
    .sort((left, right) => getSortTime(left) - getSortTime(right)), [data, filter])

  const summary = useMemo(() => {
    const all = data?.entries || []
    return {
      total: all.length,
      releasing: all.filter(entry => entry.status === 'RELEASING').length,
      upcoming: all.filter(entry => entry.status === 'NOT_YET_RELEASED').length,
      finished: all.filter(entry => entry.status === 'FINISHED').length,
    }
  }, [data])

  const nextEntry = useMemo(() => (data?.entries || [])
    .filter(entry => entry.nextAiringAt && new Date(entry.nextAiringAt).getTime() > now)
    .sort((left, right) => getSortTime(left) - getSortTime(right))[0], [data, now])

  return (
    <div className="page anime-tracker-page">
      <header className="anime-hero">
        <div className="anime-hero-copy">
          <span className="page-kicker">ANIME WATCHLIST</span>
          <h1><i className="fas fa-tv" /> 我的追番日历</h1>
          <p>每天自动查询更新时间、更新集数与完结状态，页面时间均为北京时间。</p>
        </div>
        {nextEntry && (
          <div className="anime-next-up">
            <span>NEXT EPISODE</span>
            <strong>{nextEntry.title} · 第 {nextEntry.nextEpisode} 集</strong>
            <small>{dateTimeFormatter.format(new Date(nextEntry.nextAiringAt))} · {formatCountdown(nextEntry.nextAiringAt, now)}</small>
          </div>
        )}
      </header>

      {data ? (
        <>
          <section className="anime-summary" aria-label="追番概览">
            <div><i className="fas fa-layer-group" /><span><strong>{summary.total}</strong>正在追踪</span></div>
            <div><i className="fas fa-satellite-dish" /><span><strong>{summary.releasing}</strong>连载中</span></div>
            <div><i className="fas fa-hourglass-half" /><span><strong>{summary.upcoming}</strong>等待开播</span></div>
            <div><i className="fas fa-circle-check" /><span><strong>{summary.finished}</strong>已经完结</span></div>
          </section>

          <div className="anime-toolbar">
            <div className="anime-filters" role="group" aria-label="按状态筛选">
              {FILTERS.map(item => (
                <button type="button" key={item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <span><i className="fas fa-rotate" /> {syncFormatter.format(new Date(data.syncedAt))} 查询</span>
          </div>

          {entries.length ? (
            <section className="anime-grid">
              {entries.map(entry => <AnimeCard key={entry.id} entry={entry} now={now} />)}
            </section>
          ) : (
            <div className="anime-empty"><i className="fas fa-inbox" /><p>这个分类里暂时没有番剧</p></div>
          )}

          <footer className="anime-data-note">
            <i className="fas fa-database" />
            <span>数据来自 <a href={data.source.url} target="_blank" rel="noopener noreferrer">{data.source.name}</a>。{data.source.note}</span>
          </footer>
        </>
      ) : error ? (
        <div className="anime-state error"><i className="fas fa-triangle-exclamation" /><h2>追番数据加载失败</h2><p>{error}</p></div>
      ) : (
        <div className="anime-state"><i className="fas fa-spinner fa-spin" /><h2>正在读取追番日历</h2><p>稍等一下，马上就好。</p></div>
      )}
    </div>
  )
}
