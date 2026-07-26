import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useScrollReveal } from '../hooks/useScrollReveal'
import Game2048 from '../games/Game2048'
import Snake from '../games/Snake'
import Memory from '../games/Memory'
import Minesweeper from '../games/Minesweeper'
import TicTacToe from '../games/TicTacToe'
import ReactionTest from '../games/ReactionTest'
import WhackAMole from '../games/WhackAMole'

function AS({ children, d = 0 }) {
  const [ref, show] = useScrollReveal(0.05)
  return <div ref={ref} className={`reveal${show ? ' visible' : ''}`} style={{ transitionDelay: `${d}s` }}>{children}</div>
}

const GAMES = [
  { id: '2048', name: '2048', emoji: '🔢', desc: '滑动合并数字，冲击 2048 方块', tag: '益智', bg: 'linear-gradient(135deg, #667eea, #764ba2)', Comp: Game2048 },
  { id: 'snake', name: '贪吃蛇', emoji: '🐍', desc: '经典贪吃蛇，越吃越快越长', tag: '街机', bg: 'linear-gradient(135deg, #11998e, #38ef7d)', Comp: Snake },
  { id: 'memory', name: '记忆翻牌', emoji: '🃏', desc: '翻开相同图案配对消除', tag: '记忆', bg: 'linear-gradient(135deg, #fc466b, #3f5efb)', Comp: Memory },
  { id: 'mine', name: '扫雷', emoji: '💣', desc: '推理雷区，标记所有地雷', tag: '推理', bg: 'linear-gradient(135deg, #f7971e, #ffd200)', Comp: Minesweeper },
  { id: 'ttt', name: '井字棋', emoji: '⭕', desc: '挑战永不失误的 AI 对手', tag: '对战', bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', Comp: TicTacToe },
  { id: 'reaction', name: '反应测试', emoji: '⚡', desc: '测测你的手速有多快', tag: '休闲', bg: 'linear-gradient(135deg, #fa709a, #fee140)', Comp: ReactionTest },
  { id: 'whack', name: '打地鼠', emoji: '🔨', desc: '30 秒疯狂敲击，小心炸弹', tag: '街机', bg: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', Comp: WhackAMole },
]

export default function Games() {
  const [active, setActive] = useState(null)
  const topRef = useRef(null)
  const location = useLocation()

  // 点击导航栏"小游戏"时回到游戏厅（进入游戏只改内部 state、不改路由，所以不会误触发）
  useEffect(() => { setActive(null) }, [location.key])

  useEffect(() => {
    if (active && topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [active])

  if (active) {
    const game = GAMES.find(g => g.id === active)
    const Comp = game.Comp
    return (
      <div className="page" ref={topRef}>
        <div className="section-header">
          <h1><span style={{ marginRight: '0.4rem' }}>{game.emoji}</span>{game.name}</h1>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>
            <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setActive(null)}>
              <i className="fas fa-arrow-left" /> 返回游戏厅
            </span>
            {' · '}<span>{game.desc}</span>
          </p>
          <div className="section-line" />
        </div>
        <div className="game-stage">
          <Comp />
        </div>
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <button className="btn btn-sm btn-outline" onClick={() => setActive(null)}>
            <i className="fas fa-th-large" /> 返回游戏厅
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <AS>
        <div className="section-header">
          <h1><i className="fas fa-dice" style={{ color: 'var(--primary)' }} /> 小游戏厅</h1>
          <p>{GAMES.length} 款纯浏览器小游戏，无需下载，随点随玩 🎮 成绩会存在本地</p>
          <div className="section-line" />
        </div>
      </AS>
      <div className="games-grid">
        {GAMES.map((g, i) => (
          <AS key={g.id} d={i * 0.06}>
            <button className="game-card" onClick={() => setActive(g.id)}>
              <div className="game-card-head" style={{ background: g.bg }}>
                <span className="game-card-emoji">{g.emoji}</span>
                <span className="game-card-tag">{g.tag}</span>
              </div>
              <div className="game-card-body">
                <h3>{g.name}</h3>
                <p>{g.desc}</p>
                <span className="card-link">开始游戏 <i className="fas fa-arrow-right" /></span>
              </div>
            </button>
          </AS>
        ))}
      </div>
    </div>
  )
}
