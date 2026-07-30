import { useState, useEffect, useRef } from 'react'
import { creditGameReward } from './aiEconomy'

const LEVELS = {
  easy: { rows: 9, cols: 9, mines: 10, label: '初级 9×9' },
  medium: { rows: 12, cols: 12, mines: 24, label: '中级 12×12' },
  hard: { rows: 14, cols: 16, mines: 45, label: '高级 14×16' },
}
const NUM_COLORS = ['', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#b45309', '#0891b2', '#0f172a', '#64748b']

function buildBoard(rows, cols, mines, safeR, safeC) {
  const board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }))
  )
  let placed = 0
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)
    if (board[r][c].mine) continue
    if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue // 首点周围留白
    board[r][c].mine = true; placed++
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue
      let n = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) n++
        }
      board[r][c].count = n
    }
  return board
}

export default function Minesweeper() {
  const [level, setLevel] = useState('easy')
  const cfg = LEVELS[level]
  const [board, setBoard] = useState(null)
  const [status, setStatus] = useState('idle') // idle | playing | won | lost
  const [flags, setFlags] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [reward, setReward] = useState(0)
  const timer = useRef(null)
  const rewarded = useRef(false)

  const reset = () => {
    setBoard(null); setStatus('idle'); setFlags(0); setSeconds(0); setReward(0); rewarded.current = false
    clearInterval(timer.current)
  }
  useEffect(() => { reset() /* eslint-disable-next-line */ }, [level])

  useEffect(() => {
    if (status === 'playing') {
      timer.current = setInterval(() => setSeconds(s => s + 1), 1000)
      return () => clearInterval(timer.current)
    }
  }, [status])

  const flood = (b, r, c) => {
    const stack = [[r, c]]
    while (stack.length) {
      const [cr, cc] = stack.pop()
      const cell = b[cr][cc]
      if (cell.revealed || cell.flagged) continue
      cell.revealed = true
      if (cell.count === 0 && !cell.mine) {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = cr + dr, nc = cc + dc
            if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols && !b[nr][nc].revealed)
              stack.push([nr, nc])
          }
      }
    }
  }

  const checkWin = (b) => {
    for (let r = 0; r < cfg.rows; r++)
      for (let c = 0; c < cfg.cols; c++)
        if (!b[r][c].mine && !b[r][c].revealed) return false
    return true
  }

  const reveal = (r, c) => {
    if (status === 'won' || status === 'lost') return
    let b = board
    if (!b) { b = buildBoard(cfg.rows, cfg.cols, cfg.mines, r, c); setStatus('playing') }
    else b = b.map(row => row.map(cell => ({ ...cell })))
    const cell = b[r][c]
    if (cell.revealed || cell.flagged) return
    if (cell.mine) {
      b.forEach(row => row.forEach(cc => { if (cc.mine) cc.revealed = true }))
      setBoard(b); setStatus('lost'); clearInterval(timer.current); return
    }
    flood(b, r, c)
    if (checkWin(b)) {
      b.forEach(row => row.forEach(cc => { if (cc.mine) cc.flagged = true }))
      setBoard(b); setStatus('won'); clearInterval(timer.current)
      setFlags(cfg.mines)
      if (!rewarded.current) {
        rewarded.current = true
        const baseReward = { easy: 1800, medium: 4200, hard: 9000 }[level]
        const computeReward = Math.max(Math.round(baseReward * .55), baseReward - seconds * 8)
        creditGameReward({ compute: computeReward })
        setReward(computeReward)
      }
      return
    }
    setBoard(b)
  }

  const toggleFlag = (e, r, c) => {
    e.preventDefault()
    if (!board || status === 'won' || status === 'lost') return
    const b = board.map(row => row.map(cell => ({ ...cell })))
    const cell = b[r][c]
    if (cell.revealed) return
    cell.flagged = !cell.flagged
    setBoard(b)
    setFlags(b.flat().filter(c => c.flagged).length)
  }

  const rows = cfg.rows, cols = cfg.cols
  const display = board || Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, count: 0 })))

  return (
    <div className="mine-game">
      <div className="game-theme-note claude-note">
        <span className="brand-orb anthropic-orb">A\</span>
        <div><strong>Claude A\ 封号排查</strong><small>每个方块代表一个 IP，数字表示周围有多少个风控 IP。</small></div>
      </div>
      <div className="game-scorebar">
        <div className="score-box"><span>⚠️ 待排查 IP</span><strong>{cfg.mines - flags}</strong></div>
        <div className="score-box"><span>⏱ 排查用时</span><strong>{seconds}s</strong></div>
        <div className="score-box">
          <span>账号状态</span>
          <strong>{status === 'won' ? '✅ 安全' : status === 'lost' ? 'A\\ 已风控' : '🙂 正常'}</strong>
        </div>
        <select className="sort-select" value={level} onChange={e => setLevel(e.target.value)}>
          {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="btn btn-sm btn-primary" onClick={reset}><i className="fas fa-redo" /> 重开</button>
      </div>
      <div className="mine-board-wrap">
        <div className="mine-board" style={{ '--mine-cols': cols }}>
          {display.map((row, r) => row.map((cell, c) => {
            const cls = ['mine-cell']
            if (cell.revealed) cls.push('revealed')
            if (cell.revealed && cell.mine) cls.push('boom')
            return (
              <button
                key={`${r}-${c}`}
                className={cls.join(' ')}
                onClick={() => reveal(r, c)}
                onContextMenu={(e) => toggleFlag(e, r, c)}
                title={`IP 10.${level === 'easy' ? 10 : level === 'medium' ? 20 : 30}.${r + 1}.${c + 1}`}
                aria-label={`选择 IP 10.${level === 'easy' ? 10 : level === 'medium' ? 20 : 30}.${r + 1}.${c + 1}`}
                style={cell.revealed && !cell.mine && cell.count ? { color: NUM_COLORS[cell.count] } : undefined}
              >
                {cell.revealed
                  ? (cell.mine ? 'A\\' : cell.count || '')
                  : (cell.flagged ? '🛡️' : '')}
              </button>
            )
          }))}
        </div>
      </div>
      {status === 'lost' && <div className="game-banner danger">你访问了危险 IP，账号已经被 A\ 风控。</div>}
      {status === 'won' && <div className="game-banner success">排查完成！所有危险 IP 都已隔离，获得 <strong>◈ {reward.toLocaleString()} 算力点</strong>。</div>}
      <p className="game-hint">点击方块选择对应 IP；数字代表周围风控 IP 数量。右键可用 🛡️ 标记可疑地址。</p>
    </div>
  )
}
