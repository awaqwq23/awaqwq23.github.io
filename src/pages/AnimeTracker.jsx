import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router'

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'RELEASING', label: '连载中' },
  { id: 'NOT_YET_RELEASED', label: '待播' },
  { id: 'FINISHED', label: '已完结' },
]

const GROUP_ORDER = ['近期追番', '正在看', '想看', '他人推荐', '已看', '想二刷', '已二刷', '已放弃']
const PAGE_SIZE = 12
const WATCH_PROGRESS_KEY = 'awa-anime-watch-progress-v1'

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

function clampEpisode(value, totalEpisodes) {
  const episode = Number.parseInt(value, 10)
  if (!Number.isFinite(episode)) return 1
  return Math.max(1, totalEpisodes ? Math.min(totalEpisodes, episode) : episode)
}

function AnimeCard({ entry, now, watchProgress, onWatchProgressChange }) {
  const status = STATUS_COPY[entry.status] || { label: '状态未知', icon: 'fa-circle-question' }
  const progress = entry.totalEpisodes
    ? Math.min(100, Math.round(entry.releasedEpisodes / entry.totalEpisodes * 100))
    : 0
  const episodeCopy = entry.totalEpisodes
    ? `${entry.releasedEpisodes} / ${entry.totalEpisodes} 集`
    : `已更新 ${entry.releasedEpisodes} 集`
  const personalStatus = watchProgress?.status || 'not_started'
  const personalEpisode = personalStatus === 'watching' ? watchProgress.episode : 1
  const personalStatusCopy = personalStatus === 'finished'
    ? '已看完'
    : personalStatus === 'watching'
      ? `看到第 ${personalEpisode} 集`
      : '还没看'

  const setEpisode = value => {
    onWatchProgressChange(entry.id, {
      status: 'watching',
      episode: clampEpisode(value, entry.totalEpisodes),
    })
  }

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
        <div className="anime-group-tags">
          <span className="anime-format-tag"><i className={entry.format === 'MOVIE' ? 'fas fa-film' : 'fas fa-clapperboard'} /> {entry.formatLabel || entry.format || '动画'}</span>
          {(entry.groups || []).map(group => <span key={group}>{group}</span>)}
        </div>
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

        {entry.relatedAnime?.length > 0 && (
          <details className="anime-series-details">
            <summary><i className="fas fa-code-branch" /> 系列季度与剧场版 <strong>{entry.relatedAnime.length}</strong></summary>
            <div className="anime-series-list">
              {entry.relatedAnime.map(related => (
                <a href={related.siteUrl} target="_blank" rel="noopener noreferrer" key={related.id}>
                  <span>{related.relationLabel} · {related.formatLabel}</span>
                  <strong>{related.title}</strong>
                  <i className="fas fa-arrow-up-right-from-square" />
                </a>
              ))}
            </div>
          </details>
        )}

        <div className="anime-personal-progress">
          <div className="anime-personal-heading">
            <span><i className="fas fa-bookmark" /> 我的进度</span>
            <strong>{personalStatusCopy}</strong>
          </div>
          <div className="anime-progress-controls" role="group" aria-label={`${entry.title}的观看进度`}>
            <button
              type="button"
              className={personalStatus === 'not_started' ? 'active' : ''}
              onClick={() => onWatchProgressChange(entry.id, null)}
            >
              没看
            </button>
            <div className={`anime-episode-picker ${personalStatus === 'watching' ? 'active' : ''}`}>
              <button type="button" onClick={() => setEpisode(personalEpisode - 1)} aria-label={`${entry.title}观看集数减一`}>−</button>
              <label>
                看到第
                <input
                  type="number"
                  min="1"
                  max={entry.totalEpisodes || undefined}
                  value={personalEpisode}
                  onChange={event => setEpisode(event.target.value)}
                  aria-label={`${entry.title}看到的集数`}
                />
                集
              </label>
              <button type="button" onClick={() => setEpisode(personalEpisode + 1)} aria-label={`${entry.title}观看集数加一`}>+</button>
            </div>
            <button
              type="button"
              className={personalStatus === 'finished' ? 'active finished' : ''}
              onClick={() => onWatchProgressChange(entry.id, {
                status: 'finished',
                episode: entry.totalEpisodes || Math.max(entry.releasedEpisodes || 0, personalEpisode),
              })}
            >
              看完
            </button>
          </div>
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
  const [group, setGroup] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(Date.now())
  const [watchProgress, setWatchProgress] = useState(() => {
    try {
      const savedProgress = JSON.parse(window.localStorage.getItem(WATCH_PROGRESS_KEY) || '{}')
      return savedProgress && typeof savedProgress === 'object' && !Array.isArray(savedProgress) ? savedProgress : {}
    } catch {
      return {}
    }
  })

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

  useEffect(() => {
    try {
      window.localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(watchProgress))
    } catch {
      // The tracker still works for this session when browser storage is unavailable.
    }
  }, [watchProgress])

  const updateWatchProgress = (entryId, nextProgress) => {
    setWatchProgress(current => {
      const next = { ...current }
      if (nextProgress) next[String(entryId)] = nextProgress
      else delete next[String(entryId)]
      return next
    })
  }

  const groups = useMemo(() => {
    const available = new Set((data?.entries || []).flatMap(entry => entry.groups || []))
    return GROUP_ORDER.filter(item => available.has(item))
  }, [data])

  const filteredEntries = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN')
    return (data?.entries || [])
      .filter(entry => filter === 'all' || entry.status === filter)
      .filter(entry => group === 'all' || entry.groups?.includes(group))
      .filter(entry => !keyword || `${entry.title} ${entry.subtitle} ${entry.sourceTitle}`.toLocaleLowerCase('zh-CN').includes(keyword))
      .sort((left, right) => getSortTime(left) - getSortTime(right))
  }, [data, filter, group, search])

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const entries = useMemo(() => filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredEntries, page])

  useEffect(() => { setPage(1) }, [filter, group, search])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

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
      <nav className="anime-page-tabs" aria-label="追番页面">
        <NavLink to="/anime" end><i className="fas fa-bookmark" /> 我的追番</NavLink>
        <NavLink to="/anime/bangumi"><i className="fas fa-star" /> Bangumi 高分连载</NavLink>
      </nav>
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

          <div className="anime-browse-controls">
            <label className="anime-search">
              <i className="fas fa-magnifying-glass" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索番剧名称" aria-label="搜索番剧名称" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="清空搜索"><i className="fas fa-times" /></button>}
            </label>
            <label className="anime-group-select">
              <i className="fas fa-folder-open" />
              <select value={group} onChange={event => setGroup(event.target.value)} aria-label="按番单分类筛选">
                <option value="all">全部番单分类</option>
                {groups.map(item => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="anime-toolbar">
            <div className="anime-filters" role="group" aria-label="按放送状态筛选">
              {FILTERS.map(item => (
                <button type="button" key={item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>
              ))}
            </div>
            <span><strong>{filteredEntries.length}</strong> 部 · 第 {page}/{pageCount} 页 · <i className="fas fa-rotate" /> {syncFormatter.format(new Date(data.syncedAt))} 查询</span>
          </div>

          {entries.length ? (
            <section className="anime-grid">
              {entries.map(entry => (
                <AnimeCard
                  key={entry.id}
                  entry={entry}
                  now={now}
                  watchProgress={watchProgress[String(entry.id)]}
                  onWatchProgressChange={updateWatchProgress}
                />
              ))}
            </section>
          ) : (
            <div className="anime-empty"><i className="fas fa-inbox" /><p>这个分类里暂时没有番剧</p></div>
          )}

          {pageCount > 1 && (
            <nav className="anime-pagination" aria-label="追番列表分页">
              <button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1}><i className="fas fa-arrow-left" /> 上一页</button>
              <span>第 <strong>{page}</strong> / {pageCount} 页</span>
              <button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={page === pageCount}>下一页 <i className="fas fa-arrow-right" /></button>
            </nav>
          )}

          <footer className="anime-data-note">
            <i className="fas fa-database" />
            <span>
              数据来自 <a href={data.source.url} target="_blank" rel="noopener noreferrer">{data.source.name}</a>。{data.source.note}
              <small><i className="fas fa-shield-halved" /> 观看进度只保存在当前浏览器，不会上传，也不会被每日更新覆盖。</small>
            </span>
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
