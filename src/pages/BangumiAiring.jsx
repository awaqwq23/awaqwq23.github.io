import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router'

const PAGE_SIZE = 12
const QUARTER_NAMES = { 1: '冬季 · 1月档', 2: '春季 · 4月档', 3: '夏季 · 7月档', 4: '秋季 · 10月档' }
const SERIAL_FILTERS = [
  { id: 'all', label: '全部高分动画', icon: 'fa-layer-group' },
  { id: 'long', label: '长期连载', icon: 'fa-route' },
  { id: 'seasonal', label: '非长期连载', icon: 'fa-calendar-days' },
]

const syncFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

function BangumiCard({ subject }) {
  return (
    <article className={`bangumi-card ${subject.isLongRunning ? 'is-long-running' : 'is-seasonal'}`}>
      <a className="bangumi-cover" href={subject.url} target="_blank" rel="noopener noreferrer" aria-label={`在 Bangumi 查看${subject.title}`}>
        {subject.image ? <img src={subject.image} alt={`${subject.title}封面`} loading="lazy" /> : <i className="fas fa-film" />}
        <strong><i className="fas fa-star" /> {subject.score.toFixed(1)}</strong>
      </a>
      <div className="bangumi-card-body">
        <div className="bangumi-meta-row">
          <span className={subject.isLongRunning ? 'serial-long' : 'serial-seasonal'}>
            <i className={`fas ${subject.isLongRunning ? 'fa-route' : 'fa-calendar-days'}`} />
            {subject.isLongRunning ? '长期连载' : '非长期连载'}
          </span>
          {subject.isAiring && <span className="is-airing"><i className="fas fa-satellite-dish" /> 当前放送</span>}
          {subject.platform && <span>{subject.platform}</span>}
          {subject.totalEpisodes && <span>全 {subject.totalEpisodes} 话</span>}
        </div>
        <h2>{subject.title}</h2>
        {subject.originalTitle !== subject.title && <p className="bangumi-original-title">{subject.originalTitle}</p>}
        <div className="bangumi-air-date">
          <i className="fas fa-calendar-day" /> {subject.airDate || '日期待定'}
          {subject.weekday?.cn && <span>· {subject.weekday.cn}</span>}
        </div>
        <div className="bangumi-numbers">
          <span>Bangumi 排名 <strong>{subject.rank ? `#${subject.rank}` : '暂无'}</strong></span>
          <span><strong>{subject.scoreCount.toLocaleString('zh-CN')}</strong> 人评分</span>
          <span><strong>{subject.watchingCount.toLocaleString('zh-CN')}</strong> 人在看</span>
        </div>
        {subject.tags?.length > 0 && <div className="bangumi-tags">{subject.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
        <p className={`bangumi-summary${subject.summary ? '' : ' muted'}`}>{subject.summary || 'Bangumi 暂未提供剧情简介，可进入条目页查看制作信息与用户讨论。'}</p>
        <a className="bangumi-link" href={subject.url} target="_blank" rel="noopener noreferrer">
          查看 Bangumi 条目 <i className="fas fa-arrow-up-right-from-square" />
        </a>
      </div>
    </article>
  )
}

export default function BangumiAiring() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selectedQuarterKey, setSelectedQuarterKey] = useState('')
  const [serialType, setSerialType] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/data/bangumi-airing.json?v=${Date.now()}`, { cache: 'no-store', signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`读取失败（${response.status}）`)
        return response.json()
      })
      .then(payload => {
        setData(payload)
        setSelectedQuarterKey(payload.currentQuarter)
      })
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message || 'Bangumi 季度数据暂时无法读取')
      })
    return () => controller.abort()
  }, [])

  const selectedQuarter = useMemo(() => data?.quarters?.find(quarter => quarter.key === selectedQuarterKey) || null, [data, selectedQuarterKey])
  const years = useMemo(() => [...new Set((data?.quarters || []).map(quarter => quarter.year))].sort((left, right) => right - left), [data])
  const selectedYear = selectedQuarter?.year || Number(data?.currentQuarter?.slice(0, 4)) || 2026
  const availableQuarters = useMemo(() => (data?.quarters || []).filter(quarter => quarter.year === selectedYear), [data, selectedYear])

  const filteredSubjects = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN')
    return (selectedQuarter?.subjects || [])
      .filter(subject => serialType === 'all' || subject.serialType === serialType)
      .filter(subject => !keyword || `${subject.title} ${subject.originalTitle} ${(subject.tags || []).join(' ')}`.toLocaleLowerCase('zh-CN').includes(keyword))
  }, [selectedQuarter, search, serialType])

  const pageCount = Math.max(1, Math.ceil(filteredSubjects.length / PAGE_SIZE))
  const subjects = useMemo(() => filteredSubjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredSubjects, page])

  useEffect(() => setPage(1), [search, selectedQuarterKey, serialType])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  const selectYear = year => {
    const quarters = data.quarters.filter(quarter => quarter.year === Number(year))
    const preferred = quarters.find(quarter => quarter.quarter === selectedQuarter?.quarter) || quarters[0]
    if (preferred) setSelectedQuarterKey(preferred.key)
  }

  return (
    <div className="page anime-tracker-page bangumi-airing-page">
      <nav className="anime-page-tabs" aria-label="追番页面">
        <NavLink to="/anime" end><i className="fas fa-bookmark" /> 我的追番</NavLink>
        <NavLink to="/anime/bangumi"><i className="fas fa-star" /> Bangumi 高分连载</NavLink>
      </nav>

      <header className="bangumi-hero">
        <div>
          <span className="page-kicker">2010—2026 SEASON ARCHIVE</span>
          <h1><i className="fas fa-ranking-star" /> 季度高分连载档案</h1>
          <p>从 2010 年到 2026 年，按冬、春、夏、秋四个动画季度整理 Bangumi 评分高于 7.0 的连载作品，并区分长期与非长期连载。</p>
        </div>
        {data && <div className="bangumi-score-rule"><small>入选标准</small><strong>&gt; {data.scoreThreshold.toFixed(1)}</strong><span>Bangumi 用户评分</span></div>}
      </header>

      {data && selectedQuarter ? (
        <>
          <section className="bangumi-quarter-browser" aria-label="选择年份和季度">
            <div className="bangumi-quarter-heading">
              <div>
                <span>SEASON NAVIGATOR</span>
                <h2>{selectedQuarter.label} <small>{QUARTER_NAMES[selectedQuarter.quarter]}</small></h2>
              </div>
              <div className="bangumi-live-shortcuts">
                <button type="button" className={selectedQuarterKey === data.currentQuarter ? 'active' : ''} onClick={() => setSelectedQuarterKey(data.currentQuarter)}><i className="fas fa-satellite-dish" /> 当前季度</button>
                <button type="button" className={selectedQuarterKey === data.nextQuarter ? 'active' : ''} onClick={() => setSelectedQuarterKey(data.nextQuarter)}><i className="fas fa-forward" /> 下一季度</button>
              </div>
            </div>
            <div className="bangumi-quarter-controls">
              <label>
                <i className="fas fa-calendar" />
                <select value={selectedYear} onChange={event => selectYear(event.target.value)} aria-label="选择年份">
                  {years.map(year => <option value={year} key={year}>{year} 年</option>)}
                </select>
              </label>
              <div role="group" aria-label="选择季度">
                {availableQuarters.map(quarter => (
                  <button type="button" className={selectedQuarterKey === quarter.key ? 'active' : ''} onClick={() => setSelectedQuarterKey(quarter.key)} key={quarter.key}>
                    Q{quarter.quarter}<span>{QUARTER_NAMES[quarter.quarter].split(' · ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
            {(selectedQuarter.isCurrent || selectedQuarter.isNext) && (
              <p className="bangumi-refresh-badge"><i className="fas fa-arrows-rotate" /> {selectedQuarter.isCurrent ? '当前季度' : '下一季度'}每日自动更新</p>
            )}
          </section>

          <section className="bangumi-overview" aria-label="季度高分动画概览">
            <div><i className="fas fa-fire" /><span><strong>{selectedQuarter.count}</strong> 部高分动画</span></div>
            <div><i className="fas fa-route" /><span><strong>{selectedQuarter.longRunningCount}</strong> 部长期连载</span></div>
            <div><i className="fas fa-calendar-days" /><span><strong>{selectedQuarter.seasonalCount}</strong> 部非长期连载</span></div>
            <div><i className="fas fa-arrow-trend-up" /><span>季度最高分<strong>{selectedQuarter.subjects[0]?.score.toFixed(1) || '—'}</strong></span></div>
          </section>

          <div className="bangumi-controls">
            <label className="anime-search">
              <i className="fas fa-magnifying-glass" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索动画或标签" aria-label="搜索季度高分动画" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="清空搜索"><i className="fas fa-times" /></button>}
            </label>
            <div className="bangumi-serial-filters" role="group" aria-label="按连载类型筛选">
              {SERIAL_FILTERS.map(item => (
                <button type="button" className={serialType === item.id ? 'active' : ''} onClick={() => setSerialType(item.id)} key={item.id}><i className={`fas ${item.icon}`} /> {item.label}</button>
              ))}
            </div>
          </div>

          <div className="bangumi-result-copy">找到 <strong>{filteredSubjects.length}</strong> 部 · 第 {page}/{pageCount} 页</div>

          {subjects.length > 0 ? (
            <section className="bangumi-grid">
              {subjects.map(subject => <BangumiCard subject={subject} key={subject.id} />)}
            </section>
          ) : (
            <div className="anime-empty"><i className="fas fa-inbox" /><p>{selectedQuarter.isNext ? '下一季度暂时没有评分高于 7.0 的条目，开播后会每日补充。' : '当前筛选条件下没有动画。'}</p></div>
          )}

          {pageCount > 1 && (
            <nav className="anime-pagination" aria-label="Bangumi 季度高分动画分页">
              <button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1}><i className="fas fa-arrow-left" /> 上一页</button>
              <span>第 <strong>{page}</strong> / {pageCount} 页</span>
              <button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={page === pageCount}>下一页 <i className="fas fa-arrow-right" /></button>
            </nav>
          )}

          <footer className="anime-data-note">
            <i className="fas fa-database" />
            <span>
              数据来自 <a href={data.source.url} target="_blank" rel="noopener noreferrer">{data.source.name}</a>。{data.source.note}
              <small><i className="fas fa-route" /> 长期连载标准：{data.longRunningRule}。评分会随 Bangumi 用户评价变化。</small>
              <small><i className="fas fa-rotate" /> 最近同步：{syncFormatter.format(new Date(data.syncedAt))}</small>
            </span>
          </footer>
        </>
      ) : error ? (
        <div className="anime-state error"><i className="fas fa-triangle-exclamation" /><h2>Bangumi 数据加载失败</h2><p>{error}</p></div>
      ) : (
        <div className="anime-state"><i className="fas fa-spinner fa-spin" /><h2>正在读取季度高分档案</h2><p>正在整理 2010—2026 年的季度动画数据。</p></div>
      )}
    </div>
  )
}
