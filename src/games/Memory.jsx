import { useState, useEffect, useRef } from 'react'

const EMOJIS = ['🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐙', '🦄', '🐧', '🐢']
const BEST_KEY = 'memory_best_moves'

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeDeck(pairs) {
  const chosen = shuffle(EMOJIS).slice(0, pairs)
  return shuffle([...chosen, ...chosen]).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
}

export default function Memory() {
  const [pairs, setPairs] = useState(6)
  const [cards, setCards] = useState(() => makeDeck(6))
  const [flipped, setFlipped] = useState([])
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const lock = useRef(false)

  const reset = (p = pairs) => {
    setCards(makeDeck(p)); setFlipped([]); setMoves(0); setWon(false)
    setSeconds(0); setRunning(false); lock.current = false
  }

  useEffect(() => { reset(pairs) /* eslint-disable-next-line */ }, [pairs])

  useEffect(() => {
    if (!running || won) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [running, won])

  const flip = (idx) => {
    if (lock.current) return
    const card = cards[idx]
    if (card.flipped || card.matched) return
    if (!running) setRunning(true)
    const nc = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c)
    setCards(nc)
    const nf = [...flipped, idx]
    setFlipped(nf)
    if (nf.length === 2) {
      setMoves(m => m + 1)
      lock.current = true
      const [a, b] = nf
      if (nc[a].emoji === nc[b].emoji) {
        setTimeout(() => {
          setCards(cs => cs.map((c, i) => (i === a || i === b) ? { ...c, matched: true } : c))
          setFlipped([]); lock.current = false
        }, 350)
      } else {
        setTimeout(() => {
          setCards(cs => cs.map((c, i) => (i === a || i === b) ? { ...c, flipped: false } : c))
          setFlipped([]); lock.current = false
        }, 800)
      }
    }
  }

  useEffect(() => {
    if (cards.length && cards.every(c => c.matched)) {
      setWon(true); setRunning(false)
      setBest(b => {
        const nb = (b === 0 || moves < b) ? moves : b
        localStorage.setItem(BEST_KEY, nb); return nb
      })
    }
  }, [cards, moves])

  const cols = pairs <= 6 ? 4 : pairs <= 8 ? 4 : 6

  return (
    <div className="memory-game">
      <div className="game-scorebar">
        <div className="score-box"><span>步数</span><strong>{moves}</strong></div>
        <div className="score-box"><span>用时</span><strong>{seconds}s</strong></div>
        <div className="score-box"><span>最佳步数</span><strong>{best || '—'}</strong></div>
        <select className="sort-select" value={pairs} onChange={e => setPairs(Number(e.target.value))}>
          <option value={6}>简单 · 6 对</option>
          <option value={8}>普通 · 8 对</option>
          <option value={12}>困难 · 12 对</option>
        </select>
        <button className="btn btn-sm btn-primary" onClick={() => reset()}><i className="fas fa-redo" /> 重玩</button>
      </div>
      <div className="memory-board" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: cols === 6 ? '520px' : '400px' }}>
        {cards.map((c, i) => (
          <button
            key={c.id}
            className={`memory-card${c.flipped || c.matched ? ' flipped' : ''}${c.matched ? ' matched' : ''}`}
            onClick={() => flip(i)}
            aria-label="翻牌"
          >
            <span className="memory-face front"><i className="fas fa-question" /></span>
            <span className="memory-face back">{c.emoji}</span>
          </button>
        ))}
      </div>
      {won && (
        <div className="game-banner success">
          🎉 全部配对成功！用了 <strong>{moves}</strong> 步、<strong>{seconds}</strong> 秒
          <button className="btn btn-sm btn-primary" onClick={() => reset()}>再来一次</button>
        </div>
      )}
      <p className="game-hint">翻开两张相同的卡牌即可消除，用最少步数完成挑战～</p>
    </div>
  )
}
