import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router'
import {
  BANGUMI_PROGRESS_KEY, BANGUMI_RELATIONS_KEY, CUSTOM_TRACKER_KEY, TRACKER_PROGRESS_KEY,
  buildTrackerBangumiMap, categoryForEntry, createExportPayload,
  fetchBangumiEntryFromUrl, flattenBangumiSubjects, parseImportPayload,
  readStoredObject, sanitizeCustomEntries, sanitizeProgress,
  syncTrackerRecordToBangumi, writeStoredObject,
} from '../utils/animeRecords'

const RELEASE_FILTERS = [
  { id: 'all', label: '全部放送状态' },
  { id: 'RELEASING', label: '连载中' },
  { id: 'NOT_YET_RELEASED', label: '待播放' },
  { id: 'FINISHED', label: '已播放' },
]
const PERSONAL_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'finished', label: '已看', icon: 'fa-circle-check' },
  { id: 'watching', label: '正在看', icon: 'fa-play' },
  { id: 'planned', label: '想看', icon: 'fa-bookmark' },
]
const CATEGORY_COPY = {
  finished: { label: '已看', icon: 'fa-circle-check' },
  watching: { label: '正在看', icon: 'fa-play' },
  planned: { label: '想看', icon: 'fa-bookmark' },
}
const PAGE_SIZE = 12
const STATUS_COPY = {
  RELEASING: { label: '连载中', icon: 'fa-satellite-dish' },
  NOT_YET_RELEASED: { label: '待播放', icon: 'fa-hourglass-half' },
  FINISHED: { label: '已播放', icon: 'fa-circle-check' },
  CANCELLED: { label: '已取消', icon: 'fa-circle-xmark' },
  HIATUS: { label: '暂停更新', icon: 'fa-pause' },
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'short',
  hour: '2-digit', minute: '2-digit', hour12: false,
})
const syncFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
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
  if (entry.category === 'watching' && entry.nextAiringAt) return new Date(entry.nextAiringAt).getTime()
  return -(new Date(entry.startDate || 0).getTime() || 0)
}

function clampEpisode(value, totalEpisodes) {
  const episode = Number.parseInt(value, 10)
  if (!Number.isFinite(episode)) return 1
  return Math.max(1, totalEpisodes ? Math.min(totalEpisodes, episode) : episode)
}

function AnimeCard({ entry, now, watchProgress, onWatchProgressChange }) {
  const status = STATUS_COPY[entry.status] || { label: '状态未知', icon: 'fa-circle-question' }
  const category = CATEGORY_COPY[entry.category]
  const releaseProgress = entry.totalEpisodes ? Math.min(100, Math.round(entry.releasedEpisodes / entry.totalEpisodes * 100)) : 0
  const episodeCopy = entry.totalEpisodes ? `${entry.releasedEpisodes} / ${entry.totalEpisodes} 集` : `已更新 ${entry.releasedEpisodes || 0} 集`
  const personalEpisode = watchProgress?.status === 'watching' ? Math.max(1, watchProgress.episode || 1) : 1
  const personalStatusCopy = entry.category === 'finished' ? '已看完' : entry.category === 'watching' ? `看到第 ${personalEpisode} 集` : '准备观看'
  const setEpisode = value => onWatchProgressChange(entry, { status: 'watching', episode: clampEpisode(value, entry.totalEpisodes) })

  return (
    <article className={`anime-card status-${entry.status.toLowerCase()}`} style={{ '--anime-accent': entry.coverColor || '#3b82f6' }}>
      <div className="anime-cover">
        {entry.coverImage ? <img src={entry.coverImage} alt={`${entry.title}封面`} loading="lazy" onError={event => { event.currentTarget.style.display = 'none' }} /> : null}
        <span className="anime-cover-fallback"><i className="fas fa-tv" /></span>
        <span className="anime-status"><i className={`fas ${status.icon}`} /> {status.label}</span>
      </div>
      <div className="anime-card-body">
        <div className="anime-group-tags">
          <span className="anime-format-tag"><i className={entry.format === 'MOVIE' ? 'fas fa-film' : 'fas fa-clapperboard'} /> {entry.formatLabel || '动画'}</span>
          <span><i className={`fas ${category.icon}`} /> {category.label}</span>
          {Number.isFinite(entry.score) && <span className="anime-score-tag"><i className="fas fa-star" /> {entry.score.toFixed(1)}</span>}
        </div>
        <div className="anime-title-row"><div><h2>{entry.title}</h2><p>{entry.subtitle}</p></div><strong>{episodeCopy}</strong></div>
        {entry.totalEpisodes && <div className="anime-progress" aria-label={`更新进度 ${releaseProgress}%`}><span style={{ width: `${releaseProgress}%` }} /></div>}
        <div className="anime-schedule">
          {entry.nextAiringAt ? (
            <><div className="anime-schedule-icon"><i className="fas fa-calendar-day" /></div><div><span>第 {entry.nextEpisode} 集 · 北京时间</span><strong>{dateTimeFormatter.format(new Date(entry.nextAiringAt))}</strong><small>{formatCountdown(entry.nextAiringAt, now)}</small></div></>
          ) : entry.status === 'FINISHED' ? (
            <><div className="anime-schedule-icon complete"><i className="fas fa-flag-checkered" /></div><div><span>放送状态</span><strong>全篇已经播放</strong><small>{entry.endDate ? `完结日期 ${entry.endDate}` : '全部集数均已更新'}</small></div></>
          ) : (
            <><div className="anime-schedule-icon waiting"><i className="fas fa-clock" /></div><div><span>下一次更新</span><strong>等待官方公布</strong><small>每日查询时会自动补上</small></div></>
          )}
        </div>

        {entry.relationSource === 'Bangumi' && entry.relatedAnime?.length > 0 && (
          <details className="anime-series-details">
            <summary><i className="fas fa-code-branch" /> Bangumi 系列季度与剧场版 <strong>{entry.relatedAnime.length}</strong></summary>
            <div className="anime-series-list">{entry.relatedAnime.map(related => <a href={related.siteUrl} target="_blank" rel="noopener noreferrer" key={related.id}><span>{related.relationLabel} · {related.formatLabel}</span><strong>{related.title}</strong><i className="fas fa-arrow-up-right-from-square" /></a>)}</div>
          </details>
        )}

        <div className="anime-personal-progress">
          <div className="anime-personal-heading"><span><i className="fas fa-bookmark" /> 我的进度</span><strong>{personalStatusCopy}</strong></div>
          <div className="anime-progress-controls" role="group" aria-label={`${entry.title}的观看进度`}>
            <button type="button" className={entry.category === 'planned' ? 'active' : ''} onClick={() => onWatchProgressChange(entry, { status: 'not_started', episode: 0 })}>想看</button>
            <div className={`anime-episode-picker ${entry.category === 'watching' ? 'active' : ''}`}>
              <button type="button" onClick={() => setEpisode(personalEpisode - 1)} aria-label={`${entry.title}观看集数减一`}>−</button>
              <label>看到第<input type="number" min="1" max={entry.totalEpisodes || undefined} value={personalEpisode} onChange={event => setEpisode(event.target.value)} aria-label={`${entry.title}看到的集数`} />集</label>
              <button type="button" onClick={() => setEpisode(personalEpisode + 1)} aria-label={`${entry.title}观看集数加一`}>+</button>
            </div>
            <button type="button" className={entry.category === 'finished' ? 'active finished' : ''} onClick={() => onWatchProgressChange(entry, { status: 'finished', episode: entry.totalEpisodes || Math.max(entry.releasedEpisodes || 0, personalEpisode) })}>已看</button>
          </div>
        </div>
        {entry.note && <p className="anime-note"><i className="fas fa-circle-info" /> {entry.note}</p>}
        <a className="anime-source-link" href={entry.bangumiUrl || entry.siteUrl} target="_blank" rel="noopener noreferrer">在 {entry.bangumiId ? 'Bangumi' : 'AniList'} 查看条目 <i className="fas fa-arrow-up-right-from-square" /></a>
      </div>
    </article>
  )
}

export default function AnimeTracker() {
  const [data, setData] = useState(null)
  const [bangumiData, setBangumiData] = useState(null)
  const [error, setError] = useState('')
  const [personalFilter, setPersonalFilter] = useState('all')
  const [releaseFilter, setReleaseFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(Date.now())
  const [notice, setNotice] = useState('')
  const [bangumiUrl, setBangumiUrl] = useState('')
  const [isImportingUrl, setIsImportingUrl] = useState(false)
  const [watchProgress, setWatchProgress] = useState(() => sanitizeProgress(readStoredObject(TRACKER_PROGRESS_KEY)))
  const [customEntries, setCustomEntries] = useState(() => sanitizeCustomEntries(readStoredObject(CUSTOM_TRACKER_KEY)))
  const [bangumiRelations] = useState(() => readStoredObject(BANGUMI_RELATIONS_KEY))
  const importInputRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch(`/data/anime-tracker.json?v=${Date.now()}`, { cache: 'no-store', signal: controller.signal }).then(response => { if (!response.ok) throw new Error(`追番数据读取失败（${response.status}）`); return response.json() }),
      fetch(`/data/bangumi-airing.json?v=${Date.now()}`, { cache: 'no-store', signal: controller.signal }).then(response => response.ok ? response.json() : null),
    ]).then(([trackerPayload, bangumiPayload]) => { setData(trackerPayload); setBangumiData(bangumiPayload) })
      .catch(fetchError => { if (fetchError.name !== 'AbortError') setError(fetchError.message || '追番数据暂时无法读取') })
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [])

  useEffect(() => { writeStoredObject(TRACKER_PROGRESS_KEY, watchProgress) }, [watchProgress])
  useEffect(() => { writeStoredObject(CUSTOM_TRACKER_KEY, customEntries) }, [customEntries])
  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const bangumiSubjects = useMemo(() => flattenBangumiSubjects(bangumiData), [bangumiData])
  const staticEntries = data?.entries || []
  const idMaps = useMemo(() => buildTrackerBangumiMap(staticEntries, bangumiSubjects), [staticEntries, bangumiSubjects])
  const allEntries = useMemo(() => {
    const staticIds = new Set(staticEntries.map(entry => String(entry.id)))
    const custom = Object.values(customEntries).filter(entry => !staticIds.has(String(entry.id)))
    return [...staticEntries, ...custom].map(entry => {
      const bangumiId = entry.bangumiId || idMaps.trackerToBangumi.get(String(entry.id))
      const subject = bangumiId ? bangumiSubjects.find(item => String(item.id) === String(bangumiId)) : null
      const cachedRelations = bangumiId && Array.isArray(bangumiRelations[String(bangumiId)]) ? bangumiRelations[String(bangumiId)] : null
      const enriched = subject ? {
        ...entry, bangumiId: Number(bangumiId), score: Number(subject.score), siteUrl: subject.url || entry.siteUrl,
        relatedAnime: cachedRelations || (entry.relationSource === 'Bangumi' ? entry.relatedAnime : []),
        relationSource: cachedRelations?.length || entry.relationSource === 'Bangumi' ? 'Bangumi' : null,
      } : entry
      return { ...enriched, category: categoryForEntry(enriched, watchProgress[String(entry.id)]) }
    }).filter(entry => !(entry.category === 'planned' && Number.isFinite(entry.score) && entry.score < 7))
  }, [staticEntries, customEntries, idMaps, bangumiSubjects, bangumiRelations, watchProgress])

  const filteredEntries = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN')
    return allEntries
      .filter(entry => personalFilter === 'all' || entry.category === personalFilter)
      .filter(entry => releaseFilter === 'all' || entry.status === releaseFilter)
      .filter(entry => !keyword || `${entry.title} ${entry.subtitle} ${entry.sourceTitle}`.toLocaleLowerCase('zh-CN').includes(keyword))
      .sort((left, right) => getSortTime(left) - getSortTime(right))
  }, [allEntries, personalFilter, releaseFilter, search])
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const entries = useMemo(() => filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredEntries, page])
  useEffect(() => { setPage(1) }, [personalFilter, releaseFilter, search])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  const summary = useMemo(() => ({
    total: allEntries.length,
    finished: allEntries.filter(entry => entry.category === 'finished').length,
    watching: allEntries.filter(entry => entry.category === 'watching').length,
    planned: allEntries.filter(entry => entry.category === 'planned').length,
  }), [allEntries])
  const nextEntry = useMemo(() => allEntries.filter(entry => entry.category === 'watching' && entry.nextAiringAt && new Date(entry.nextAiringAt).getTime() > now).sort((left, right) => getSortTime(left) - getSortTime(right))[0], [allEntries, now])

  const updateWatchProgress = (entry, nextProgress) => {
    if (nextProgress.status === 'not_started' && Number.isFinite(entry.score) && entry.score < 7) {
      setNotice('该动画评分低于 7 分，已按规则从想看中移除')
      setWatchProgress(current => { const next = { ...current }; delete next[String(entry.id)]; return next })
      if (String(entry.id).startsWith('bangumi-')) setCustomEntries(current => { const next = { ...current }; delete next[String(entry.id)]; return next })
      return
    }
    setWatchProgress(current => ({ ...current, [String(entry.id)]: nextProgress }))
    syncTrackerRecordToBangumi(entry, nextProgress, idMaps.trackerToBangumi)
  }

  const exportRecords = () => {
    const payload = createExportPayload(watchProgress, readStoredObject(BANGUMI_PROGRESS_KEY), customEntries)
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `awa-anime-records-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
    setNotice(`已导出 ${Object.keys(payload.trackerProgress).length} 条追番记录`)
  }

  const importRecords = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = parseImportPayload(JSON.parse(await file.text()))
      const mergedTracker = { ...watchProgress, ...imported.trackerProgress }
      const mergedBangumi = { ...sanitizeProgress(readStoredObject(BANGUMI_PROGRESS_KEY), true), ...imported.bangumiProgress }
      const mergedCustom = { ...customEntries, ...imported.customEntries }
      setWatchProgress(mergedTracker); setCustomEntries(mergedCustom)
      writeStoredObject(BANGUMI_PROGRESS_KEY, mergedBangumi)
      setNotice(`导入成功：合并 ${Object.keys(imported.trackerProgress).length + Object.keys(imported.bangumiProgress).length} 条记录`)
    } catch (importError) { setNotice(`导入失败：${importError.message || '文件无法读取'}`) }
  }

  const importBangumiUrl = async event => {
    event.preventDefault()
    setIsImportingUrl(true)
    try {
      const entry = await fetchBangumiEntryFromUrl(bangumiUrl)
      if (Number.isFinite(entry.score) && entry.score < 7) throw new Error(`该动画评分 ${entry.score.toFixed(1)}，低于 7 分，未加入想看`)
      const key = String(entry.id)
      setCustomEntries(current => ({ ...current, [key]: entry }))
      setWatchProgress(current => ({ ...current, [key]: { status: 'not_started', episode: 0 } }))
      const bangumiProgress = sanitizeProgress(readStoredObject(BANGUMI_PROGRESS_KEY), true)
      bangumiProgress[String(entry.bangumiId)] = { status: 'not_started', episode: 0, interest: 'interested' }
      writeStoredObject(BANGUMI_PROGRESS_KEY, bangumiProgress)
      setBangumiUrl(''); setPersonalFilter('planned'); setNotice(`已把《${entry.title}》加入想看，并整合 Bangumi 关联作`)
    } catch (importError) { setNotice(`导入失败：${importError.message || 'Bangumi 链接无法读取'}`) }
    finally { setIsImportingUrl(false) }
  }

  return (
    <div className="page anime-tracker-page">
      <nav className="anime-page-tabs" aria-label="追番页面">
        <NavLink to="/anime/bangumi"><i className="fas fa-star" /> Bangumi 高分连载</NavLink>
        <NavLink to="/anime" end><i className="fas fa-bookmark" /> 我的追番</NavLink>
      </nav>
      <header className="anime-hero">
        <div className="anime-hero-copy"><span className="page-kicker">ANIME WATCHLIST</span><h1><i className="fas fa-tv" /> 我的追番</h1><p>按“已看、正在看、想看”管理，进度会与 Bangumi 高分动画双向同步。</p></div>
        {nextEntry && <div className="anime-next-up"><span>NEXT EPISODE</span><strong>{nextEntry.title} · 第 {nextEntry.nextEpisode} 集</strong><small>{dateTimeFormatter.format(new Date(nextEntry.nextAiringAt))} · {formatCountdown(nextEntry.nextAiringAt, now)}</small></div>}
      </header>

      {data ? <>
        <section className="anime-summary" aria-label="追番概览">
          <div><i className="fas fa-layer-group" /><span><strong>{summary.total}</strong>全部记录</span></div>
          <div><i className="fas fa-circle-check" /><span><strong>{summary.finished}</strong>已看</span></div>
          <div><i className="fas fa-play" /><span><strong>{summary.watching}</strong>正在看</span></div>
          <div><i className="fas fa-bookmark" /><span><strong>{summary.planned}</strong>想看</span></div>
        </section>

        <section className="bangumi-record-tools anime-record-tools">
          <div><i className="fas fa-file-arrow-down" /><span><strong>快速迁移追番数据</strong><small>导出/导入 JSON，或粘贴 Bangumi 条目链接直接加入想看</small></span></div>
          <div><button type="button" onClick={exportRecords}><i className="fas fa-download" /> 导出</button><button type="button" onClick={() => importInputRef.current?.click()}><i className="fas fa-upload" /> 导入文件</button><input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={importRecords} /></div>
        </section>
        <form className="anime-bangumi-import" onSubmit={importBangumiUrl}>
          <i className="fas fa-link" /><input value={bangumiUrl} onChange={event => setBangumiUrl(event.target.value)} placeholder="粘贴 Bangumi 链接，例如 https://bgm.tv/subject/253" aria-label="Bangumi 条目链接" required /><button type="submit" disabled={isImportingUrl}>{isImportingUrl ? <><i className="fas fa-spinner fa-spin" /> 读取中</> : <><i className="fas fa-plus" /> 加入想看</>}</button>
        </form>
        {notice && <p className={`bangumi-import-notice${notice.startsWith('导入失败') ? ' error' : ''}`} role="status">{notice}</p>}

        <section className="anime-personal-tabs" aria-label="按观看状态筛选">
          {PERSONAL_FILTERS.map(item => <button type="button" key={item.id} className={personalFilter === item.id ? 'active' : ''} onClick={() => setPersonalFilter(item.id)}>{item.icon && <i className={`fas ${item.icon}`} />} {item.label}<small>{item.id === 'all' ? summary.total : summary[item.id]}</small></button>)}
        </section>
        <div className="anime-browse-controls">
          <label className="anime-search"><i className="fas fa-magnifying-glass" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索番剧名称" aria-label="搜索番剧名称" />{search && <button type="button" onClick={() => setSearch('')} aria-label="清空搜索"><i className="fas fa-times" /></button>}</label>
          <label className="anime-group-select"><i className="fas fa-filter" /><select value={releaseFilter} onChange={event => setReleaseFilter(event.target.value)} aria-label="按放送状态筛选">{RELEASE_FILTERS.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
        </div>
        <div className="anime-toolbar"><span><strong>{filteredEntries.length}</strong> 部 · 第 {page}/{pageCount} 页 · <i className="fas fa-rotate" /> {syncFormatter.format(new Date(data.syncedAt))} 查询</span></div>
        {entries.length ? <section className="anime-grid">{entries.map(entry => <AnimeCard key={entry.id} entry={entry} now={now} watchProgress={watchProgress[String(entry.id)]} onWatchProgressChange={updateWatchProgress} />)}</section> : <div className="anime-empty"><i className="fas fa-inbox" /><p>这个分类里暂时没有番剧</p></div>}
        {pageCount > 1 && <nav className="anime-pagination" aria-label="追番列表分页"><button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1}><i className="fas fa-arrow-left" /> 上一页</button><span>第 <strong>{page}</strong> / {pageCount} 页</span><button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={page === pageCount}>下一页 <i className="fas fa-arrow-right" /></button></nav>}
        <footer className="anime-data-note"><i className="fas fa-database" /><span>放送日历来自 <a href={data.source.url} target="_blank" rel="noopener noreferrer">{data.source.name}</a>，评分、导入条目和关联作来自 Bangumi。<small><i className="fas fa-shield-halved" /> 已看记录保持不变；仅评分明确低于 7 分的想看条目会被移除。</small></span></footer>
      </> : error ? <div className="anime-state error"><i className="fas fa-triangle-exclamation" /><h2>追番数据加载失败</h2><p>{error}</p></div> : <div className="anime-state"><i className="fas fa-spinner fa-spin" /><h2>正在读取追番日历</h2><p>稍等一下，马上就好。</p></div>}
    </div>
  )
}
