import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router'
import AnimeDetailsDialog from '../components/AnimeDetailsDialog'
import {
  ANIME_REVIEWS_KEY, BANGUMI_PROGRESS_KEY, BANGUMI_RELATIONS_KEY, CUSTOM_TRACKER_KEY, TRACKER_PROGRESS_KEY,
  buildSeriesGroups, buildTrackerBangumiMap, categoryForEntry, createExportPayload, mergeBangumiRecordIntoTracker,
  fetchBangumiEntryFromUrl, parseImportPayload, readStoredObject, sanitizeCustomEntries, sanitizeProgress, sanitizeReviews,
  writeStoredObject,
} from '../utils/animeRecords'

const PAGE_SIZE = 12
const QUARTER_NAMES = { 1: '冬季 · 1月档', 2: '春季 · 4月档', 3: '夏季 · 7月档', 4: '秋季 · 10月档' }
const VIEW_MODES = [
  { id: 'quarter', label: '季度高分', icon: 'fa-calendar-days' },
  { id: 'all', label: '全部高分', icon: 'fa-layer-group' },
  { id: 'long', label: '长期连载库', icon: 'fa-route' },
]
const ORIGIN_FILTERS = [
  { id: 'japan', label: '只看日漫' },
  { id: 'non_japan', label: '其他国家动画' },
  { id: 'china', label: '国产动画' },
  { id: 'western', label: '欧美动画' },
  { id: 'korea', label: '韩国动画' },
  { id: 'all', label: '全部地区' },
]
const PERSONAL_FILTERS = [
  { id: 'all', label: '全部记录' },
  { id: 'interested', label: '想看' },
  { id: 'watching', label: '正在看' },
  { id: 'finished', label: '已看完' },
  { id: 'dropped', label: '不想看' },
  { id: 'none', label: '已取消状态' },
  { id: 'not_started', label: '还没看' },
  { id: 'not_interested', label: '不感兴趣' },
]
const yearRequestCache = new Map()

function requestBangumiYear(year, signal) {
  const key = String(year)
  if (!yearRequestCache.has(key)) {
    yearRequestCache.set(key, fetch(`/data/bangumi-airing-${year}.json`, { cache: 'force-cache', signal })
      .then(response => { if (!response.ok) throw new Error(`${year} 年数据读取失败（${response.status}）`); return response.json() })
      .catch(error => { yearRequestCache.delete(key); throw error }))
  }
  return yearRequestCache.get(key)
}

const syncFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

function clampEpisode(value, totalEpisodes) {
  const episode = Number.parseInt(value, 10)
  if (!Number.isFinite(episode)) return 1
  return Math.max(1, totalEpisodes ? Math.min(totalEpisodes, episode) : episode)
}

function formatMonth(value) {
  return /^\d{4}-\d{2}/.test(value || '') ? value.slice(0, 7).replace('-', ' 年 ') + ' 月' : '未知'
}

function BangumiCard({ subject, progress, review, onOpenDetails, onProgressChange }) {
  const status = progress?.status || 'not_started'
  const interest = progress?.interest || 'neutral'
  const episode = Math.max(1, progress?.episode || 1)
  const statusCopy = status === 'finished' ? '已看完' : status === 'watching' ? `看到第 ${episode} 话` : status === 'dropped' ? `第 ${episode} 话后不再看` : status === 'none' ? '已取消状态' : '还没看'

  const setEpisode = value => onProgressChange(subject.id, {
    status: 'watching',
    episode: clampEpisode(value, subject.totalEpisodes),
  })

  return (
    <article className={`bangumi-card ${subject.isLongRunning ? 'is-long-running' : 'is-seasonal'}`}>
      <a className="bangumi-cover" href={subject.url} target="_blank" rel="noopener noreferrer" aria-label={`在 Bangumi 查看${subject.title}`}>
        {subject.image ? <img src={subject.image} alt={`${subject.title}封面`} loading="lazy" decoding="async" fetchPriority="low" /> : <i className="fas fa-film" />}
        <strong><i className="fas fa-star" /> {subject.score.toFixed(1)}</strong>
      </a>
      <div className="bangumi-card-body">
        <div className="bangumi-meta-row">
          <span className="bangumi-origin-tag"><i className="fas fa-earth-asia" /> {subject.originLabel || '日本动画'}</span>
          {subject.isLongRunning && <span className="serial-long"><i className="fas fa-route" /> 长期连载</span>}
          {subject.isAiring && <span className="is-airing"><i className="fas fa-satellite-dish" /> 当前放送</span>}
          {subject.platform && <span>{subject.platform}</span>}
          {subject.totalEpisodes && <span>全 {subject.totalEpisodes} 话</span>}
        </div>
        <button type="button" className="bangumi-title-button" onClick={() => onOpenDetails(subject)}><h2>{subject.title}</h2><small><i className="fas fa-circle-info" /> 查看全部系列{review ? ' · 已有番评' : ''}</small></button>
        {subject.originalTitle !== subject.title && <p className="bangumi-original-title">{subject.originalTitle}</p>}
        <div className="bangumi-air-date">
          <i className="fas fa-calendar-day" /> 开播 {formatMonth(subject.airDate)}
          {subject.isLongRunning && (
            <span> · {subject.isAiring ? '仍在连载' : `${subject.endDateEstimated ? '约 ' : ''}结束 ${formatMonth(subject.endDate)}`}</span>
          )}
        </div>
        <div className="bangumi-numbers">
          <span>Bangumi 排名 <strong>{subject.rank ? `#${subject.rank}` : '暂无'}</strong></span>
          <span><strong>{subject.scoreCount.toLocaleString('zh-CN')}</strong> 人评分</span>
          <span><strong>{subject.watchingCount.toLocaleString('zh-CN')}</strong> 人在看</span>
        </div>
        {subject.tags?.length > 0 && <div className="bangumi-tags">{subject.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
        <p className={`bangumi-summary${subject.summary ? '' : ' muted'}`}>{subject.summary || 'Bangumi 暂未提供剧情简介，可进入条目页查看制作信息与用户讨论。'}</p>

        <div className="bangumi-personal-progress">
          <div className="bangumi-personal-heading"><span><i className="fas fa-user-check" /> 我的记录</span><strong>{statusCopy}</strong></div>
          <div className="bangumi-interest-controls" role="group" aria-label={`${subject.title}兴趣标记`}>
            <span>兴趣</span>
            <button type="button" className={interest === 'interested' ? 'active interested' : ''} onClick={() => onProgressChange(subject.id, { interest: interest === 'interested' ? 'neutral' : 'interested', status: 'not_started', episode: 0 })}><i className="fas fa-bookmark" /> 想看</button>
            <button type="button" className={status === 'dropped' ? 'active not-interested' : ''} onClick={() => onProgressChange(subject.id, status === 'dropped' ? { interest: 'neutral', status: 'none', episode: 0 } : { interest: 'not_interested', status: 'dropped', episode })}><i className="fas fa-eye-slash" /> 不想看</button>
          </div>
          <div className="bangumi-watch-controls" role="group" aria-label={`${subject.title}观看进度`}>
            <button type="button" className={status === 'not_started' && interest === 'interested' ? 'active' : ''} onClick={() => onProgressChange(subject.id, { status: 'not_started', episode: 0, interest: 'interested' })}>想看</button>
            <div className={`bangumi-episode-picker ${status === 'watching' ? 'active' : ''}`}>
              <button type="button" onClick={() => setEpisode(episode - 1)} aria-label={`${subject.title}观看集数减一`}>−</button>
              <label>第 <input type="number" min="1" max={subject.totalEpisodes || undefined} value={episode} onChange={event => setEpisode(event.target.value)} aria-label={`${subject.title}看到的集数`} /> 话</label>
              <button type="button" onClick={() => setEpisode(episode + 1)} aria-label={`${subject.title}观看集数加一`}>+</button>
            </div>
            <button type="button" className={status === 'finished' ? 'active finished' : ''} onClick={() => onProgressChange(subject.id, { status: 'finished', episode: subject.totalEpisodes || Math.max(progress?.episode || 0, 1) })}>看完</button>
            <button type="button" className={status === 'dropped' ? 'active dropped' : ''} onClick={() => onProgressChange(subject.id, { status: 'dropped', episode, interest: 'not_interested' })}>不想看</button>
            <button type="button" className={status === 'none' ? 'active neutral' : ''} onClick={() => onProgressChange(subject.id, { status: 'none', episode: 0, interest: 'neutral' })}>取消状态</button>
          </div>
        </div>

        <a className="bangumi-link" href={subject.url} target="_blank" rel="noopener noreferrer">查看 Bangumi 条目 <i className="fas fa-arrow-up-right-from-square" /></a>
      </div>
    </article>
  )
}

export default function BangumiAiring() {
  const [data, setData] = useState(null)
  const [trackerData, setTrackerData] = useState(null)
  const [error, setError] = useState('')
  const [selectedQuarterKey, setSelectedQuarterKey] = useState('')
  const [viewMode, setViewMode] = useState('quarter')
  const [origin, setOrigin] = useState('japan')
  const [personalFilter, setPersonalFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [progress, setProgress] = useState(() => sanitizeProgress(readStoredObject(BANGUMI_PROGRESS_KEY), true))
  const [reviews, setReviews] = useState(() => sanitizeReviews(readStoredObject(ANIME_REVIEWS_KEY)))
  const [activeEntry, setActiveEntry] = useState(null)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const importInputRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/bangumi-airing-meta.json', { cache: 'force-cache', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`读取失败（${response.status}）`); return response.json() })
      .then(async meta => {
        const currentYear = Number(meta.currentQuarter.slice(0, 4))
        const [yearPayload, trackerPayload] = await Promise.all([
          requestBangumiYear(currentYear, controller.signal),
          fetch('/data/anime-tracker.json', { cache: 'force-cache', signal: controller.signal }).then(response => response.ok ? response.json() : null),
        ])
        setData({ ...meta, quarters: yearPayload.quarters })
        setTrackerData(trackerPayload)
        setSelectedQuarterKey(meta.currentQuarter)
      })
      .catch(fetchError => { if (fetchError.name !== 'AbortError') setError(fetchError.message || 'Bangumi 高分数据暂时无法读取') })
    return () => controller.abort()
  }, [])

  useEffect(() => { writeStoredObject(BANGUMI_PROGRESS_KEY, progress) }, [progress])
  useEffect(() => { writeStoredObject(ANIME_REVIEWS_KEY, reviews) }, [reviews])

  const loadYear = async year => {
    if (data?.quarters?.some(quarter => quarter.year === Number(year))) return
    const payload = await requestBangumiYear(year)
    setData(current => {
      const existingKeys = new Set((current?.quarters || []).map(quarter => quarter.key))
      return { ...current, quarters: [...(current?.quarters || []), ...payload.quarters.filter(quarter => !existingKeys.has(quarter.key))] }
    })
  }

  useEffect(() => {
    if (!data?.years?.length || viewMode === 'quarter') return undefined
    let cancelled = false
    setArchiveLoading(true)
    ;(async () => {
      for (const year of data.years) {
        if (cancelled) return
        await loadYear(year)
      }
      if (!cancelled) setArchiveLoading(false)
    })().catch(() => { if (!cancelled) setArchiveLoading(false) })
    return () => { cancelled = true }
  }, [viewMode, data?.years])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  const selectedQuarter = useMemo(() => data?.quarters?.find(quarter => quarter.key === selectedQuarterKey) || data?.quarterSummaries?.find(quarter => quarter.key === selectedQuarterKey) || null, [data, selectedQuarterKey])
  const years = useMemo(() => data?.years || [], [data])
  const selectedYear = selectedQuarter?.year || Number(data?.currentQuarter?.slice(0, 4)) || 2026
  const availableQuarters = useMemo(() => (data?.quarters || []).filter(quarter => quarter.year === selectedYear), [data, selectedYear])
  const allSubjects = useMemo(() => {
    const subjectsById = new Map()
    for (const quarter of data?.quarters || []) {
      for (const subject of quarter.subjects) {
        const previous = subjectsById.get(subject.id)
        subjectsById.set(subject.id, previous ? { ...previous, ...subject, isAiring: previous.isAiring || subject.isAiring } : subject)
      }
    }
    return [...subjectsById.values()].sort((left, right) => right.score - left.score || (left.rank || Number.MAX_SAFE_INTEGER) - (right.rank || Number.MAX_SAFE_INTEGER))
  }, [data])
  const longRunningSubjects = useMemo(() => allSubjects.filter(subject => subject.isLongRunning).sort((left, right) => Number(right.isAiring) - Number(left.isAiring) || (left.airDate || '').localeCompare(right.airDate || '')), [allSubjects])
  const trackerEntries = trackerData?.entries || []
  const idMaps = useMemo(() => buildTrackerBangumiMap(trackerEntries, allSubjects), [trackerEntries, allSubjects])
  const reviewKeyForSubject = subject => idMaps.bangumiToTracker.get(String(subject.id)) || `bangumi-${subject.id}`

  useEffect(() => {
    if (!trackerEntries.length || !allSubjects.length) return
    const trackerProgress = sanitizeProgress(readStoredObject(TRACKER_PROGRESS_KEY))
    setProgress(current => {
      const next = { ...current }
      for (const [trackerId, bangumiId] of idMaps.trackerToBangumi) {
        const entry = trackerEntries.find(item => String(item.id) === String(trackerId))
        const fallbackCategory = entry ? categoryForEntry(entry, null) : 'planned'
        const record = trackerProgress[trackerId] || { status: fallbackCategory === 'finished' ? 'finished' : fallbackCategory === 'watching' ? 'watching' : 'not_started', episode: fallbackCategory === 'finished' ? Number(entry?.totalEpisodes || entry?.releasedEpisodes || 0) : 0 }
        if (!next[bangumiId]) next[bangumiId] = { ...record, interest: record.status === 'not_started' ? 'interested' : record.status === 'dropped' ? 'not_interested' : 'neutral' }
      }
      return next
    })
  }, [trackerEntries, allSubjects, idMaps])

  const baseSubjects = viewMode === 'all'
    ? allSubjects
    : viewMode === 'long'
      ? longRunningSubjects
      : (selectedQuarter?.subjects || []).filter(subject => !subject.isLongRunning)

  const filteredSubjects = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN')
    return baseSubjects
      .filter(subject => origin === 'all' || (origin === 'non_japan' ? subject.origin !== 'japan' : subject.origin === origin))
      .filter(subject => {
        const record = progress[String(subject.id)]
        if (personalFilter === 'all') return true
        if (personalFilter === 'interested' || personalFilter === 'not_interested') return record?.interest === personalFilter
        return (record?.status || 'not_started') === personalFilter
      })
      .filter(subject => !keyword || `${subject.title} ${subject.originalTitle} ${(subject.tags || []).join(' ')}`.toLocaleLowerCase('zh-CN').includes(keyword))
  }, [baseSubjects, origin, personalFilter, progress, search])

  const groupedSubjects = useMemo(() => buildSeriesGroups(filteredSubjects), [filteredSubjects])
  const pageCount = Math.max(1, Math.ceil(groupedSubjects.length / PAGE_SIZE))
  const pageSeriesGroups = useMemo(() => groupedSubjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [groupedSubjects, page])

  useEffect(() => setPage(1), [origin, personalFilter, search, selectedQuarterKey, viewMode])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  const selectYear = async year => {
    await loadYear(Number(year))
    const quarters = (data.quarterSummaries || data.quarters).filter(quarter => quarter.year === Number(year))
    const preferred = quarters.find(quarter => quarter.quarter === selectedQuarter?.quarter) || quarters[0]
    if (preferred) setSelectedQuarterKey(preferred.key)
  }

  const selectQuarterKey = async key => {
    await loadYear(Number(key.slice(0, 4)))
    setSelectedQuarterKey(key)
  }

  const updateProgress = (subjectId, patch) => {
    const subject = allSubjects.find(item => String(item.id) === String(subjectId))
    if (!subject) return
    setProgress(current => {
      const previous = current[String(subjectId)] || { status: 'not_started', episode: 0, interest: 'neutral' }
      let nextRecord = { ...previous, ...patch }
      if (patch.interest === 'neutral' && previous.interest === 'interested' && nextRecord.status === 'not_started') nextRecord = { ...nextRecord, status: 'none' }
      mergeBangumiRecordIntoTracker(subject, nextRecord, trackerEntries, idMaps.bangumiToTracker)
      return { ...current, [String(subjectId)]: nextRecord }
    })
    if (patch.status !== 'none') {
      fetchBangumiEntryFromUrl(subject.url).then(entry => {
        const enrichedEntry = {
          ...entry,
          status: subject.isAiring ? 'RELEASING' : entry.status,
          formatLabel: subject.platform || entry.formatLabel,
          releasedEpisodes: subject.releasedEpisodes || (subject.isAiring ? 0 : entry.releasedEpisodes),
        }
        const relationCache = readStoredObject(BANGUMI_RELATIONS_KEY)
        relationCache[String(subject.id)] = enrichedEntry.relatedAnime
        writeStoredObject(BANGUMI_RELATIONS_KEY, relationCache)
        if (!idMaps.bangumiToTracker.has(String(subject.id))) {
          const customEntries = sanitizeCustomEntries(readStoredObject(CUSTOM_TRACKER_KEY))
          customEntries[String(enrichedEntry.id)] = enrichedEntry
          writeStoredObject(CUSTOM_TRACKER_KEY, customEntries)
        }
      }).catch(() => { /* progress remains usable if relation lookup is temporarily unavailable */ })
    }
  }

  const exportRecords = () => {
    const payload = createExportPayload(readStoredObject(TRACKER_PROGRESS_KEY), progress, readStoredObject(CUSTOM_TRACKER_KEY), reviews)
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `awa-anime-records-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setNotice(`已导出 ${Object.keys(payload.trackerProgress).length + Object.keys(payload.bangumiProgress).length} 条本地记录和 ${Object.keys(payload.reviews).length} 条番评`)
  }

  const importRecords = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const imported = parseImportPayload(JSON.parse(await file.text()))
      const importedBangumi = imported.bangumiProgress
      const importedTracker = imported.trackerProgress
      const mergedBangumi = { ...progress, ...importedBangumi }
      const mergedTracker = { ...sanitizeProgress(readStoredObject(TRACKER_PROGRESS_KEY)), ...importedTracker }
      const mergedCustom = { ...sanitizeCustomEntries(readStoredObject(CUSTOM_TRACKER_KEY)), ...imported.customEntries }
      const mergedReviews = { ...reviews, ...imported.reviews }
      setProgress(mergedBangumi)
      setReviews(mergedReviews)
      writeStoredObject(TRACKER_PROGRESS_KEY, mergedTracker)
      writeStoredObject(CUSTOM_TRACKER_KEY, mergedCustom)
      setNotice(`导入成功：合并 ${Object.keys(importedBangumi).length + Object.keys(importedTracker).length} 条记录`)
    } catch (importError) {
      setNotice(`导入失败：${importError.message || '文件无法读取'}`)
    }
  }

  const openDetails = subject => {
    const record = progress[String(subject.id)]
    const category = record?.status === 'finished' ? 'finished' : record?.status === 'watching' ? 'watching' : record?.status === 'dropped' ? 'dropped' : record?.status === 'none' ? 'none' : record?.interest === 'interested' ? 'planned' : 'none'
    const group = buildSeriesGroups(allSubjects).find(item => item.items.some(groupSubject => String(groupSubject.id) === String(subject.id)))
    const knownRelated = (group?.items || []).filter(item => String(item.id) !== String(subject.id)).map(item => ({ id: item.id, title: item.title, relationLabel: '同系列', formatLabel: item.platform || '动画', siteUrl: item.url }))
    setActiveEntry({ ...subject, id: reviewKeyForSubject(subject), bangumiId: subject.id, category, coverImage: subject.image, startDate: subject.airDate, siteUrl: subject.url, relationSource: 'Bangumi', relatedAnime: knownRelated })
  }

  const saveReview = (entry, draft) => {
    setReviews(current => {
      const next = { ...current }
      if (!draft.text.trim()) delete next[String(entry.id)]
      else next[String(entry.id)] = { text: draft.text.trim(), score: draft.score, title: entry.title, source: 'local', sourceUrl: null, updatedAt: new Date().toISOString() }
      return sanitizeReviews(next)
    })
    setNotice(`《${entry.title}》番评已保存到本地`)
  }

  const summary = viewMode === 'long'
    ? { total: longRunningSubjects.length, primary: longRunningSubjects.filter(subject => subject.isAiring).length, secondary: longRunningSubjects.filter(subject => !subject.isAiring).length, label: '仍在连载', secondaryLabel: '已完结' }
    : viewMode === 'all'
      ? { total: allSubjects.length, primary: allSubjects.filter(subject => subject.origin === 'japan').length, secondary: allSubjects.filter(subject => subject.origin !== 'japan').length, label: '日本动画', secondaryLabel: '其他动画' }
      : { total: selectedQuarter?.seasonalCount || 0, primary: selectedQuarter?.subjects?.filter(subject => !subject.isLongRunning && subject.origin === 'japan').length || 0, secondary: selectedQuarter?.subjects?.filter(subject => !subject.isLongRunning && subject.origin !== 'japan').length || 0, label: '日本动画', secondaryLabel: '其他动画' }

  return (
    <div className="page anime-tracker-page bangumi-airing-page">
      <nav className="anime-page-tabs" aria-label="追番页面">
        <NavLink to="/anime/bangumi"><i className="fas fa-star" /> Bangumi 高分连载</NavLink>
        <NavLink to="/anime" end><i className="fas fa-bookmark" /> 我的追番</NavLink>
      </nav>

      <header className="bangumi-hero">
        <div><span className="page-kicker">2010—2026 ANIME ARCHIVE</span><h1><i className="fas fa-ranking-star" /> 高分动画档案</h1><p>季度番、全部高分作品和长期连载分开浏览；默认只显示日本动画，也可筛选国产、欧美及其他动画。</p></div>
        {data && <div className="bangumi-score-rule"><small>入选标准</small><strong>&gt; {data.scoreThreshold.toFixed(1)}</strong><span>Bangumi 用户评分</span></div>}
      </header>

      {data && selectedQuarter ? (
        <>
          <section className="bangumi-view-switch" aria-label="选择高分动画视图">
            {VIEW_MODES.map(item => <button type="button" className={viewMode === item.id ? 'active' : ''} onClick={() => setViewMode(item.id)} key={item.id}><i className={`fas ${item.icon}`} /><span>{item.label}</span>{item.id === 'long' && <small>{longRunningSubjects.length}</small>}</button>)}
          </section>

          {viewMode === 'quarter' && (
            <section className="bangumi-quarter-browser" aria-label="选择年份和季度">
              <div className="bangumi-quarter-heading">
                <div><span>SEASON NAVIGATOR</span><h2>{selectedQuarter.label} <small>{QUARTER_NAMES[selectedQuarter.quarter]}</small></h2></div>
                <div className="bangumi-live-shortcuts">
                  <button type="button" className={selectedQuarterKey === data.currentQuarter ? 'active' : ''} onClick={() => selectQuarterKey(data.currentQuarter)}><i className="fas fa-satellite-dish" /> 当前季度</button>
                  <button type="button" className={selectedQuarterKey === data.nextQuarter ? 'active' : ''} onClick={() => selectQuarterKey(data.nextQuarter)}><i className="fas fa-forward" /> 下一季度</button>
                </div>
              </div>
              <div className="bangumi-quarter-controls">
                <label><i className="fas fa-calendar" /><select value={selectedYear} onChange={event => selectYear(event.target.value)} aria-label="选择年份">{years.map(year => <option value={year} key={year}>{year} 年</option>)}</select></label>
                <div role="group" aria-label="选择季度">{availableQuarters.map(quarter => <button type="button" className={selectedQuarterKey === quarter.key ? 'active' : ''} onClick={() => setSelectedQuarterKey(quarter.key)} key={quarter.key}>Q{quarter.quarter}<span>{QUARTER_NAMES[quarter.quarter].split(' · ')[0]}</span></button>)}</div>
              </div>
              {(selectedQuarter.isCurrent || selectedQuarter.isNext) && <p className="bangumi-refresh-badge"><i className="fas fa-arrows-rotate" /> {selectedQuarter.isCurrent ? '当前季度' : '下一季度'}每日自动更新</p>}
            </section>
          )}

          {viewMode === 'long' && <section className="bangumi-long-intro"><i className="fas fa-route" /><div><span>LONG-RUNNING LIBRARY</span><h2>长期连载动画独立档案</h2><p>汇总 2010—2026 高分档案内总集数达到 24 话的作品，以及跨季度仍在放送的作品；按“仍在连载 / 已完结”统一查看，并标注开播与结束年月。</p></div></section>}

          <section className="bangumi-overview" aria-label="高分动画概览">
            <div><i className="fas fa-fire" /><span><strong>{summary.total}</strong> 部高分动画</span></div>
            <div><i className="fas fa-circle-dot" /><span><strong>{summary.primary}</strong> 部{summary.label}</span></div>
            <div><i className="fas fa-circle-check" /><span><strong>{summary.secondary}</strong> 部{summary.secondaryLabel}</span></div>
            <div><i className="fas fa-filter" /><span>当前筛选<strong>{filteredSubjects.length}</strong> 部</span></div>
          </section>

          <section className="bangumi-record-tools">
            <div><i className="fas fa-floppy-disk" /><span><strong>本地番剧记录</strong><small>包含个人追番与高分档案的观看进度、兴趣标记</small></span></div>
            <div>
              <button type="button" onClick={exportRecords}><i className="fas fa-file-export" /> 导出 JSON</button>
              <button type="button" onClick={() => importInputRef.current?.click()}><i className="fas fa-file-import" /> 导入并合并</button>
              <input ref={importInputRef} type="file" accept="application/json,.json" onChange={importRecords} hidden />
            </div>
          </section>
          {notice && <p className={`bangumi-import-notice${notice.startsWith('导入失败') ? ' error' : ''}`} role="status">{notice}</p>}

          <div className="bangumi-filter-panel">
            <label className="anime-search"><i className="fas fa-magnifying-glass" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索动画或标签" aria-label="搜索高分动画" />{search && <button type="button" onClick={() => setSearch('')} aria-label="清空搜索"><i className="fas fa-times" /></button>}</label>
            <label className="bangumi-select-filter"><i className="fas fa-earth-asia" /><select value={origin} onChange={event => setOrigin(event.target.value)} aria-label="按动画地区筛选">{ORIGIN_FILTERS.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
            <label className="bangumi-select-filter"><i className="fas fa-user-check" /><select value={personalFilter} onChange={event => setPersonalFilter(event.target.value)} aria-label="按个人记录筛选">{PERSONAL_FILTERS.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          </div>

          <div className="bangumi-result-copy">找到 <strong>{filteredSubjects.length}</strong> 部 · 第 {page}/{pageCount} 页</div>
          {archiveLoading && viewMode !== 'quarter' && <p className="bangumi-progressive-loading"><i className="fas fa-spinner fa-spin" /> 已先显示缓存年份，正在后台补齐其他年份…</p>}
          {pageSeriesGroups.length > 0 ? <section className="anime-series-grid">{pageSeriesGroups.map(group => <section className={`anime-series-group${group.items.length > 1 ? ' grouped' : ''}`} key={group.id}>{group.items.length > 1 && <header><i className="fas fa-layer-group" /><span><strong>{group.title}</strong><small>{group.items.length} 部同系列动画集中展示</small></span></header>}<div className="bangumi-grid">{group.items.map(subject => <BangumiCard subject={subject} progress={progress[String(subject.id)]} review={reviews[reviewKeyForSubject(subject)]} onOpenDetails={openDetails} onProgressChange={updateProgress} key={subject.id} />)}</div></section>)}</section> : <div className="anime-empty"><i className="fas fa-inbox" /><p>{selectedQuarter.isNext && viewMode === 'quarter' ? '下一季度暂时没有符合当前筛选的高分条目，开播后会每日补充。' : '当前筛选条件下没有动画。'}</p></div>}

          {pageCount > 1 && <nav className="anime-pagination" aria-label="Bangumi 高分动画分页"><button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1}><i className="fas fa-arrow-left" /> 上一页</button><span>第 <strong>{page}</strong> / {pageCount} 页</span><button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={page === pageCount}>下一页 <i className="fas fa-arrow-right" /></button></nav>}

          <footer className="anime-data-note"><i className="fas fa-database" /><span>数据来自 <a href={data.source.url} target="_blank" rel="noopener noreferrer">{data.source.name}</a>。{data.source.note}<small><i className="fas fa-route" /> 长期连载标准：{data.longRunningRule}。</small><small><i className="fas fa-shield-halved" /> 个人记录仅保存在当前浏览器，可通过 JSON 文件迁移到其他电脑。</small><small><i className="fas fa-rotate" /> 最近同步：{syncFormatter.format(new Date(data.syncedAt))}</small></span></footer>
        </>
      ) : error ? <div className="anime-state error"><i className="fas fa-triangle-exclamation" /><h2>Bangumi 数据加载失败</h2><p>{error}</p></div> : <div className="anime-state"><i className="fas fa-spinner fa-spin" /><h2>正在读取高分动画档案</h2><p>优先读取当前年份轻量缓存。</p></div>}
      {activeEntry && <AnimeDetailsDialog entry={activeEntry} review={reviews[String(activeEntry.id)]} onClose={() => setActiveEntry(null)} onSaveReview={saveReview} />}
    </div>
  )
}
