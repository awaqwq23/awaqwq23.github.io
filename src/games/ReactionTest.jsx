import { useState, useRef, useEffect } from 'react'

const BEST_KEY = 'reaction_best_ms'

export default function ReactionTest() {
  const [phase, setPhase] = useState('idle') // idle | waiting | now | result | early
  const [ms, setMs] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const [history, setHistory] = useState([])
  const timer = useRef(null)
  const start = useRef(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  const begin = () => {
    setPhase('waiting')
    const delay = 1200 + Math.random() * 2600
    timer.current = setTimeout(() => {
      start.current = performance.now()
      setPhase('now')
    }, delay)
  }

  const click = () => {
    if (phase === 'idle' || phase === 'result' || phase === 'early') { begin(); return }
    if (phase === 'waiting') {
      clearTimeout(timer.current)
      setPhase('early')
      return
    }
    if (phase === 'now') {
      const t = Math.round(performance.now() - start.current)
      setMs(t)
      setHistory(h => [t, ...h].slice(0, 5))
      setBest(b => {
        const nb = (b === 0 || t < b) ? t : b
        localStorage.setItem(BEST_KEY, nb); return nb
      })
      setPhase('result')
    }
  }

  const avg = history.length ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0
  const rank = (t) =>
    t < 200 ? '⚡ 闪电反应' : t < 280 ? '🎯 非常敏捷' : t < 380 ? '👍 还不错' : t < 500 ? '🙂 正常水平' : '🐢 再练练'

  const cls = {
    idle: 'react-idle', waiting: 'react-waiting', now: 'react-now',
    result: 'react-result', early: 'react-early',
  }[phase]

  return (
    <div className="reaction-game">
      <div className="game-scorebar">
        <div className="score-box"><span>最快</span><strong>{best ? best + 'ms' : '—'}</strong></div>
        <div className="score-box"><span>近 5 次均值</span><strong>{avg ? avg + 'ms' : '—'}</strong></div>
      </div>
      <button className={`reaction-pad ${cls}`} onClick={click}>
        {phase === 'idle' && (<><i className="fas fa-bolt" /><span>点击开始</span><small>等变绿后立刻点击</small></>)}
        {phase === 'waiting' && (<><i className="fas fa-hourglass-half" /><span>等待绿色…</span><small>别急，稳住</small></>)}
        {phase === 'now' && (<><i className="fas fa-hand-pointer" /><span>点！</span></>)}
        {phase === 'result' && (<><span className="react-ms">{ms}<small>ms</small></span><span>{rank(ms)}</span><small>点击再测一次</small></>)}
        {phase === 'early' && (<><i className="fas fa-times-circle" /><span>太早啦！</span><small>点击重新开始</small></>)}
      </button>
      {history.length > 0 && (
        <div className="reaction-history">
          最近成绩：{history.map((t, i) => <span key={i} className="react-chip">{t}ms</span>)}
        </div>
      )}
      <p className="game-hint">测试你的反应速度：屏幕变绿的一瞬间点击，看看能多快！</p>
    </div>
  )
}
