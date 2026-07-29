import { useState, useEffect, useRef, useCallback } from 'react'

const N = 17
const BEST_KEY = 'snake_best'
const START = [{ x: 8, y: 8 }]

function randFood(snake) {
  while (true) {
    const f = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }
    if (!snake.some(s => s.x === f.x && s.y === f.y)) return f
  }
}

export default function Snake() {
  const [snake, setSnake] = useState(START)
  const [food, setFood] = useState(() => randFood(START))
  const [dir, setDir] = useState({ x: 1, y: 0 })
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const dirRef = useRef(dir)
  const queued = useRef([])

  const reset = () => {
    setSnake(START); setFood(randFood(START)); setDir({ x: 1, y: 0 })
    dirRef.current = { x: 1, y: 0 }; queued.current = []
    setScore(0); setOver(false); setRunning(true)
  }

  const turn = useCallback((nd) => {
    const last = queued.current.length ? queued.current[queued.current.length - 1] : dirRef.current
    if (nd.x === -last.x && nd.y === -last.y) return // 不能掉头
    if (nd.x === last.x && nd.y === last.y) return
    queued.current.push(nd)
    if (!running && !over) setRunning(true)
  }, [running, over])

  useEffect(() => {
    const onKey = (e) => {
      const map = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      }
      if (map[e.key]) { e.preventDefault(); turn(map[e.key]) }
      if (e.key === ' ') { e.preventDefault(); setRunning(r => !r) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn])

  useEffect(() => {
    if (!running || over) return
    const speed = Math.max(70, 150 - score * 3)
    const id = setInterval(() => {
      setSnake(prev => {
        let d = dirRef.current
        if (queued.current.length) { d = queued.current.shift(); dirRef.current = d; setDir(d) }
        const head = { x: prev[0].x + d.x, y: prev[0].y + d.y }
        if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N ||
            prev.some(s => s.x === head.x && s.y === head.y)) {
          setOver(true); setRunning(false)
          setBest(b => { const nb = Math.max(b, score); localStorage.setItem(BEST_KEY, nb); return nb })
          return prev
        }
        const nsnake = [head, ...prev]
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 1)
          setFood(randFood(nsnake))
        } else {
          nsnake.pop()
        }
        return nsnake
      })
    }, speed)
    return () => clearInterval(id)
  }, [running, over, food, score])

  const cells = []
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const isHead = snake[0].x === x && snake[0].y === y
      const isBody = !isHead && snake.some(s => s.x === x && s.y === y)
      const isFood = food.x === x && food.y === y
      cells.push(
        <div key={`${x}-${y}`} className={`snake-cell${isHead ? ' head' : ''}${isBody ? ' body' : ''}${isFood ? ' food' : ''}`}>
          {isHead && <span className="snake-ai-mark">◎</span>}
          {(isBody || isFood) && <span className={`context-token${isBody ? ' body-token' : ''}`}>2k</span>}
        </div>
      )
    }

  return (
    <div className="snake-game">
      <div className="game-theme-note chatgpt-note">
        <span className="brand-orb openai-orb">◎</span>
        <div><strong>ChatGPT 上下文</strong><small>每个方块都是 2k 上下文，别让对话撞上长度限制。</small></div>
      </div>
      <div className="game-scorebar">
        <div className="score-box"><span>上下文块</span><strong>{snake.length}</strong></div>
        <div className="score-box"><span>当前上下文</span><strong>{score * 2}k</strong></div>
        <div className="score-box"><span>最长上下文</span><strong>{best * 2}k</strong></div>
        <button className="btn btn-sm btn-primary" onClick={reset}>
          <i className="fas fa-redo" /> {over ? '重来' : '重开'}
        </button>
      </div>
      <div className="snake-board" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
        {cells}
        {!running && !over && snake.length === 1 && (
          <div className="game-overlay"><div>
            <h3>◎ ChatGPT 上下文</h3>
            <p>吃掉 2k 上下文块；方向键 / WASD 控制，空格暂停</p>
            <button className="btn btn-sm btn-primary" onClick={reset}>开始</button>
          </div></div>
        )}
        {over && (
          <div className="game-overlay"><div>
            <h3>💥 上下文已丢失</h3>
            <p>你的 AI 忘记了所有上下文。此前记住了 <strong>{score * 2}k</strong>。</p>
            <button className="btn btn-sm btn-primary" onClick={reset}>再来一局</button>
          </div></div>
        )}
        {running && (
          <button className="snake-pause" onClick={() => setRunning(false)} aria-label="暂停">
            <i className="fas fa-pause" />
          </button>
        )}
      </div>
      <div className="dpad">
        <button onClick={() => turn({ x: 0, y: -1 })} aria-label="上"><i className="fas fa-chevron-up" /></button>
        <div className="dpad-mid">
          <button onClick={() => turn({ x: -1, y: 0 })} aria-label="左"><i className="fas fa-chevron-left" /></button>
          <button onClick={() => setRunning(r => !r)} aria-label="暂停/继续"><i className={`fas ${running ? 'fa-pause' : 'fa-play'}`} /></button>
          <button onClick={() => turn({ x: 1, y: 0 })} aria-label="右"><i className="fas fa-chevron-right" /></button>
        </div>
        <button onClick={() => turn({ x: 0, y: 1 })} aria-label="下"><i className="fas fa-chevron-down" /></button>
      </div>
      <p className="game-hint">每吃一个方块获得 2k 上下文；撞墙或撞到自己时，AI 会忘记全部上下文。</p>
    </div>
  )
}
