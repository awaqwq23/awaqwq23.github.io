import { useState, useEffect, useRef } from 'react'
import { COMPANY_LOGO_URL } from './companyCatalog'
import { creditGameReward } from './aiEconomy'

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
  const [reward, setReward] = useState(0)
  const moleTimer = useRef(null)
  const countdown = useRef(null)
  const rewarded = useRef(false)

  const start = () => {
    setScore(0); setTime(GAME_TIME); setRunning(true); setActive(-1); setReward(0); rewarded.current = false
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
    if (!running && time === 0 && score > 0) {
      setBest(b => { const nb = Math.max(b, score); localStorage.setItem(BEST_KEY, nb); return nb })
      if (!rewarded.current) {
        rewarded.current = true
        const computeReward = 400 + score * 150
        creditGameReward({ compute: computeReward })
        setReward(computeReward)
      }
    }
  }, [running, score, time])

  const whack = (i) => {
    if (!running || i !== active) return
    setHit(i); setTimeout(() => setHit(-1), 180)
    if (bombActive) { setScore(s => Math.max(0, s - 3)) }
    else { setScore(s => s + 1) }
    setActive(-1)
  }

  return (
    <div className="whack-game">
      <div className="game-theme-note whack-ai-note">
        <span className="brand-duo">
          <img src={COMPANY_LOGO_URL('anthropic')} alt="Anthropic" />
          <img src={COMPANY_LOGO_URL('deepseek')} alt="DeepSeek" />
        </span>
        <div><strong>打 A\</strong><small>Claude 的公司标志加分，DeepSeek 标志扣分。</small></div>
      </div>
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
          <button key={i} className="whack-hole" onClick={() => whack(i)} aria-label="AI 标志">
            <span className="whack-dirt" />
            <span className={`whack-mole${active === i ? (bombActive ? ' bomb' : ' up') : ''}${hit === i ? ' hit' : ''}`}>
              {active === i && (
                <span className={`whack-brand ${bombActive ? 'deepseek' : 'anthropic'}`}>
                  <img
                    src={COMPANY_LOGO_URL(bombActive ? 'deepseek' : 'anthropic')}
                    alt={bombActive ? 'DeepSeek' : 'Anthropic'}
                  />
                  <small>{bombActive ? 'DeepSeek' : 'Claude'}</small>
                </span>
              )}
            </span>
          </button>
        ))}
        {!running && (
          <div className="game-overlay"><div>
            <h3>{time === 0 ? '⏰ 时间到！' : '🔨 打 A\\'}</h3>
            <p>{time === 0 ? <>本局得分 <strong>{score}</strong></> : '30 秒内敲 Claude（+1），别误敲 DeepSeek（-3）！'}</p>
            {reward > 0 && <p>已获得 <strong>◈ {reward} 算力点</strong></p>}
            <button className="btn btn-sm btn-primary" onClick={start}>{time === 0 ? '再来一局' : '开始游戏'}</button>
          </div></div>
        )}
      </div>
      <p className="game-hint">Claude A\ +1 分，DeepSeek -3 分。玩法和原来的打地鼠完全一样。</p>
    </div>
  )
}
