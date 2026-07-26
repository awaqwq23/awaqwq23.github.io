import { useState, useEffect, useRef } from 'react'

const HOLES = 9
const GAME_TIME = 30
const BEST_KEY = 'whack_best'

export default function WhackAMole() {
  const [active, setActive] = useState(-1)
  const [bombActive, setBombActive] = useState(false)
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(GAME_TIME)
  const [running, setRunning] = useState(false)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const [hit, setHit] = useState(-1)
  const moleTimer = useRef(null)
  const countdown = useRef(null)

  const start = () => {
    setScore(0); setTime(GAME_TIME); setRunning(true); setActive(-1)
  }

  useEffect(() => {
    if (!running) return
    countdown.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(countdown.current)
          setRunning(false)
          setActive(-1)
          setBest(b => { setScore(sc => { const nb = Math.max(b, sc); localStorage.setItem(BEST_KEY, nb); return sc }); return b })
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(countdown.current)
  }, [running])

  useEffect(() => {
    if (!running) return
    const pop = () => {
      const next = Math.floor(Math.random() * HOLES)
      setActive(next)
      setBombActive(Math.random() < 0.22)
      const life = 550 + Math.random() * 650
      moleTimer.current = setTimeout(pop, life)
    }
    pop()
    return () => clearTimeout(moleTimer.current)
  }, [running])

  useEffect(() => {
    if (!running && score > 0) {
      setBest(b => { const nb = Math.max(b, score); localStorage.setItem(BEST_KEY, nb); return nb })
    }
  }, [running]) // eslint-disable-line

  const whack = (i) => {
    if (!running || i !== active) return
    setHit(i); setTimeout(() => setHit(-1), 180)
    if (bombActive) { setScore(s => Math.max(0, s - 3)) }
    else { setScore(s => s + 1) }
    setActive(-1)
  }

  return (
    <div className="whack-game">
      <div className="game-scorebar">
        <div className="score-box"><span>得分</span><strong>{score}</strong></div>
        <div className="score-box"><span>剩余</span><strong>{time}s</strong></div>
        <div className="score-box"><span>最高</span><strong>{best}</strong></div>
        <button className="btn btn-sm btn-primary" onClick={start} disabled={running}>
          <i className="fas fa-play" /> {running ? '进行中…' : '开始'}
        </button>
      </div>
      <div className="whack-board">
        {Array.from({ length: HOLES }).map((_, i) => (
          <button key={i} className="whack-hole" onClick={() => whack(i)} aria-label="地洞">
            <span className="whack-dirt" />
            <span className={`whack-mole${active === i ? (bombActive ? ' bomb' : ' up') : ''}${hit === i ? ' hit' : ''}`}>
              {active === i ? (bombActive ? '💣' : '🐹') : ''}
            </span>
          </button>
        ))}
        {!running && (
          <div className="game-overlay"><div>
            <h3>{time === 0 ? '⏰ 时间到！' : '🔨 打地鼠'}</h3>
            <p>{time === 0 ? <>本局得分 <strong>{score}</strong></> : '30 秒内敲打地鼠，别敲炸弹（-3）！'}</p>
            <button className="btn btn-sm btn-primary" onClick={start}>{time === 0 ? '再来一局' : '开始游戏'}</button>
          </div></div>
        )}
      </div>
      <p className="game-hint">🐹 +1 分，💣 -3 分。30 秒内尽可能拿高分！</p>
    </div>
  )
}
