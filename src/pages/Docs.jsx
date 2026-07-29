import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function useScrollReveal() {
  const ref = useRef(null); const [show, setShow] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); obs.unobserve(el) } }, { threshold: 0.1 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return [ref, show]
}
function AS({ children, d = 0 }) {
  const [ref, show] = useScrollReveal()
  return <div ref={ref} className={`reveal${show ? ' visible' : ''}`} style={{ transitionDelay: `${d}s` }}>{children}</div>
}

const MODULES = [
  {
    id: 'favorites',
    name: '我的收藏夹',
    desc: '每周从 Microsoft Edge 自动同步，分类、搜索与原链接完整保留',
    icon: 'fa-bookmark',
    bg: 'linear-gradient(135deg, #667eea, #764ba2)',
    json: '/materials/favorites.json',
  },
  {
    id: 'music',
    name: '网易云歌单镜像',
    desc: '每周同步本机网易云创建的歌单与已缓存歌曲',
    icon: 'fa-music',
    bg: 'linear-gradient(135deg, #ec4141, #991b1b)',
    json: '/materials/netease-music.json',
    kind: 'music',
  },
  {
    id: 'curated-music',
    name: '我的手选歌单',
    desc: '推荐、想学和已经会唱的歌，由我手动维护，不依赖平台同步',
    icon: 'fa-headphones',
    bg: 'linear-gradient(135deg, #0f172a, #7c3aed 60%, #ec4899)',
    route: '/music',
  },
  {
    id: 'dev',
    name: '开发软件',
    desc: '常用编程语言、IDE、运行环境与数据库下载入口',
    icon: 'fa-laptop-code',
    bg: 'linear-gradient(135deg, #11998e, #38ef7d)',
    json: '/materials/dev-tools.json',
  },
  {
    id: 'ai',
    name: 'AI 工具',
    desc: '对话大模型、编程助手、AI 写作与音乐等常用入口',
    icon: 'fa-robot',
    bg: 'linear-gradient(135deg, #fc466b, #3f5efb)',
    json: '/materials/ai-tools.json',
  },
  {
    id: 'tools',
    name: '工具软件',
    desc: '效率、下载、媒体处理与在线小工具合集',
    icon: 'fa-toolbox',
    bg: 'linear-gradient(135deg, #f093fb, #f5576c)',
    json: '/materials/tools.json',
  },
  {
    id: 'image',
    name: '图片生成',
    desc: 'AI 生图、抠图放大与设计素材站',
    icon: 'fa-image',
    bg: 'linear-gradient(135deg, #fa709a, #fee140)',
    json: '/materials/image-tools.json',
  },
  {
    id: 'fun',
    name: '其他娱乐',
    desc: '追番、游戏、音乐电台与好玩的网站',
    icon: 'fa-gamepad',
    bg: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    json: '/materials/fun.json',
  },
]

const catIcons = {
  '编程语言': 'fa-code',
  '开发工具': 'fa-laptop-code',
  '运行环境与数据库': 'fa-server',
  '游戏': 'fa-gamepad',
  '泰拉': 'fa-hammer',
  '舟': 'fa-chess-rook',
  'alice': 'fa-cat',
  'steam联机': 'fa-users',
  '网站导航': 'fa-compass',
  '其他杂项': 'fa-box-open',
  '编程': 'fa-code',
  '工作': 'fa-briefcase',
  '学习': 'fa-graduation-cap',
}

const catGradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #11998e, #38ef7d)',
  'linear-gradient(135deg, #fc466b, #3f5efb)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fad0c4, #ffd1ff)',
]

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function MusicLibrary({ data, search, setSearch }) {
  const categories = data?.categories || []
  const query = search.trim().toLowerCase()
  const allSongs = categories.flatMap(cat => cat.items.map(song => ({ ...song, _category: cat.name })))
  const searchResults = query
    ? allSongs.filter(song => `${song.name} ${song.artist} ${song.album} ${song._category}`.toLowerCase().includes(query))
    : []

  const renderSong = (song, i, color) => (
    <a className="music-song" href={song.url} target="_blank" rel="noopener" key={`${song.id}-${i}`}>
      <span className="music-song-index">{String(i + 1).padStart(2, '0')}</span>
      {song.cover ? (
        <img src={song.cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span className="music-song-cover" style={{ background: color }}><i className="fas fa-music" /></span>
      )}
      <span className="music-song-copy">
        <strong>{song.name}</strong>
        <small>{song.artist} · {song.album}</small>
      </span>
      <i className="fas fa-play music-song-play" />
    </a>
  )

  return (
    <div className="music-library">
      <div className="music-hero">
        <div className="music-record"><span><i className="fas fa-music" /></span></div>
        <div>
          <span className="music-eyebrow">AWA'S MUSIC LIBRARY</span>
          <h2>此刻在听，也在学着唱</h2>
          <p>{allSongs.length} 首本地已缓存曲目 · 同步于 {new Date(data.syncedAt).toLocaleString('zh-CN')}</p>
        </div>
        <a href={data.profileUrl} target="_blank" rel="noopener" className="music-profile-link">
          打开网易云 <i className="fas fa-arrow-up-right-from-square" />
        </a>
      </div>

      <div className="music-category-overview">
        {categories.map(cat => (
          <a
            href={`#music-${cat.id}`}
            className="music-category-chip"
            style={{ '--music-color': cat.color }}
            key={cat.id}
          >
            <i className={`fas ${cat.icon}`} />
            <span><strong>{cat.name}</strong><small>{cat.cached} 首已同步{cat.total > cat.cached ? ` / 歌单 ${cat.total} 首` : ''}</small></span>
          </a>
        ))}
      </div>

      <div className="docs-search music-search">
        <i className="fas fa-search" />
        <input
          type="text"
          placeholder={`搜索 ${allSongs.length} 首已同步歌曲……`}
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        {search && <button onClick={() => setSearch('')}><i className="fas fa-times" /></button>}
      </div>

      {query ? (
        <section className="music-section">
          <div className="music-section-head">
            <div><span>SEARCH RESULTS</span><h3>搜索结果</h3></div>
            <strong>{searchResults.length}</strong>
          </div>
          <div className="music-song-list">
            {searchResults.length
              ? searchResults.map((song, i) => renderSong(song, i, '#ec4141'))
              : <div className="music-empty"><i className="fas fa-compact-disc" /><p>没有找到这首歌</p></div>}
          </div>
        </section>
      ) : categories.map(cat => (
        <section className="music-section" id={`music-${cat.id}`} key={cat.id} style={{ '--music-color': cat.color }}>
          <div className="music-section-head">
            <div>
              <span>PLAYLIST // {cat.id.toUpperCase()}</span>
              <h3><i className={`fas ${cat.icon}`} /> {cat.name}</h3>
            </div>
            <a href={cat.playlistUrl} target="_blank" rel="noopener">
              {cat.total || cat.cached} 首 <i className="fas fa-arrow-right" />
            </a>
          </div>
          {cat.items.length ? (
            <>
              <div className="music-song-list">
                {cat.items.slice(0, 24).map((song, i) => renderSong(song, i, cat.color))}
              </div>
              {cat.items.length > 24 && (
                <a className="music-more" href={cat.playlistUrl} target="_blank" rel="noopener">
                  还有 {cat.items.length - 24} 首已同步歌曲，在网易云查看完整歌单
                  <i className="fas fa-arrow-up-right-from-square" />
                </a>
              )}
            </>
          ) : (
            <a className="music-empty" href={cat.playlistUrl} target="_blank" rel="noopener">
              <i className={`fas ${cat.icon}`} />
              <p>{cat.emptyHint}</p>
              <span>打开网易云歌单 <i className="fas fa-arrow-right" /></span>
            </a>
          )}
        </section>
      ))}
    </div>
  )
}

export default function Docs() {
  const [activeModule, setActiveModule] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const topRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  // 点击导航栏"文档"时回到资料首页
  useEffect(() => { setActiveModule(null); setSearch('') }, [location.key])

  useEffect(() => {
    if (!activeModule) { setData(null); return }
    const m = MODULES.find(x => x.id === activeModule)
    if (!m || m.placeholder) return
    setLoading(true)
    fetch(m.json)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [activeModule])

  useEffect(() => {
    if (activeModule && topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [activeModule])

  // 子页面
  if (activeModule) {
    const m = MODULES.find(x => x.id === activeModule)
    const allItems = Array.isArray(data) ? data.flatMap(c => c.items.map(i => ({ ...i, _cat: c.category, _icon: c.icon }))) : []
    const filteredItems = search
      ? allItems.filter(it => (it.name + ' ' + it.url + ' ' + (it.desc || '')).toLowerCase().includes(search.toLowerCase()))
      : allItems

    return (
      <div className="page" ref={topRef}>
        <AS>
          <div className="section-header">
            <h1>
              <i className={`fas ${m.icon}`} style={{ color: 'var(--primary)' }} />
              {' '}{m.name}
            </h1>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => { setActiveModule(null); setSearch('') }}>
                <i className="fas fa-arrow-left" /> 返回资料首页
              </span>
              {' · '}
              <span>{m.desc}</span>
            </p>
            <div className="section-line" />
          </div>
        </AS>

        {m.placeholder ? (
          <AS d={0.1}>
            <div className="placeholder-card">
              <i className="fas fa-hourglass-half" />
              <h3>还没填内容喵</h3>
              <p>等 awa 后续补充。先看看其他模块吧～</p>
              <button className="btn btn-sm" onClick={() => setActiveModule(null)}>
                <i className="fas fa-arrow-left" /> 返回
              </button>
            </div>
          </AS>
        ) : loading ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '3rem' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }} />
            加载中...
          </p>
        ) : !data || (Array.isArray(data) && data.length === 0) ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '3rem' }}>暂无内容</p>
        ) : m.kind === 'music' ? (
          <MusicLibrary data={data} search={search} setSearch={setSearch} />
        ) : (
          <>
            {/* 搜索框 */}
            {allItems.length > 10 && (
              <AS d={0.05}>
                <div className="docs-search">
                  <i className="fas fa-search" />
                  <input
                    type="text"
                    placeholder={`在 ${allItems.length} 个链接中搜索……`}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && <button onClick={() => setSearch('')}><i className="fas fa-times" /></button>}
                </div>
              </AS>
            )}

            {/* 搜索结果显示扁平列表 */}
            {search ? (
              <div className="link-list">
                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                  找到 <strong>{filteredItems.length}</strong> 个结果
                </p>
                {filteredItems.length === 0 ? (
                  <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>没找到匹配的链接</p>
                ) : filteredItems.map((it, i) => (
                  <AS key={it.url + i} d={Math.min(i, 10) * 0.02}>
                    <a className="link-item" href={it.url} target="_blank" rel="noopener">
                      <div className="link-item-icon" style={{ background: catGradients[i % catGradients.length] }}>
                        <i className="fas fa-external-link-alt" />
                      </div>
                      <div className="link-item-body">
                        <div className="link-item-name">{it.name}</div>
                        {it.desc && <div className="link-item-desc">{it.desc}</div>}
                        <div className="link-item-host">{domainOf(it.url)}</div>
                      </div>
                      <i className="fas fa-chevron-right link-item-arrow" />
                    </a>
                  </AS>
                ))}
              </div>
            ) : (
              /* 按分类展示 */
              data.map((cat, ci) => (
                <details
                  key={cat.category}
                  className="materials-category materials-folder"
                  defaultOpen={ci === 0}
                  style={{ marginTop: ci === 0 ? '1rem' : '0.75rem' }}
                >
                  <summary className="materials-cat-title">
                    <span>
                      <i className={`fas ${cat.icon || catIcons[cat.category] || 'fa-folder'}`} />
                      {cat.category}
                      <small>({cat.items.length})</small>
                    </span>
                    <i className="fas fa-chevron-down materials-folder-chevron" />
                  </summary>
                  <div className="link-list materials-folder-content">
                    {cat.items.map((it, i) => (
                      <AS key={it.url + i} d={Math.min(i, 10) * 0.02}>
                        <a className="link-item" href={it.url} target="_blank" rel="noopener">
                          <div className="link-item-icon" style={{ background: catGradients[ci % catGradients.length] }}>
                            <i className="fas fa-external-link-alt" />
                          </div>
                          <div className="link-item-body">
                            <div className="link-item-name">{it.name}</div>
                            {it.desc && <div className="link-item-desc">{it.desc}</div>}
                            <div className="link-item-host">{domainOf(it.url)}</div>
                          </div>
                          <i className="fas fa-chevron-right link-item-arrow" />
                        </a>
                      </AS>
                    ))}
                  </div>
                </details>
              ))
            )}
          </>
        )}

        <AS d={0.2}>
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button className="btn btn-sm" onClick={() => { setActiveModule(null); setSearch('') }}>
              <i className="fas fa-arrow-left" /> 返回资料首页
            </button>
          </div>
        </AS>
      </div>
    )
  }

  // 主页：资料模块卡片
  return (
    <div className="page">
      <AS>
        <div className="section-header">
          <h1><i className="fas fa-book" style={{ color: 'var(--primary)' }} /> 资料</h1>
          <p>收藏的网站 / 开发软件 / 工具导航 🔖</p>
          <div className="section-line" />
        </div>
      </AS>

      <div className="docs-modules-grid">
        {MODULES.map((m, i) => (
          <AS key={m.id} d={i * 0.06}>
            <div className="docs-module-card" onClick={() => m.route ? navigate(m.route) : setActiveModule(m.id)}>
              <div className="docs-module-head" style={{ background: m.bg }}>
                <i className={`fas ${m.icon}`} />
              </div>
              <div className="docs-module-body">
                <h3>{m.name}</h3>
                <p>{m.desc}</p>
                <span className="btn btn-sm btn-primary" style={{ marginTop: '0.5rem' }}>
                  <i className="fas fa-book-open" /> 进入
                </span>
              </div>
            </div>
          </AS>
        ))}
      </div>
    </div>
  )
}
