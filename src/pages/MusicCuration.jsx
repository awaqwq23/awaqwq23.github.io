import { useEffect, useMemo, useState } from 'react'

const GITHUB_OWNER = 'awaqwq23'
const GITHUB_REPO = 'awaqwq23.github.io'
const GITHUB_BRANCH = 'main'
const DATA_PATH = 'public/materials/music-curation.json'
const EMPTY_SONG = { name: '', artist: '', album: '', note: '', url: '', cover: '', categoryId: 'recommended' }

function decodeBase64(value) {
  const bytes = Uint8Array.from(atob(value.replace(/\n/g, '')), character => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  return btoa(binary)
}

async function githubRequest(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || `GitHub 请求失败（${response.status}）`)
  return payload
}

function SongDialog({ categories, initialSong, onClose, onSubmit }) {
  const [song, setSong] = useState(initialSong)

  useEffect(() => {
    const closeOnEscape = event => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const update = event => setSong(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = event => {
    event.preventDefault()
    onSubmit({
      ...song,
      name: song.name.trim(),
      artist: song.artist.trim(),
      album: song.album.trim(),
      note: song.note.trim(),
      url: song.url.trim(),
      cover: song.cover.trim(),
    })
  }

  return (
    <div className="curated-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="curated-dialog" role="dialog" aria-modal="true" aria-labelledby="song-dialog-title">
        <header>
          <div>
            <span>SONG EDITOR</span>
            <h2 id="song-dialog-title">{initialSong.id ? '编辑歌曲' : '添加歌曲'}</h2>
          </div>
          <button type="button" className="curated-icon-button" onClick={onClose} aria-label="关闭">
            <i className="fas fa-times" />
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            歌名 <b>*</b>
            <input name="name" value={song.name} onChange={update} autoFocus required />
          </label>
          <div className="curated-form-row">
            <label>
              歌手
              <input name="artist" value={song.artist} onChange={update} />
            </label>
            <label>
              专辑
              <input name="album" value={song.album} onChange={update} />
            </label>
          </div>
          <label>
            分类
            <select name="categoryId" value={song.categoryId} onChange={update}>
              {categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            歌曲链接
            <input name="url" type="url" value={song.url} onChange={update} placeholder="https://..." />
          </label>
          <label>
            封面链接
            <input name="cover" type="url" value={song.cover} onChange={update} placeholder="https://..." />
          </label>
          <label>
            备注
            <input name="note" value={song.note} onChange={update} placeholder="比如：适合夜晚听" />
          </label>
          <footer>
            <button type="button" className="btn curated-secondary-button" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary"><i className="fas fa-check" /> 确定</button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function LoginDialog({ onClose, onLogin, status, error }) {
  const [token, setToken] = useState('')

  useEffect(() => {
    const closeOnEscape = event => event.key === 'Escape' && status !== 'loading' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, status])

  return (
    <div className="curated-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="curated-dialog curated-login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-dialog-title">
        <header>
          <div>
            <span>OWNER ACCESS</span>
            <h2 id="login-dialog-title">验证 GitHub 身份</h2>
          </div>
          <button type="button" className="curated-icon-button" onClick={onClose} aria-label="关闭">
            <i className="fas fa-times" />
          </button>
        </header>
        <p>使用只允许访问这个仓库的细粒度令牌。令牌仅保留在当前页面内存，刷新或关闭页面后立即消失。</p>
        <ol>
          <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">创建 Fine-grained token <i className="fas fa-arrow-up-right-from-square" /></a></li>
          <li>Repository access 选择 <strong>awaqwq23.github.io</strong></li>
          <li>Permissions → Contents 选择 <strong>Read and write</strong></li>
        </ol>
        <form onSubmit={event => { event.preventDefault(); onLogin(token.trim()) }}>
          <label>
            GitHub 令牌
            <input
              type="password"
              value={token}
              onChange={event => setToken(event.target.value)}
              placeholder="github_pat_..."
              autoComplete="off"
              autoFocus
              required
            />
          </label>
          {error && <p className="curated-form-error"><i className="fas fa-circle-exclamation" /> {error}</p>}
          <footer>
            <button type="button" className="btn curated-secondary-button" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={status === 'loading'}>
              <i className={`fas ${status === 'loading' ? 'fa-spinner fa-spin' : 'fa-shield-halved'}`} />
              {status === 'loading' ? '正在验证' : '验证并进入'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default function MusicCuration() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [token, setToken] = useState('')
  const [fileSha, setFileSha] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginStatus, setLoginStatus] = useState('idle')
  const [loginError, setLoginError] = useState('')
  const [songDialog, setSongDialog] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    fetch(`/materials/music-curation.json?v=${Date.now()}`, { cache: 'no-store' })
      .then(response => response.json())
      .then(setData)
      .catch(() => setData({ categories: [] }))
  }, [])

  useEffect(() => {
    const warnUnsaved = event => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnUnsaved)
    return () => window.removeEventListener('beforeunload', warnUnsaved)
  }, [dirty])

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

  const enterManager = async enteredToken => {
    setLoginStatus('loading')
    setLoginError('')
    try {
      const user = await githubRequest('/user', enteredToken)
      if (user.login.toLowerCase() !== GITHUB_OWNER.toLowerCase()) {
        throw new Error(`当前账号是 ${user.login}，只有 ${GITHUB_OWNER} 可以管理歌单`)
      }
      const file = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}?ref=${GITHUB_BRANCH}`, enteredToken)
      setData(JSON.parse(decodeBase64(file.content)))
      setFileSha(file.sha)
      setToken(enteredToken)
      setDirty(false)
      setLoginOpen(false)
      setNotice(`已验证 ${user.login}，现在可以编辑歌单`)
    } catch (error) {
      setLoginError(error.message === 'Bad credentials' ? '令牌无效，请检查后重试' : error.message)
    } finally {
      setLoginStatus('idle')
    }
  }

  const leaveManager = () => {
    if (dirty && !window.confirm('还有未发布的修改，确定退出管理吗？')) return
    setToken('')
    setFileSha('')
    setDirty(false)
    setSongDialog(null)
    setNotice('已退出管理，令牌已从页面中清除')
  }

  const openNewSong = categoryId => setSongDialog({ song: { ...EMPTY_SONG, categoryId }, sourceCategoryId: null })
  const openExistingSong = (song, categoryId) => setSongDialog({ song: { ...EMPTY_SONG, ...song, categoryId }, sourceCategoryId: categoryId })

  const saveSongLocally = song => {
    const preparedSong = { ...song, id: song.id || `song-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
    delete preparedSong.categoryId
    setData(current => ({
      ...current,
      categories: current.categories.map(category => {
        const withoutOldSong = songDialog.song.id
          ? category.items.filter(item => item.id !== songDialog.song.id)
          : category.items
        return category.id === song.categoryId
          ? { ...category, items: [...withoutOldSong, preparedSong] }
          : { ...category, items: withoutOldSong }
      }),
    }))
    setDirty(true)
    setSaveStatus('idle')
    setSongDialog(null)
    setNotice(songDialog.song.id ? '歌曲已修改，记得保存并发布' : '歌曲已添加，记得保存并发布')
  }

  const removeSong = (song, categoryId) => {
    if (!window.confirm(`确定删除《${song.name}》吗？`)) return
    setData(current => ({
      ...current,
      categories: current.categories.map(category => category.id === categoryId
        ? { ...category, items: category.items.filter(item => item.id !== song.id) }
        : category),
    }))
    setDirty(true)
    setSaveStatus('idle')
    setNotice('歌曲已删除，记得保存并发布')
  }

  const publish = async () => {
    if (!dirty || !token || saveStatus === 'saving') return
    setSaveStatus('saving')
    setNotice('')
    try {
      const nextData = { ...data, updatedAt: new Date().toISOString() }
      const result = await githubRequest(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${DATA_PATH}`, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'feat: update curated music list from website',
          content: encodeBase64(`${JSON.stringify(nextData, null, 2)}\n`),
          sha: fileSha,
          branch: GITHUB_BRANCH,
        }),
      })
      setData(nextData)
      setFileSha(result.content.sha)
      setDirty(false)
      setSaveStatus('saved')
      setNotice('已提交，网站通常会在 1–2 分钟内完成更新')
    } catch (error) {
      setSaveStatus('error')
      setNotice(error.message.includes('does not have push access') || error.message.includes('Resource not accessible')
        ? '令牌没有写入权限，请确认 Contents 已设为 Read and write'
        : `发布失败：${error.message}`)
    }
  }

  return (
    <div className="page curated-music-page">
      <section className="curated-music-hero">
        <div className="curated-music-copy"><span>MANUAL MUSIC NOTEBOOK</span></div>
        <div className="curated-music-count">
          <strong>{songCount}</strong>
          <span>首手选歌曲</span>
        </div>
      </section>

      <div className="curated-music-toolbar">
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
        {token ? (
          <div className="curated-manager-actions">
            <button type="button" className="btn curated-secondary-button" onClick={leaveManager}>退出管理</button>
            <button type="button" className="btn btn-primary" onClick={publish} disabled={!dirty || saveStatus === 'saving'}>
              <i className={`fas ${saveStatus === 'saving' ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`} />
              {saveStatus === 'saving' ? '正在发布' : dirty ? '保存并发布' : '已保存'}
            </button>
          </div>
        ) : (
          <button type="button" className="btn curated-manage-button" onClick={() => { setLoginError(''); setLoginOpen(true) }}>
            <i className="fas fa-pen" /> 管理歌单
          </button>
        )}
      </div>

      {notice && <div className={`curated-notice ${saveStatus === 'error' ? 'is-error' : ''}`} role="status">
        <i className={`fas ${saveStatus === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} /> {notice}
        <button type="button" onClick={() => setNotice('')} aria-label="关闭提示"><i className="fas fa-times" /></button>
      </div>}

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
                {token && <button type="button" className="btn curated-add-button" onClick={() => openNewSong(category.id)}>
                  <i className="fas fa-plus" /> 添加歌曲
                </button>}
              </header>

              {category.items.length ? (
                <div className="curated-song-grid">
                  {category.items.map((song, index) => token ? (
                    <div className="curated-song curated-song-editable" key={song.id || `${song.name}-${index}`}>
                      <span className="curated-song-number">{String(index + 1).padStart(2, '0')}</span>
                      {song.cover
                        ? <img src={song.cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        : <span className="curated-song-fallback"><i className="fas fa-music" /></span>}
                      <span className="curated-song-copy">
                        <strong>{song.name}</strong>
                        <small>{song.artist || '未知歌手'}{song.album ? ` · ${song.album}` : ''}</small>
                        {song.note && <em>{song.note}</em>}
                      </span>
                      <span className="curated-song-actions">
                        <button type="button" onClick={() => openExistingSong(song, category.id)} aria-label={`编辑《${song.name}》`}><i className="fas fa-pen" /></button>
                        <button type="button" onClick={() => removeSong(song, category.id)} aria-label={`删除《${song.name}》`}><i className="fas fa-trash" /></button>
                      </span>
                    </div>
                  ) : (
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
                  <span>{query ? '换个关键词试试' : token ? '点击上方“添加歌曲”' : '等待下一首歌'}</span>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} onLogin={enterManager} status={loginStatus} error={loginError} />}
      {songDialog && <SongDialog categories={categories} initialSong={songDialog.song} onClose={() => setSongDialog(null)} onSubmit={saveSongLocally} />}
    </div>
  )
}
