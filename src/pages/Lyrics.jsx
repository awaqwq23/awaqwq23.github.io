import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: '日语', label: '日语' },
  { id: '英语', label: '英语' },
  { id: 'complete', label: '完整歌词' },
  { id: 'reference', label: '资料卡' },
]

function lineClass(line) {
  if (/[ぁ-ゖァ-ヺー]/u.test(line)) return 'lyric-line lyric-japanese'
  if (/^[A-Za-zÀ-ž0-9'’()\s.,!?~\-]+$/u.test(line)) return 'lyric-line lyric-romaji'
  if (/\p{Script=Han}/u.test(line)) return 'lyric-line lyric-translation'
  return 'lyric-line'
}

function inlineContent(text, keyPrefix) {
  const clean = text.replace(/<br\s*\/?>/giu, ' / ')
  const tokens = clean.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/gu)
  return tokens.filter(Boolean).map((token, index) => {
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/u)
    if (link) return <a href={link[2]} key={`${keyPrefix}-link-${index}`} rel="noreferrer" target="_blank">{link[1]}</a>
    if (/^\*\*[^*]+\*\*$/u.test(token)) return <strong key={`${keyPrefix}-strong-${index}`}>{token.slice(2, -2)}</strong>
    if (/^`[^`]+`$/u.test(token)) return <code key={`${keyPrefix}-code-${index}`}>{token.slice(1, -1)}</code>
    return <Fragment key={`${keyPrefix}-text-${index}`}>{token}</Fragment>
  })
}

function isTableSeparator(line) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/u.test(line)
}

function tableCells(line) {
  return line.trim().replace(/^\||\|$/gu, '').split('|').map(cell => cell.trim())
}

function LyricDocument({ content }) {
  const lines = content.split('\n')
  const blocks = []

  for (let index = 0; index < lines.length;) {
    const line = lines[index]

    if (/^\s*\|.+\|\s*$/u.test(line) && /^\s*\|/u.test(lines[index + 1] || '')) {
      const tableLines = []
      const start = index
      while (index < lines.length && /^\s*\|.+\|\s*$/u.test(lines[index])) tableLines.push(lines[index++])
      const rows = tableLines.filter(row => !isTableSeparator(row)).map(tableCells)
      if (rows.length) {
        const [head, ...body] = rows
        blocks.push(
          <div className="lyrics-table-wrap" key={`table-${start}`}>
            <table className="lyrics-table">
              <thead><tr>{head.map((cell, cellIndex) => <th key={`h-${cellIndex}`}>{inlineContent(cell, `th-${start}-${cellIndex}`)}</th>)}</tr></thead>
              <tbody>{body.map((row, rowIndex) => (
                <tr key={`r-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`c-${cellIndex}`}>{inlineContent(cell, `td-${start}-${rowIndex}-${cellIndex}`)}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>,
        )
      }
      continue
    }

    if (!line.trim()) {
      blocks.push(<div className="lyric-spacer" aria-hidden="true" key={`space-${index}`} />)
      index += 1
      continue
    }
    if (/^<!--.*-->$/u.test(line.trim())) {
      index += 1
      continue
    }
    if (/^---+$/u.test(line.trim())) {
      blocks.push(<hr className="lyrics-divider" key={`divider-${index}`} />)
      index += 1
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/u)
    if (heading) {
      const Heading = `h${Math.min(heading[1].length + 1, 6)}`
      blocks.push(<Heading className="lyric-heading" key={`heading-${index}`}>{inlineContent(heading[2], `heading-${index}`)}</Heading>)
      index += 1
      continue
    }

    const quote = line.match(/^>\s?(.+)$/u)
    if (quote) {
      blocks.push(<blockquote className="lyric-quote" key={`quote-${index}`}>{inlineContent(quote[1], `quote-${index}`)}</blockquote>)
      index += 1
      continue
    }

    const list = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/u)
    if (list) {
      blocks.push(<div className="lyric-list-item" key={`list-${index}`}>{inlineContent(list[1], `list-${index}`)}</div>)
      index += 1
      continue
    }

    blocks.push(<div className={lineClass(line)} key={`line-${index}`}>{inlineContent(line, `line-${index}`)}</div>)
    index += 1
  }

  return blocks
}

export default function Lyrics() {
  const [songs, setSongs] = useState([])
  const [activeSongId, setActiveSongId] = useState(null)
  const [activeDocumentId, setActiveDocumentId] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [fontScale, setFontScale] = useState(1)
  const [focusMode, setFocusMode] = useState(false)
  const [wakeLock, setWakeLock] = useState(null)
  const [status, setStatus] = useState('loading')
  const readerRef = useRef(null)

  useEffect(() => {
    fetch('/lyrics/index.json')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then(data => {
        const nextSongs = data.songs || []
        setSongs(nextSongs)
        if (nextSongs[0]) {
          setActiveSongId(nextSongs[0].id)
          setActiveDocumentId(nextSongs[0].primaryDocumentId)
        }
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  useEffect(() => () => {
    wakeLock?.release?.().catch(() => {})
  }, [wakeLock])

  const filteredSongs = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return songs.filter(song => {
      const matchesFilter = filter === 'all' || song.language === filter || song.contentStatus === filter
      if (!matchesFilter) return false
      if (!normalized) return true
      return [song.title, song.nativeTitle, song.artist, song.work, ...(song.aliases || [])]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalized)
    })
  }, [filter, query, songs])

  useEffect(() => {
    if (!filteredSongs.length || filteredSongs.some(song => song.id === activeSongId)) return
    setActiveSongId(filteredSongs[0].id)
    setActiveDocumentId(filteredSongs[0].primaryDocumentId)
  }, [activeSongId, filteredSongs])

  const activeSong = songs.find(song => song.id === activeSongId) || filteredSongs[0] || songs[0]
  const activeDocument = activeSong?.documents.find(document => document.id === activeDocumentId)
    || activeSong?.documents.find(document => document.id === activeSong?.primaryDocumentId)
  const completeCount = songs.filter(song => song.contentStatus === 'complete').length
  const referenceCount = songs.length - completeCount

  function chooseSong(song) {
    setActiveSongId(song.id)
    setActiveDocumentId(song.primaryDocumentId)
    readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleWakeLock() {
    if (wakeLock) {
      await wakeLock.release().catch(() => {})
      setWakeLock(null)
      return
    }
    if (!('wakeLock' in navigator)) return
    const lock = await navigator.wakeLock.request('screen').catch(() => null)
    setWakeLock(lock)
    lock?.addEventListener('release', () => setWakeLock(null), { once: true })
  }

  if (status === 'loading') {
    return <div className="page lyrics-state"><i className="fas fa-spinner fa-spin" /><p>正在打开歌词本…</p></div>
  }

  if (status === 'error' || !activeSong) {
    return <div className="page lyrics-state"><i className="fas fa-circle-exclamation" /><p>歌词暂时没有加载成功，请刷新后再试。</p></div>
  }

  return (
    <div className={`page lyrics-page${focusMode ? ' lyrics-focus-mode' : ''}`}>
      <div className="lyrics-hero">
        <div>
          <span className="lyrics-kicker">LYRICS & LANGUAGE NOTES</span>
          <h1><i className="fas fa-microphone-lines" /> 日语歌词本</h1>
          <p>{songs.length} 首歌曲 · {completeCount} 首已有正文 · {referenceCount} 首资料卡待补正文</p>
        </div>
        <button className="btn btn-primary lyrics-focus-button" onClick={() => setFocusMode(value => !value)}>
          <i className={`fas ${focusMode ? 'fa-compress' : 'fa-expand'}`} /> {focusMode ? '退出大字模式' : '进入大字模式'}
        </button>
      </div>

      <div className="lyrics-layout">
        <aside className="lyrics-sidebar" aria-label="歌曲列表">
          <label className="lyrics-search">
            <i className="fas fa-search" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索歌名、歌手或作品…" />
            {query && <button onClick={() => setQuery('')} aria-label="清空搜索"><i className="fas fa-times" /></button>}
          </label>
          <div className="lyrics-filters" aria-label="歌词筛选">
            {FILTERS.map(item => (
              <button className={filter === item.id ? 'active' : ''} key={item.id} onClick={() => setFilter(item.id)}>{item.label}</button>
            ))}
          </div>
          <div className="lyrics-result-count">{filteredSongs.length} 首</div>
          <div className="lyrics-song-list">
            {filteredSongs.map(song => (
              <button className={song.id === activeSong.id ? 'active' : ''} key={song.id} onClick={() => chooseSong(song)}>
                <span>{String(song.order).padStart(2, '0')}</span>
                <span>
                  <strong>{song.title}</strong>
                  <small>{song.artist || (song.nativeTitle !== song.title ? song.nativeTitle : song.language)}</small>
                </span>
                <i className={`fas ${song.contentStatus === 'complete' ? 'fa-circle-check' : 'fa-bookmark'}`} title={song.contentStatus === 'complete' ? '已有正文' : '资料卡'} />
              </button>
            ))}
            {!filteredSongs.length && <p className="lyrics-empty">没有符合条件的歌曲</p>}
          </div>
        </aside>

        <section className="lyrics-reader-shell">
          <header className="lyrics-reader-header">
            <div>
              <span>NO. {String(activeSong.order).padStart(2, '0')}</span>
              <h2>{activeSong.title}</h2>
              <p>{[activeSong.artist, activeSong.work].filter(Boolean).join(' · ') || activeSong.nativeTitle}</p>
              <div className="lyrics-meta">
                <span>{activeSong.language}</span>
                <span className={activeSong.contentStatus}>{activeSong.contentStatus === 'complete' ? '已有正文' : '资料卡'}</span>
                {activeSong.sourceUrl && <a href={activeSong.sourceUrl} rel="noreferrer" target="_blank"><i className="fas fa-arrow-up-right-from-square" /> 公开来源</a>}
              </div>
            </div>
            <div className="lyrics-reader-actions">
              <button onClick={() => setFontScale(scale => Math.max(0.8, Number((scale - 0.1).toFixed(1))))} aria-label="缩小歌词">A−</button>
              <button onClick={() => setFontScale(1)} aria-label="恢复默认字号">{Math.round(fontScale * 100)}%</button>
              <button onClick={() => setFontScale(scale => Math.min(1.6, Number((scale + 0.1).toFixed(1))))} aria-label="放大歌词">A＋</button>
              <button className={wakeLock ? 'active' : ''} onClick={toggleWakeLock} disabled={!('wakeLock' in navigator)} title="KTV 时防止屏幕自动熄灭">
                <i className="fas fa-sun" /> {wakeLock ? '已常亮' : '屏幕常亮'}
              </button>
            </div>
          </header>

          {activeSong.contentStatus === 'reference' && (
            <div className="lyrics-reference-note"><i className="fas fa-circle-info" /> 这首目前是经过身份核对的资料卡，可从公开来源对照；尚未把无法确认版本的全文当作正确歌词收录。</div>
          )}

          <div className="lyrics-document-tabs" role="tablist" aria-label="歌词文档">
            {activeSong.documents.map(document => (
              <button
                className={document.id === activeDocument?.id ? 'active' : ''}
                key={document.id}
                onClick={() => setActiveDocumentId(document.id)}
                role="tab"
                aria-selected={document.id === activeDocument?.id}
              >
                {document.label}{activeSong.documents.filter(item => item.label === document.label).length > 1 ? ` · ${document.title}` : ''}
              </button>
            ))}
          </div>

          <article className="lyrics-reader" ref={readerRef} style={{ '--lyric-scale': fontScale }}>
            <LyricDocument content={activeDocument?.content || ''} />
          </article>
        </section>
      </div>
    </div>
  )
}
