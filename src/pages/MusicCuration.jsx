import { useEffect, useMemo, useState } from 'react'

export default function MusicCuration() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/materials/music-curation.json')
      .then(response => response.json())
      .then(setData)
      .catch(() => setData({ categories: [] }))
  }, [])

  const categories = data?.categories || []
  const songCount = categories.reduce((total, category) => total + category.items.length, 0)
  const query = search.trim().toLowerCase()
  const visibleCategories = useMemo(() => categories.map(category => ({
    ...category,
    items: query
      ? category.items.filter(song =>
        `${song.name} ${song.artist || ''} ${song.album || ''} ${song.note || ''}`.toLowerCase().includes(query))
      : category.items,
  })), [categories, query])

  return (
    <div className="page curated-music-page">
      <section className="curated-music-hero">
        <div className="curated-music-copy">
          <span>MANUAL MUSIC NOTEBOOK</span>
          <h1>我的歌单，不交给算法</h1>
          <p>推荐、想学、已经会唱。这里的每一首歌都由 awa 亲自添加，与网易云同步完全独立。</p>
        </div>
        <div className="curated-music-count">
          <strong>{songCount}</strong>
          <span>首手选歌曲</span>
        </div>
      </section>

      <div className="docs-search curated-music-search">
        <i className="fas fa-search" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="搜索歌名、歌手、专辑或备注……"
          aria-label="搜索手选歌单"
        />
        {search && <button onClick={() => setSearch('')} aria-label="清除搜索"><i className="fas fa-times" /></button>}
      </div>

      {!data ? (
        <div className="curated-music-loading"><i className="fas fa-compact-disc fa-spin" /> 正在翻开歌单……</div>
      ) : (
        <div className="curated-playlists">
          {visibleCategories.map(category => (
            <section className="curated-playlist" key={category.id} style={{ '--playlist-color': category.color }}>
              <header>
                <div className="curated-playlist-icon"><i className={`fas ${category.icon}`} /></div>
                <div>
                  <span>{category.eyebrow}</span>
                  <h2>{category.name}</h2>
                  <p>{category.desc}</p>
                </div>
                <strong>{category.items.length}</strong>
              </header>

              {category.items.length ? (
                <div className="curated-song-grid">
                  {category.items.map((song, index) => (
                    <a
                      className="curated-song"
                      href={song.url || '#'}
                      target={song.url ? '_blank' : undefined}
                      rel={song.url ? 'noopener' : undefined}
                      key={song.id || `${song.name}-${index}`}
                    >
                      <span className="curated-song-number">{String(index + 1).padStart(2, '0')}</span>
                      {song.cover
                        ? <img src={song.cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        : <span className="curated-song-fallback"><i className="fas fa-music" /></span>}
                      <span className="curated-song-copy">
                        <strong>{song.name}</strong>
                        <small>{song.artist || '未知歌手'}{song.album ? ` · ${song.album}` : ''}</small>
                        {song.note && <em>{song.note}</em>}
                      </span>
                      <i className="fas fa-arrow-up-right-from-square" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="curated-playlist-empty">
                  <i className={`fas ${category.icon}`} />
                  <p>{query ? '这里没有匹配的歌曲' : '这里还没有添加歌曲'}</p>
                  <span>{query ? '换个关键词试试' : '下一首由 awa 亲自决定'}</span>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
