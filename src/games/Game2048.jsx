import { useState, useEffect, useCallback, useRef } from 'react'

const SIZE = 4
const BEST_KEY = 'game2048_best'

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function addRandom(grid) {
  const empty = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 0) empty.push([r, c])
  if (!empty.length) return grid
  const [r, c] = pick(empty)
  const g = grid.map(row => row.slice())
  g[r][c] = Math.random() < 0.9 ? 2 : 4
  return g
}

function slide(row) {
  const nums = row.filter(n => n !== 0)
  let gained = 0
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) {
      nums[i] *= 2
      gained += nums[i]
      nums.splice(i + 1, 1)
    }
  }
  while (nums.length < SIZE) nums.push(0)
  return [nums, gained]
}

function rotate(grid) {
  const g = emptyGrid()
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      g[c][SIZE - 1 - r] = grid[r][c]
  return g
}

function move(grid, dir) {
  // 统一转成"向左滑"，旋转后处理再转回来
  let g = grid.map(row => row.slice())
  const rotations = { left: 0, up: 3, right: 2, down: 1 }[dir]
  for (let i = 0; i < rotations; i++) g = rotate(g)
  let gained = 0
  let moved = false
  const ng = g.map(row => {
    const [nr, gain] = slide(row)
    gained += gain
    if (nr.some((v, i) => v !== row[i])) moved = true
    return nr
  })
  let out = ng
  for (let i = 0; i < (4 - rotations) % 4; i++) out = rotate(out)
  return { grid: out, gained, moved }
}

function hasMoves(grid) {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return true
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true
    }
  return false
}

const TILE_COLORS = {
  2: '#eef2ff', 4: '#e0e7ff', 8: '#c7d2fe', 16: '#a5b4fc',
  32: '#818cf8', 64: '#6366f1', 128: '#4f46e5', 256: '#4338ca',
  512: '#3730a3', 1024: '#312e81', 2048: '#1e1b4b',
}
function tileStyle(v) {
  const bg = TILE_COLORS[v] || '#1e1b4b'
  const light = v <= 4
  return {
    background: v === 0 ? 'var(--game-cell)' : bg,
    color: v === 0 ? 'transparent' : light ? '#4338ca' : '#fff',
    fontSize: v >= 1024 ? '1.1rem' : v >= 128 ? '1.35rem' : '1.6rem',
  }
}

export default function Game2048() {
  const [grid, setGrid] = useState(() => addRandom(addRandom(emptyGrid())))
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const touch = useRef(null)

  const reset = () => {
    setGrid(addRandom(addRandom(emptyGrid())))
    setScore(0); setOver(false); setWon(false)
  }

  const doMove = useCallback((dir) => {
    if (over) return
    setGrid(prev => {
      const { grid: ng, gained, moved } = move(prev, dir)
      if (!moved) return prev
      const withNew = addRandom(ng)
      setScore(s => {
        const ns = s + gained
        setBest(b => { const nb = Math.max(b, ns); localStorage.setItem(BEST_KEY, nb); return nb })
        return ns
      })
      if (!won && withNew.some(row => row.some(v => v >= 2048))) setWon(true)
      if (!hasMoves(withNew)) setOver(true)
      return withNew
    })
  }, [over, won])

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        a: 'left', d: 'right', w: 'up', s: 'down' }
      const dir = map[e.key]
      if (dir) { e.preventDefault(); doMove(dir) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doMove])

  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY } }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left')
    else doMove(dy > 0 ? 'down' : 'up')
    touch.current = null
  }

  return (
    <div className="g2048">
      <div className="game-theme-note deepseek-note">
        <span className="brand-orb deepseek-orb">鲸</span>
        <div><strong>合成大银鲸</strong><small>把相同额度的 DeepSeek Token 合并，直到 2048k。</small></div>
      </div>
      <div className="game-scorebar">
        <div className="score-box"><span>你拿到了</span><strong>{score}k DeepSeek Token</strong></div>
        <div className="score-box"><span>历史最多</span><strong>{best}k DeepSeek Token</strong></div>
        <button className="btn btn-sm btn-primary" onClick={reset}><i className="fas fa-redo" /> 新游戏</button>
      </div>
      <div className="g2048-board" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {grid.map((row, r) => row.map((v, c) => (
          <div key={`${r}-${c}`} className={`g2048-tile${v ? ' filled' : ''}`} style={tileStyle(v)}>
            {v ? (
              <>
                {v >= 2048 && <span className="token-whale">🐋</span>}
                <strong>{v}k</strong>
                <small>Token</small>
              </>
            ) : ''}
          </div>
        )))}
        {(over || won) && (
          <div className="game-overlay">
            <div>
              <h3>{won ? '🐋 大银鲸合成成功！' : 'Token 池装不下了'}</h3>
              <p>你拿到了 <strong>{score}k DeepSeek Token</strong></p>
              <button className="btn btn-sm btn-primary" onClick={reset}>再来一局</button>
            </div>
          </div>
        )}
      </div>
      <p className="game-hint">方向键 / WASD 移动，手机可滑动。合并相同 Token，冲击 2048k 大银鲸！</p>
    </div>
  )
}
