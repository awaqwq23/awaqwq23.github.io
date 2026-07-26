import { useState, useEffect } from 'react'

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function winner(b) {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { player: b[a], line: [a, c, d] }
  }
  return null
}

// AI = O, 玩家 = X。minimax 让 O 分数最大。
function minimax(b, isMax, depth) {
  const w = winner(b)
  if (w) return w.player === 'O' ? 10 - depth : depth - 10
  if (b.every(Boolean)) return 0
  const scores = []
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      b[i] = isMax ? 'O' : 'X'
      scores.push(minimax(b, !isMax, depth + 1))
      b[i] = null
    }
  }
  return isMax ? Math.max(...scores) : Math.min(...scores)
}

function bestMove(b, hard) {
  const empties = b.map((v, i) => v ? null : i).filter(i => i !== null)
  if (!hard && Math.random() < 0.45) return empties[Math.floor(Math.random() * empties.length)]
  let best = -Infinity, move = empties[0]
  for (const i of empties) {
    b[i] = 'O'
    const s = minimax(b, false, 0)
    b[i] = null
    if (s > best) { best = s; move = i }
  }
  return move
}

const STORE = 'ttt_stats'

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [turn, setTurn] = useState('X')
  const [hard, setHard] = useState(true)
  const [stats, setStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE)) || { win: 0, lose: 0, draw: 0 } }
    catch { return { win: 0, lose: 0, draw: 0 } }
  })

  const result = winner(board)
  const full = board.every(Boolean)
  const done = result || full

  useEffect(() => {
    if (turn === 'O' && !done) {
      const id = setTimeout(() => {
        setBoard(prev => {
          if (winner(prev) || prev.every(Boolean)) return prev
          const b = prev.slice()
          b[bestMove(b, hard)] = 'O'
          return b
        })
        setTurn('X')
      }, 380)
      return () => clearTimeout(id)
    }
  }, [turn, done, hard])

  useEffect(() => {
    if (!done) return
    setStats(s => {
      const ns = { ...s }
      if (result?.player === 'X') ns.win++
      else if (result?.player === 'O') ns.lose++
      else ns.draw++
      localStorage.setItem(STORE, JSON.stringify(ns))
      return ns
    })
    // eslint-disable-next-line
  }, [done])

  const play = (i) => {
    if (board[i] || done || turn !== 'X') return
    const b = board.slice(); b[i] = 'X'; setBoard(b); setTurn('O')
  }
  const reset = () => { setBoard(Array(9).fill(null)); setTurn('X') }

  return (
    <div className="ttt-game">
      <div className="game-scorebar">
        <div className="score-box"><span>你赢</span><strong>{stats.win}</strong></div>
        <div className="score-box"><span>平局</span><strong>{stats.draw}</strong></div>
        <div className="score-box"><span>AI 赢</span><strong>{stats.lose}</strong></div>
        <select className="sort-select" value={hard ? 'hard' : 'easy'} onChange={e => { setHard(e.target.value === 'hard'); reset() }}>
          <option value="hard">地狱难度（必平）</option>
          <option value="easy">简单（会手滑）</option>
        </select>
        <button className="btn btn-sm btn-primary" onClick={reset}><i className="fas fa-redo" /> 重开</button>
      </div>
      <div className="ttt-board">
        {board.map((v, i) => (
          <button
            key={i}
            className={`ttt-cell${result?.line.includes(i) ? ' win' : ''}${v ? ` ${v.toLowerCase()}` : ''}`}
            onClick={() => play(i)}
            disabled={!!v || !!done || turn !== 'X'}
          >
            {v === 'X' && <i className="fas fa-times" />}
            {v === 'O' && <i className="far fa-circle" />}
          </button>
        ))}
      </div>
      <div className={`game-banner${result?.player === 'X' ? ' success' : result?.player === 'O' ? ' danger' : ''}`} style={{ visibility: done ? 'visible' : 'hidden' }}>
        {result?.player === 'X' && '🎉 你赢啦！'}
        {result?.player === 'O' && '🤖 AI 赢了，再战一局？'}
        {!result && full && '🤝 平局！势均力敌'}
        <button className="btn btn-sm btn-primary" onClick={reset}>再来</button>
      </div>
      <p className="game-hint">你执 ✕ 先手，AI 执 ○。地狱难度下最好的结果就是平局哦～</p>
    </div>
  )
}
