import { useEffect, useState } from 'react'
import { BANGUMI_RELATIONS_KEY, fetchBangumiEntryFromUrl, readStoredObject, writeStoredObject } from '../utils/animeRecords'

const STATUS_LABELS = {
  finished: '已看',
  watching: '正在看',
  planned: '想看',
  dropped: '不想看',
  none: '未分类',
}

export default function AnimeDetailsDialog({ entry, review, onClose, onSaveReview }) {
  const [details, setDetails] = useState(entry)
  const [relationState, setRelationState] = useState(entry?.relatedAnime?.length ? 'ready' : entry?.bangumiId ? 'loading' : 'idle')
  const [draft, setDraft] = useState(review?.text || '')
  const [score, setScore] = useState(review?.score || '')

  useEffect(() => {
    setDetails(entry)
    setDraft(review?.text || '')
    setScore(review?.score || '')
    if (!entry?.bangumiId) {
      setRelationState('idle')
      return undefined
    }
    const cached = readStoredObject(BANGUMI_RELATIONS_KEY)[String(entry.bangumiId)]
    if (Array.isArray(cached)) {
      setDetails(current => ({ ...current, relatedAnime: cached, relationSource: 'Bangumi' }))
      setRelationState('ready')
    } else if (entry.relatedAnime?.length) {
      setRelationState('ready')
    } else {
      setRelationState('loading')
    }
    let cancelled = false
    fetchBangumiEntryFromUrl(String(entry.bangumiId)).then(fetched => {
      if (cancelled) return
      setDetails(current => ({ ...current, ...fetched, category: entry.category }))
      const relationCache = readStoredObject(BANGUMI_RELATIONS_KEY)
      relationCache[String(entry.bangumiId)] = fetched.relatedAnime || []
      writeStoredObject(BANGUMI_RELATIONS_KEY, relationCache)
      setRelationState('ready')
    }).catch(() => { if (!cancelled) setRelationState(cached ? 'ready' : 'error') })
    return () => { cancelled = true }
  }, [entry, review])

  if (!entry) return null
  const related = details?.relatedAnime || []
  const canReview = entry.category === 'finished'

  return (
    <div className="anime-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="anime-details-dialog" role="dialog" aria-modal="true" aria-labelledby="anime-dialog-title">
        <button type="button" className="anime-dialog-close" onClick={onClose} aria-label="关闭详情"><i className="fas fa-xmark" /></button>
        <header>
          {details.coverImage || details.image ? <img src={details.coverImage || details.image} alt="" loading="lazy" decoding="async" /> : <i className="fas fa-tv" />}
          <div><span>{STATUS_LABELS[entry.category] || '动画详情'} · Bangumi 系列资料</span><h2 id="anime-dialog-title">{details.title}</h2><p>{details.subtitle || details.originalTitle || ''}</p></div>
        </header>

        <div className="anime-dialog-meta">
          {Number.isFinite(Number(details.score)) && <span><i className="fas fa-star" /> {Number(details.score).toFixed(1)}</span>}
          {details.totalEpisodes && <span><i className="fas fa-list-ol" /> 全 {details.totalEpisodes} 集</span>}
          {details.startDate || details.airDate ? <span><i className="fas fa-calendar" /> {details.startDate || details.airDate}</span> : null}
        </div>

        <section className="anime-related-panel">
          <div className="anime-dialog-section-title"><div><i className="fas fa-code-branch" /><span><strong>同系列动画</strong><small>季度、续作、剧场版均来自 Bangumi</small></span></div><em>{related.length}</em></div>
          {!entry.bangumiId ? <p className="anime-dialog-hint"><i className="fas fa-circle-info" /> 当前条目尚未匹配到 Bangumi，因此不会混入其他来源的关联作。</p>
            : relationState === 'loading' ? <p className="anime-dialog-hint"><i className="fas fa-spinner fa-spin" /> 正在读取 Bangumi 关联作…</p>
            : relationState === 'error' ? <p className="anime-dialog-hint error"><i className="fas fa-triangle-exclamation" /> 关联作暂时读取失败，可稍后重新打开详情。</p>
              : related.length ? <div className="anime-series-list">{related.map(item => <a href={item.siteUrl || `https://bgm.tv/subject/${item.id}`} target="_blank" rel="noopener noreferrer" key={item.id}><span>{item.relationLabel || '关联作'} · {item.formatLabel || '动画'}</span><strong>{item.title}</strong><i className="fas fa-arrow-up-right-from-square" /></a>)}</div>
                : <p className="anime-dialog-hint">Bangumi 暂未列出其他动画关联作。</p>}
        </section>

        {canReview ? (
          <section className="anime-review-editor">
            <div className="anime-dialog-section-title"><div><i className="fas fa-pen-to-square" /><span><strong>我的番评</strong><small>仅保存在本地，并随 JSON 一起导入导出</small></span></div>{review?.source === 'blog' && <em>来自旧博客</em>}</div>
            <label>个人评分<select value={score} onChange={event => setScore(event.target.value)}><option value="">不评分</option>{[10,9.5,9,8.5,8,7.5,7,6.5,6,5,4,3,2,1].map(value => <option value={value} key={value}>{value} / 10</option>)}</select></label>
            <textarea value={draft} onChange={event => setDraft(event.target.value)} rows="9" maxLength="50000" placeholder="写下看完后的感受、推荐理由或避雷点……" />
            <div className="anime-review-actions"><small>{draft.length} / 50000</small><button type="button" onClick={() => { onSaveReview(entry, { text: draft, score: score ? Number(score) : null }); onClose() }}><i className="fas fa-floppy-disk" /> 保存番评</button></div>
          </section>
        ) : <p className="anime-dialog-hint"><i className="fas fa-lock" /> 标记为“已看”后即可撰写和修改番评。</p>}

        <a className="anime-source-link" href={details.bangumiUrl || (details.bangumiId ? `https://bgm.tv/subject/${details.bangumiId}` : details.siteUrl)} target="_blank" rel="noopener noreferrer">{details.bangumiId ? '在 Bangumi 查看完整条目' : '查看原始条目'} <i className="fas fa-arrow-up-right-from-square" /></a>
      </section>
    </div>
  )
}
