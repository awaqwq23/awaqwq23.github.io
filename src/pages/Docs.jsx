import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

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
    desc: '浏览器收藏夹导出，包含游戏、Wiki、资源站等共 246+ 条',
    icon: 'fa-bookmark',
    bg: 'linear-gradient(135deg, #667eea, #764ba2)',
    json: '/materials/favorites.json',
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

export default function Docs() {
  const [activeModule, setActiveModule] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const topRef = useRef(null)
  const location = useLocation()

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
    const allItems = data ? data.flatMap(c => c.items.map(i => ({ ...i, _cat: c.category, _icon: c.icon }))) : []
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
        ) : !data || data.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '3rem' }}>暂无内容</p>
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
                <section key={cat.category} className="materials-category" style={{ marginTop: ci === 0 ? '1rem' : '2.5rem' }}>
                  <AS>
                    <h2 className="materials-cat-title">
                      <i className={`fas ${cat.icon || catIcons[cat.category] || 'fa-folder'}`} style={{ color: 'var(--primary)', marginRight: '0.5rem' }} />
                      {cat.category}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>
                        ({cat.items.length})
                      </span>
                    </h2>
                  </AS>
                  <div className="link-list">
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
                </section>
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

  // 主页：6 大模块卡片
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
            <div className="docs-module-card" onClick={() => setActiveModule(m.id)}>
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
