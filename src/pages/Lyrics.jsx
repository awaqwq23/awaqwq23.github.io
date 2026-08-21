import { useEffect, useMemo, useRef, useState } from 'react'

function lineClass(line) {
  if (/^#{1,6}\s/.test(line)) return 'lyric-line lyric-heading'
  if (/^[|:-]+(?:\s*[|:-]+)+$/.test(line)) return 'lyric-line lyric-table-rule'
  if (/[ぁ-ゖァ-ヺー]/u.test(line)) return 'lyric-line lyric-japanese'
  if (/^[A-Za-zÀ-ž0-9'’()\s.,!?~\-]+$/u.test(line)) return 'lyric-line lyric-romaji'
  if (/\p{Script=Han}/u.test(line)) return 'lyric-line lyric-translation'
  return 'lyric-line'
}

function cleanLine(line) {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
}

function LyricDocument({ content }) {
  return content.split('\n').map((line, index) => (
    line.trim()
      ? <div className={lineClass(line)} key={`${index}-${line.slice(0, 16)}`}>{cleanLine(line)}</div>
      : <div className="lyric-spacer" aria-hidden="true" key={`space-${index}`} />
  ))
}

export default function Lyrics() {
  const [songs, setSongs] = useState([])
  const [activeSongId, setActiveSongId] = useState(null)
  const [activeDocumentId, setActiveDocumentId] = useState(null)
  const [query, setQuery] = useState('')
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
    if (!normalized) return songs
    return songs.filter(song => `${song.title} ${song.nativeTitle}`.toLocaleLowerCase().includes(normalized))
  }, [query, songs])

  const activeSong = songs.find(song => song.id === activeSongId) || songs[0]
  const activeDocument = activeSong?.documents.find(document => document.id === activeDocumentId)
    || activeSong?.documents.find(document => document.id === activeSong?.primaryDocumentId)

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
          <span className="lyrics-kicker">KTV QUICK BOOK</span>
          <h1><i className="fas fa-microphone-lines" /> 日语歌词本</h1>
          <p>{songs.length} 首歌曲，支持快速搜索、逐行大字显示与屏幕常亮。</p>
        </div>
        <button className="btn btn-primary lyrics-focus-button" onClick={() => setFocusMode(value => !value)}>
          <i className={`fas ${focusMode ? 'fa-compress' : 'fa-expand'}`} /> {focusMode ? '退出大字模式' : '进入大字模式'}
        </button>
      </div>

      <div className="lyrics-layout">
        <aside className="lyrics-sidebar" aria-label="歌曲列表">
          <label className="lyrics-search">
            <i className="fas fa-search" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索歌曲…" />
            {query && <button onClick={() => setQuery('')} aria-label="清空搜索"><i className="fas fa-times" /></button>}
          </label>
          <div className="lyrics-song-list">
            {filteredSongs.map(song => (
              <button className={song.id === activeSong.id ? 'active' : ''} key={song.id} onClick={() => chooseSong(song)}>
                <span>{String(song.order).padStart(2, '0')}</span>
                <span><strong>{song.title}</strong>{song.nativeTitle !== song.title && <small>{song.nativeTitle}</small>}</span>
                <i className="fas fa-chevron-right" />
              </button>
            ))}
            {!filteredSongs.length && <p className="lyrics-empty">没有找到这首歌</p>}
          </div>
        </aside>

        <section className="lyrics-reader-shell">
          <header className="lyrics-reader-header">
            <div>
              <span>NO. {String(activeSong.order).padStart(2, '0')}</span>
              <h2>{activeSong.title}</h2>
              {activeSong.nativeTitle !== activeSong.title && <p>{activeSong.nativeTitle}</p>}
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

