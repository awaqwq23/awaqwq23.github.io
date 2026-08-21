import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router'

const PAGE_SIZE = 12

const syncFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function BangumiCard({ subject }) {
  return (
    <article className="bangumi-card">
      <a className="bangumi-cover" href={subject.url} target="_blank" rel="noopener noreferrer" aria-label={`在 Bangumi 查看${subject.title}`}>
        {subject.image ? <img src={subject.image} alt={`${subject.title}封面`} loading="lazy" /> : <i className="fas fa-film" />}
        <strong><i className="fas fa-star" /> {subject.score.toFixed(1)}</strong>
      </a>
      <div className="bangumi-card-body">
        <div className="bangumi-meta-row">
          <span><i className="fas fa-calendar-day" /> {subject.weekday.cn}</span>
          {subject.platform && <span>{subject.platform}</span>}
          {subject.totalEpisodes && <span>全 {subject.totalEpisodes} 话</span>}
        </div>
        <h2>{subject.title}</h2>
        {subject.originalTitle !== subject.title && <p className="bangumi-original-title">{subject.originalTitle}</p>}
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
  const [search, setSearch] = useState('')
  const [weekday, setWeekday] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/data/bangumi-airing.json?v=${Date.now()}`, { cache: 'no-store', signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`读取失败（${response.status}）`)
        return response.json()
      })
      .then(setData)
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message || 'Bangumi 连载数据暂时无法读取')
      })
    return () => controller.abort()
  }, [])

  const weekdays = useMemo(() => {
    const values = new Map()
    for (const subject of data?.subjects || []) values.set(String(subject.weekday.id), subject.weekday.cn)
    return [...values].sort((left, right) => Number(left[0]) - Number(right[0]))
  }, [data])

  const filteredSubjects = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN')
    return (data?.subjects || [])
      .filter(subject => weekday === 'all' || String(subject.weekday.id) === weekday)
      .filter(subject => !keyword || `${subject.title} ${subject.originalTitle} ${(subject.tags || []).join(' ')}`.toLocaleLowerCase('zh-CN').includes(keyword))
  }, [data, search, weekday])

  const pageCount = Math.max(1, Math.ceil(filteredSubjects.length / PAGE_SIZE))
  const subjects = useMemo(() => filteredSubjects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredSubjects, page])

  useEffect(() => setPage(1), [search, weekday])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  return (
    <div className="page anime-tracker-page bangumi-airing-page">
      <nav className="anime-page-tabs" aria-label="追番页面">
        <NavLink to="/anime" end><i className="fas fa-bookmark" /> 我的追番</NavLink>
        <NavLink to="/anime/bangumi"><i className="fas fa-star" /> Bangumi 高分连载</NavLink>
      </nav>

      <header className="bangumi-hero">
        <div>
          <span className="page-kicker">BANGUMI AIRING PICKS</span>
          <h1><i className="fas fa-ranking-star" /> 高分连载动画</h1>
          <p>收录 Bangumi 每日放送目录中正在连载、当前评分严格高于 7.0 分的全部动画，每天自动刷新。</p>
        </div>
        {data && <div className="bangumi-score-rule"><small>入选标准</small><strong>&gt; {data.scoreThreshold.toFixed(1)}</strong><span>Bangumi 用户评分</span></div>}
      </header>

      {data ? (
        <>
          <section className="bangumi-overview" aria-label="高分连载概览">
            <div><i className="fas fa-fire" /><span><strong>{data.count}</strong> 部高分连载</span></div>
            <div><i className="fas fa-calendar-check" /><span>每日自动更新<small>{syncFormatter.format(new Date(data.syncedAt))}</small></span></div>
            <div><i className="fas fa-arrow-trend-up" /><span>当前最高分<strong>{data.subjects[0]?.score.toFixed(1) || '—'}</strong></span></div>
          </section>

          <div className="bangumi-controls">
            <label className="anime-search">
              <i className="fas fa-magnifying-glass" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索动画或标签" aria-label="搜索高分连载动画" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="清空搜索"><i className="fas fa-times" /></button>}
            </label>
            <div className="bangumi-weekdays" role="group" aria-label="按播出星期筛选">
              <button type="button" className={weekday === 'all' ? 'active' : ''} onClick={() => setWeekday('all')}>全部</button>
              {weekdays.map(([id, label]) => <button type="button" className={weekday === id ? 'active' : ''} onClick={() => setWeekday(id)} key={id}>{label.replace('星期', '周')}</button>)}
            </div>
          </div>

          <div className="bangumi-result-copy">找到 <strong>{filteredSubjects.length}</strong> 部 · 第 {page}/{pageCount} 页</div>

          {subjects.length > 0 ? (
            <section className="bangumi-grid">
              {subjects.map(subject => <BangumiCard subject={subject} key={subject.id} />)}
            </section>
          ) : (
            <div className="anime-empty"><i className="fas fa-inbox" /><p>当前筛选条件下没有动画</p></div>
          )}

          {pageCount > 1 && (
            <nav className="anime-pagination" aria-label="Bangumi 高分连载分页">
              <button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1}><i className="fas fa-arrow-left" /> 上一页</button>
              <span>第 <strong>{page}</strong> / {pageCount} 页</span>
              <button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={page === pageCount}>下一页 <i className="fas fa-arrow-right" /></button>
            </nav>
          )}

          <footer className="anime-data-note">
            <i className="fas fa-database" />
            <span>数据来自 <a href={data.source.url} target="_blank" rel="noopener noreferrer">{data.source.name}</a>。{data.source.note}<small>评分可能每天发生变化，跌至 7.0 分或以下的条目会在下次同步时移出。</small></span>
          </footer>
        </>
      ) : error ? (
        <div className="anime-state error"><i className="fas fa-triangle-exclamation" /><h2>Bangumi 数据加载失败</h2><p>{error}</p></div>
      ) : (
        <div className="anime-state"><i className="fas fa-spinner fa-spin" /><h2>正在读取高分连载</h2><p>正在整理 Bangumi 每日放送数据。</p></div>
      )}
    </div>
  )
}
