import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import PostCard from '../components/PostCard'
import { personalImages, shinozawaImages } from '../data/blogMedia'
import shinozawaArticle from '../../docs/charactor/筱泽广 学马仕/文档/1.md?raw'

const PASSWORD_HASH = '3831024cd98f9dea0d83f434bbd0a7492b068b1ca4d39f1904eaf35ae9361c27'
const GALLERY_PAGE_SIZE = 9
const LIGHTBOX_MIN_ZOOM = 0.5
const LIGHTBOX_MAX_ZOOM = 5
const LIGHTBOX_ZOOM_STEP = 0.25
const PREFETCH_HISTORY_LIMIT = 6

const prefetchedOriginals = []
let activeOriginalPrefetch = null
let queuedOriginalPrefetch = null

function rememberPrefetchedOriginal(src) {
  const existingIndex = prefetchedOriginals.indexOf(src)
  if (existingIndex >= 0) prefetchedOriginals.splice(existingIndex, 1)
  prefetchedOriginals.push(src)
  if (prefetchedOriginals.length > PREFETCH_HISTORY_LIMIT) prefetchedOriginals.shift()
}

function runQueuedOriginalPrefetch() {
  if (activeOriginalPrefetch || !queuedOriginalPrefetch) return
  const src = queuedOriginalPrefetch
  queuedOriginalPrefetch = null
  const loader = new Image()
  activeOriginalPrefetch = { src, loader }
  loader.decoding = 'async'
  loader.fetchPriority = 'low'

  const finish = loaded => {
    if (loaded) rememberPrefetchedOriginal(src)
    loader.onload = null
    loader.onerror = null
    activeOriginalPrefetch = null
    runQueuedOriginalPrefetch()
  }

  loader.onload = () => finish(true)
  loader.onerror = () => finish(false)
  loader.src = src
}

function prefetchOriginal(src) {
  if (!src || prefetchedOriginals.includes(src) || activeOriginalPrefetch?.src === src) return
  queuedOriginalPrefetch = src
  runQueuedOriginalPrefetch()
}

const modules = [
  { id: 'posts', icon: 'fa-pen-nib', eyebrow: 'WRITING', title: '普通博客', desc: '随笔、生活记录与偶尔冒出来的想法', color: 'blue' },
  { id: 'characters', icon: 'fa-star', eyebrow: 'FAVORITES', title: '喜好角色', desc: '角色收藏、发癫文字与完整图片仓库', color: 'purple' },
  { id: 'pictures', icon: 'fa-camera-retro', eyebrow: 'PRIVATE', title: '个人照片', desc: '需要密码才能进入的私人影像角落', color: 'pink' },
]

const characters = [
  {
    id: 'shinozawa-hiro',
    name: '筱泽广',
    source: '学园偶像大师',
    note: '天才、慵懒，以及无法预测的可爱',
    cover: shinozawaImages[0]?.thumbnailSrc,
    ready: true,
  },
  { id: 'gotoh-hitori', name: '后藤一里', source: '孤独摇滚！', note: '内容整理中，先让小孤独占个位', ready: false },
  { id: 'muelsyse', name: '缪尔赛斯', source: '明日方舟', note: '档案正在漂来的路上', ready: false },
]

const catLabels = {
  all: '全部',
  tech: '💻 技术',
  life: '🌸 生活',
  dev: '⚙️ 开发',
  toy: '🎮 玩具',
}

function useScrollReveal() {
  const ref = useRef(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShow(true)
        obs.unobserve(el)
      }
    }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, show]
}

function AnimatedSection({ children, delay = 0 }) {
  const [ref, show] = useScrollReveal()
  return <div ref={ref} className={`reveal${show ? ' visible' : ''}`} style={{ transitionDelay: `${delay}s` }}>{children}</div>
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function Modal({ children, label, onClose, className = '' }) {
  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [onClose])

  return createPortal(
    <div className="media-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className={`media-modal ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function Lightbox({ images, index, onChange, onClose }) {
  const image = images[index]
  const viewportRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const [loadedSrc, setLoadedSrc] = useState('')
  const [failedSrc, setFailedSrc] = useState('')
  const imageReady = image?.src === loadedSrc
  const imageFailed = image?.src === failedSrc

  const updateZoom = useCallback((nextValue, anchor) => {
    const nextZoom = Math.min(LIGHTBOX_MAX_ZOOM, Math.max(LIGHTBOX_MIN_ZOOM, nextValue))
    if (nextZoom === zoom) return

    const viewport = viewportRef.current
    const rect = viewport?.getBoundingClientRect()
    const anchorX = anchor && rect ? anchor.clientX - rect.left : (viewport?.clientWidth || 0) / 2
    const anchorY = anchor && rect ? anchor.clientY - rect.top : (viewport?.clientHeight || 0) / 2
    const contentXRatio = viewport?.scrollWidth ? (viewport.scrollLeft + anchorX) / viewport.scrollWidth : 0.5
    const contentYRatio = viewport?.scrollHeight ? (viewport.scrollTop + anchorY) / viewport.scrollHeight : 0.5

    setZoom(nextZoom)
    requestAnimationFrame(() => {
      if (!viewport) return
      viewport.scrollLeft = contentXRatio * viewport.scrollWidth - anchorX
      viewport.scrollTop = contentYRatio * viewport.scrollHeight - anchorY
    })
  }, [zoom])

  useEffect(() => {
    setZoom(1)
    const viewport = viewportRef.current
    if (viewport) {
      viewport.scrollLeft = 0
      viewport.scrollTop = 0
    }
  }, [image?.src])

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onChange((index - 1 + images.length) % images.length)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        onChange((index + 1) % images.length)
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        updateZoom(zoom + LIGHTBOX_ZOOM_STEP)
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        updateZoom(zoom - LIGHTBOX_ZOOM_STEP)
      }
      if (event.key === '0') {
        event.preventDefault()
        updateZoom(1)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [images.length, index, onChange, updateZoom, zoom])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    const onWheel = event => {
      event.preventDefault()
      updateZoom(zoom + (event.deltaY < 0 ? LIGHTBOX_ZOOM_STEP : -LIGHTBOX_ZOOM_STEP), event)
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [updateZoom, zoom])

  if (!image) return null

  const frameZoom = zoom > 1 ? zoom : 1
  const imageZoom = zoom > 1 ? 1 : zoom

  return (
    <Modal label={`查看大图：${image.name}`} onClose={onClose} className="lightbox-modal">
      <div className="lightbox-toolbar">
        <div>
          <strong>{image.name}</strong>
          <span>{index + 1} / {images.length}</span>
        </div>
        <div className="lightbox-toolbar-actions">
          <div className="lightbox-zoom-controls" role="group" aria-label="图片缩放">
            <button className="icon-action" type="button" onClick={() => updateZoom(zoom - LIGHTBOX_ZOOM_STEP)} disabled={zoom <= LIGHTBOX_MIN_ZOOM} title="缩小（-）" aria-label="缩小图片">
              <i className="fas fa-minus" />
            </button>
            <button className="lightbox-zoom-value" type="button" onClick={() => updateZoom(1)} title="恢复适合窗口大小（0）" aria-label={`当前缩放 ${Math.round(zoom * 100)}%，点击重置`}>
              {Math.round(zoom * 100)}%
            </button>
            <button className="icon-action" type="button" onClick={() => updateZoom(zoom + LIGHTBOX_ZOOM_STEP)} disabled={zoom >= LIGHTBOX_MAX_ZOOM} title="放大（+）" aria-label="放大图片">
              <i className="fas fa-plus" />
            </button>
          </div>
          <a className="icon-action" href={image.src} download={image.name} title="下载原图" aria-label={`下载原图 ${image.name}`}>
            <i className="fas fa-download" />
          </a>
          <button className="icon-action" type="button" onClick={onClose} title="关闭" aria-label="关闭大图">
            <i className="fas fa-times" />
          </button>
        </div>
      </div>
      <div className="lightbox-stage">
        {images.length > 1 && (
          <button
            className="lightbox-arrow prev"
            type="button"
            onClick={() => onChange((index - 1 + images.length) % images.length)}
            onPointerEnter={() => prefetchOriginal(images[(index - 1 + images.length) % images.length].src)}
            onPointerDown={() => prefetchOriginal(images[(index - 1 + images.length) % images.length].src)}
            onFocus={() => prefetchOriginal(images[(index - 1 + images.length) % images.length].src)}
            aria-label="上一张"
          >
            <i className="fas fa-chevron-left" />
          </button>
        )}
        <div className="lightbox-viewport" ref={viewportRef} tabIndex="0" aria-label="大图查看区域，可使用鼠标滚轮或加减键缩放">
          <div
            className="lightbox-image-frame"
            style={{ width: `${frameZoom * 100}%`, height: `${frameZoom * 100}%` }}
          >
            <img
              className={`lightbox-preview${imageReady ? ' is-hidden' : ''}`}
              src={image.thumbnailSrc}
              alt=""
              decoding="async"
              draggable="false"
              aria-hidden="true"
              style={{ maxWidth: `${imageZoom * 100}%`, maxHeight: `${imageZoom * 100}%` }}
            />
            <img
              className={`lightbox-original${imageReady ? ' is-ready' : ''}`}
              src={image.src}
              alt={image.name}
              decoding="async"
              draggable="false"
              fetchPriority="high"
              style={{ maxWidth: `${imageZoom * 100}%`, maxHeight: `${imageZoom * 100}%` }}
              onLoad={() => {
                setLoadedSrc(image.src)
                setFailedSrc('')
                rememberPrefetchedOriginal(image.src)
              }}
              onError={() => setFailedSrc(image.src)}
            />
          </div>
        </div>
        <div className={`lightbox-stage-footer${!imageReady ? ' has-status' : ''}`}>
          {!imageReady && (
            <div className={`lightbox-loading${imageFailed ? ' has-error' : ''}`} role="status">
              <i className={`fas ${imageFailed ? 'fa-circle-exclamation' : 'fa-spinner fa-spin'}`} />
              <span>{imageFailed ? '原图加载失败，请稍后重试' : '正在加载原图…'}</span>
            </div>
          )}
          <div className="lightbox-zoom-hint">滚轮或 + / − 缩放 · 0 重置 · ← / → 切换</div>
        </div>
        {images.length > 1 && (
          <button
            className="lightbox-arrow next"
            type="button"
            onClick={() => onChange((index + 1) % images.length)}
            onPointerEnter={() => prefetchOriginal(images[(index + 1) % images.length].src)}
            onPointerDown={() => prefetchOriginal(images[(index + 1) % images.length].src)}
            onFocus={() => prefetchOriginal(images[(index + 1) % images.length].src)}
            aria-label="下一张"
          >
            <i className="fas fa-chevron-right" />
          </button>
        )}
      </div>
    </Modal>
  )
}

function MediaGallery({ images, title, privateGallery = false }) {
  const [page, setPage] = useState(1)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const pageCount = Math.max(1, Math.ceil(images.length / GALLERY_PAGE_SIZE))
  const pageImages = useMemo(
    () => images.slice((page - 1) * GALLERY_PAGE_SIZE, page * GALLERY_PAGE_SIZE),
    [images, page],
  )

  useEffect(() => {
    setPage(1)
  }, [images])
  useEffect(() => {
    setLightboxIndex(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  return (
    <section className={`media-gallery${privateGallery ? ' private-gallery' : ''}`}>
      <div className="media-gallery-heading">
        <div>
          <span>{privateGallery ? 'UNLOCKED COLLECTION' : 'IMAGE ARCHIVE'}</span>
          <h2>{title}</h2>
        </div>
        <p><strong>{images.length}</strong> 张 · 第 {page}/{pageCount} 页</p>
      </div>

      <div className="media-gallery-grid">
        {pageImages.map((image, localIndex) => (
          <figure className="media-tile" key={image.src}>
            <button
              type="button"
              onClick={() => setLightboxIndex(localIndex)}
              onPointerEnter={() => prefetchOriginal(image.src)}
              onPointerDown={() => prefetchOriginal(image.src)}
              onFocus={() => prefetchOriginal(image.src)}
              aria-label={`查看大图 ${image.name}`}
            >
              <img
                src={image.thumbnailSrc}
                alt={`${title} ${image.name}`}
                loading="lazy"
                decoding="async"
                fetchPriority={localIndex < 3 ? 'auto' : 'low'}
                onError={event => {
                  if (event.currentTarget.dataset.fallbackApplied) return
                  event.currentTarget.dataset.fallbackApplied = 'true'
                  event.currentTarget.src = image.src
                }}
              />
              <span className="media-tile-zoom"><i className="fas fa-expand" /> 查看原图</span>
            </button>
            <figcaption>
              <span>{image.name}</span>
              <a href={image.src} download={image.name} aria-label={`下载原图 ${image.name}`} title="下载原图"><i className="fas fa-download" /></a>
            </figcaption>
          </figure>
        ))}
      </div>

      {pageCount > 1 && (
        <nav className="gallery-pagination" aria-label="图片分页">
          <button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page === 1}>
            <i className="fas fa-arrow-left" /> 上一页
          </button>
          <div>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(number => (
              <button key={number} type="button" className={page === number ? 'active' : ''} onClick={() => setPage(number)} aria-current={page === number ? 'page' : undefined}>{number}</button>
            ))}
          </div>
          <button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={page === pageCount}>
            下一页 <i className="fas fa-arrow-right" />
          </button>
        </nav>
      )}

      {lightboxIndex !== null && (
        <Lightbox images={pageImages} index={lightboxIndex} onChange={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </section>
  )
}

function MarkdownArticle({ markdown }) {
  const blocks = markdown.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean)
  return (
    <article className="character-article">
      <div className="character-article-label">FAN NOTES · 01</div>
      {blocks.map((block, index) => {
        if (block.startsWith('# ')) return <h2 key={index}>{block.slice(2)}</h2>
        if (block.startsWith('## ')) return <h3 key={index}>{block.slice(3)}</h3>
        return <p key={index}>{block}</p>
      })}
      <div className="character-article-sign">— awaqwq233 的角色收藏夹</div>
    </article>
  )
}

function PostsModule() {
  const [posts, setPosts] = useState([])
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/blog/posts/index.json')
      .then(response => response.json())
      .then(data => { setPosts(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const categories = ['all', ...new Set(posts.map(post => post.category))]
  const filtered = useMemo(() => posts
    .filter(post => category === 'all' || post.category === category)
    .sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return sort === 'newest' ? dateB - dateA : dateA - dateB
    }), [category, posts, sort])

  return (
    <section className="blog-module-panel">
      <div className="blog-controls">
        <div className="blog-filter-group">
          {categories.map(cat => (
            <button key={cat} className={`filter-btn${category === cat ? ' active' : ''}`} onClick={() => setCategory(cat)}>{catLabels[cat] || cat}</button>
          ))}
        </div>
        <select className="sort-select" value={sort} onChange={event => setSort(event.target.value)} aria-label="文章排序">
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
        </select>
        <span className="post-count">共 {filtered.length} 篇文章</span>
      </div>
      <div className="blog-list">
        {loading ? (
          <p className="module-loading"><i className="fas fa-spinner fa-spin" />加载中...</p>
        ) : filtered.length > 0 ? (
          filtered.map((post, index) => (
            <AnimatedSection key={post.url} delay={index * 0.04}><PostCard post={post} /></AnimatedSection>
          ))
        ) : (
          <p className="module-loading"><i className="fas fa-inbox" />该分类暂无文章</p>
        )}
      </div>
    </section>
  )
}

function CharactersModule() {
  const [selectedId, setSelectedId] = useState(characters[0].id)
  const [view, setView] = useState('article')
  const selected = characters.find(character => character.id === selectedId)

  useEffect(() => {
    setView('article')
  }, [selectedId])

  return (
    <section className="character-module blog-module-panel">
      <div className="module-intro-row">
        <div>
          <span>CHARACTER DIRECTORY</span>
          <h2>选择一位喜欢的角色</h2>
          <p>每个文件夹会慢慢长成一份角色档案。</p>
        </div>
        <div className="folder-count"><i className="fas fa-folder-open" /> 3 个角色文件夹</div>
      </div>

      <div className="character-picker">
        {characters.map(character => (
          <button key={character.id} type="button" className={`character-card${selectedId === character.id ? ' active' : ''}${!character.ready ? ' placeholder' : ''}`} onClick={() => setSelectedId(character.id)}>
            <div className="character-cover">
              {character.cover ? <img src={character.cover} alt={character.name} /> : <i className="fas fa-folder" />}
              <span>{character.ready ? '已收录' : '待填充'}</span>
            </div>
            <div className="character-card-copy">
              <strong>{character.name}</strong>
              <small>{character.source}</small>
              <p>{character.note}</p>
            </div>
          </button>
        ))}
      </div>

      {selected.ready ? (
        <div className="character-library">
          <div className="character-library-header">
            <div>
              <span>当前角色</span>
              <h2>{selected.name} <small>／ {selected.source}</small></h2>
            </div>
            <div className="character-view-switch" role="tablist" aria-label="角色内容类型">
              <button type="button" role="tab" aria-selected={view === 'article'} className={view === 'article' ? 'active' : ''} onClick={() => setView('article')}><i className="fas fa-align-left" /> 文章</button>
              <button type="button" role="tab" aria-selected={view === 'images'} className={view === 'images' ? 'active' : ''} onClick={() => setView('images')}><i className="fas fa-images" /> 图片 <span>{shinozawaImages.length}</span></button>
            </div>
          </div>
          {view === 'article'
            ? <MarkdownArticle markdown={shinozawaArticle} />
            : <MediaGallery images={shinozawaImages} title="筱泽广图片收藏" />}
        </div>
      ) : (
        <div className="character-empty-state">
          <i className="fas fa-box-open" />
          <span>PLACEHOLDER</span>
          <h2>{selected.name}的文件夹还空空的</h2>
          <p>角色入口已经准备好，文章和图片之后会在这里出现。</p>
        </div>
      )}
    </section>
  )
}

function PasswordModal({ onUnlock, onClose }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setChecking(true)
    setError('')
    try {
      if (await sha256(password) === PASSWORD_HASH) {
        onUnlock()
      } else {
        setError('密码不对喵，再想想看。')
        setPassword('')
      }
    } catch {
      setError('当前浏览器无法完成验证，请换一个现代浏览器再试。')
    } finally {
      setChecking(false)
    }
  }

  return (
    <Modal label="个人照片密码验证" onClose={onClose} className="password-modal">
      <button className="modal-close" type="button" onClick={onClose} aria-label="关闭密码弹窗"><i className="fas fa-times" /></button>
      <div className="password-modal-icon"><i className="fas fa-lock" /></div>
      <span className="password-eyebrow">PRIVATE ALBUM</span>
      <h2>这里需要一句暗号</h2>
      <p>输入密码后，即可在本次浏览会话中查看全部个人照片。</p>
      <form onSubmit={submit}>
        <label htmlFor="album-password">访问密码</label>
        <div className={`password-input${error ? ' has-error' : ''}`}>
          <i className="fas fa-key" />
          <input id="album-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="请输入密码" autoComplete="current-password" autoFocus />
        </div>
        {error && <p className="password-error" role="alert"><i className="fas fa-circle-exclamation" /> {error}</p>}
        <button className="btn btn-primary password-submit" type="submit" disabled={!password || checking}>
          <i className={`fas ${checking ? 'fa-spinner fa-spin' : 'fa-unlock-keyhole'}`} /> {checking ? '验证中...' : '解锁相册'}
        </button>
      </form>
      <small><i className="fas fa-shield-halved" /> 密码不会被保存；关闭浏览器标签页后需要重新输入。</small>
    </Modal>
  )
}

function PicturesModule({ unlocked, onRequestUnlock }) {
  if (unlocked) return <MediaGallery images={personalImages} title="个人照片" privateGallery />
  return (
    <section className="private-album-locked blog-module-panel">
      <div className="private-lock-visual">
        <div className="private-photo-stack"><span /><span /><span><i className="fas fa-camera-retro" /></span></div>
        <div className="private-lock-badge"><i className="fas fa-lock" /></div>
      </div>
      <span>PRIVATE · PASSWORD REQUIRED</span>
      <h2>个人照片暂时藏在门后</h2>
      <p>这是一个仅供朋友查看的私人影像角落。点击下方按钮，输入密码后查看全部 {personalImages.length} 张照片。</p>
      <button className="btn btn-primary" type="button" onClick={onRequestUnlock}><i className="fas fa-key" /> 输入密码查看</button>
      <small><i className="fas fa-circle-info" /> 此处是静态站点的访问提示，不等同于服务端加密存储。</small>
    </section>
  )
}

export default function Blog() {
  const [activeModule, setActiveModule] = useState('posts')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('personal-album-unlocked') === 'yes')

  const selectModule = id => {
    setActiveModule(id)
    if (id === 'pictures' && !unlocked) setPasswordOpen(true)
  }

  const unlock = () => {
    sessionStorage.setItem('personal-album-unlocked', 'yes')
    setUnlocked(true)
    setPasswordOpen(false)
  }

  return (
    <div className="page blog-hub-page">
      <AnimatedSection>
        <div className="section-header blog-hub-header">
          <span className="page-kicker">AWA'S ARCHIVE</span>
          <h1><i className="fas fa-book-open" /> 博客与收藏</h1>
          <p>文字、喜欢的角色，以及留给熟人的相片。</p>
          <div className="section-line" />
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.08}>
        <nav className="blog-module-grid" aria-label="博客内容模块">
          {modules.map(item => (
            <button key={item.id} type="button" className={`blog-module-card ${item.color}${activeModule === item.id ? ' active' : ''}`} onClick={() => selectModule(item.id)} aria-current={activeModule === item.id ? 'page' : undefined}>
              <span className="module-card-icon"><i className={`fas ${item.icon}`} /></span>
              <span className="module-card-copy"><small>{item.eyebrow}</small><strong>{item.title}</strong><em>{item.desc}</em></span>
              <span className="module-card-arrow"><i className={`fas ${activeModule === item.id ? 'fa-check' : 'fa-arrow-right'}`} /></span>
            </button>
          ))}
        </nav>
      </AnimatedSection>

      <div className="blog-module-content">
        {activeModule === 'posts' && <PostsModule />}
        {activeModule === 'characters' && <CharactersModule />}
        {activeModule === 'pictures' && <PicturesModule unlocked={unlocked} onRequestUnlock={() => setPasswordOpen(true)} />}
      </div>

      {passwordOpen && <PasswordModal onUnlock={unlock} onClose={() => setPasswordOpen(false)} />}
    </div>
  )
}
