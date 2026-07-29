import { useEffect, useRef, useState } from 'react'
import { COMPANY_LOGO_URL } from './companyCatalog'

const GAME_SECONDS = 5
const BEST_KEY = 'sepa_token_clicker_best'

export default function TokenClicker() {
  const [phase, setPhase] = useState('idle')
  const [clicks, setClicks] = useState(0)
  const [remaining, setRemaining] = useState(GAME_SECONDS)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const [popups, setPopups] = useState([])
  const deadline = useRef(0)
  const interval = useRef(null)
  const popupId = useRef(0)

  const finish = () => {
    clearInterval(interval.current)
    setPhase('done')
    setRemaining(0)
    setBest(previous => {
      const next = Math.max(previous, clicks)
      localStorage.setItem(BEST_KEY, next)
      return next
    })
  }

  const start = () => {
    clearInterval(interval.current)
    setClicks(0)
    setPopups([])
    setRemaining(GAME_SECONDS)
    deadline.current = performance.now() + GAME_SECONDS * 1000
    setPhase('running')
  }

  useEffect(() => {
    if (phase !== 'running') return undefined
    interval.current = setInterval(() => {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000)
      setRemaining(left)
      if (left <= 0) {
        clearInterval(interval.current)
        setPhase('done')
      }
    }, 40)
    return () => clearInterval(interval.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'done') return
    setBest(previous => {
      const next = Math.max(previous, clicks)
      localStorage.setItem(BEST_KEY, next)
      return next
    })
  }, [phase, clicks])

  useEffect(() => () => clearInterval(interval.current), [])

  const claim = (event) => {
    if (phase !== 'running') return
    if (performance.now() >= deadline.current) {
      finish()
      return
    }
    setClicks(value => value + 1)
    const rect = event.currentTarget.getBoundingClientRect()
    const id = ++popupId.current
    const popup = {
      id,
      x: event.clientX ? event.clientX - rect.left : rect.width / 2,
      y: event.clientY ? event.clientY - rect.top : rect.height / 2,
    }
    setPopups(items => [...items.slice(-7), popup])
    setTimeout(() => setPopups(items => items.filter(item => item.id !== id)), 650)
  }

  return (
    <div className="token-clicker-game">
      <div className="game-theme-note sepa-note">
        <span className="brand-duo">
          <span className="sepa-chip">SEPA</span>
          <img src={COMPANY_LOGO_URL('anthropic')} alt="Anthropic" />
        </span>
        <div><strong>SEPA 薅 Claude 手速测试</strong><small>限时 5 秒，每点击一次获得 A\ 1k Token。</small></div>
      </div>

      <div className="game-scorebar">
        <div className="score-box"><span>剩余时间</span><strong>{remaining.toFixed(1)}s</strong></div>
        <div className="score-box"><span>本局获得</span><strong>{clicks}k Token</strong></div>
        <div className="score-box"><span>历史最高</span><strong>{best}k Token</strong></div>
      </div>

      <div className="token-clicker-stage">
        {phase === 'running' ? (
          <button className="token-claim-button" onClick={claim}>
            <img src={COMPANY_LOGO_URL('anthropic')} alt="" draggable="false" />
            <strong>薅 A\ 1k Token</strong>
            <small>快点！只剩 {remaining.toFixed(1)} 秒</small>
            {popups.map(popup => (
              <span
                className="token-click-popup"
                key={popup.id}
                style={{ left: popup.x, top: popup.y }}
              >
                你薅了 A\ 1k Token
              </span>
            ))}
          </button>
        ) : (
          <div className="game-overlay token-clicker-overlay">
            <div>
              <h3>{phase === 'done' ? '💳 本轮结算' : '💳 SEPA 手速测试'}</h3>
              <p>
                {phase === 'done'
                  ? <>你用 SEPA 薅到了 <strong>A\ {clicks}k Token</strong></>
                  : '模拟前几天的 SEPA 支付薅 Claude：5 秒内尽可能多点。'}
              </p>
              <button className="btn btn-sm btn-primary" onClick={start}>
                {phase === 'done' ? '再薅一次' : '开始 5 秒挑战'}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="game-hint">娱乐小游戏：每次有效点击都会显示“你薅了 A\ 1k Token”，5 秒后自动结算。</p>
    </div>
  )
}
