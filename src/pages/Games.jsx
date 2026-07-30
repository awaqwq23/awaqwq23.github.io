import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { useScrollReveal } from '../hooks/useScrollReveal'
import Game2048 from '../games/Game2048'
import Snake from '../games/Snake'
import Memory from '../games/Memory'
import Minesweeper from '../games/Minesweeper'
import TicTacToe from '../games/TicTacToe'
import ReactionTest from '../games/ReactionTest'
import WhackAMole from '../games/WhackAMole'
import AIWorldBreakout from '../games/AIWorldBreakout'
import TokenClicker from '../games/TokenClicker'
import AITokenGacha from '../games/AITokenGacha'
import FlyingWhale from '../games/FlyingWhale'
import JoyBeanRunner from '../games/JoyBeanRunner'

function AS({ children, d = 0 }) {
  const [ref, show] = useScrollReveal(0.05)
  return <div ref={ref} className={`reveal${show ? ' visible' : ''}`} style={{ transitionDelay: `${d}s` }}>{children}</div>
}

const GAMES = [
  { id: 'ai-token-gacha', name: '算力奇点：模型抽卡', emoji: '✦', desc: '抽模型 Token、兑换算力、升级整座 AI 实验室', tag: '新作', bg: 'radial-gradient(circle at 50% 44%, #fbbf24 0 3%, #7c3aed 18%, #111827 58%, #030712)', Comp: AITokenGacha },
  { id: 'flying-whale', name: '我的大银鲸会飞', emoji: '🐋', desc: '点击跃升加分，穿过其他 AI 公司的封锁', tag: '新作', bg: 'linear-gradient(145deg, #061b3c, #2563eb 58%, #7dd3fc)', Comp: FlyingWhale },
  { id: 'joy-bean-runner', name: '震动的欢乐豆', emoji: '🫘', desc: '让豆包欢乐豆跳过其他 AI 公司，跑得更远', tag: '新作', bg: 'linear-gradient(145deg, #7c2d12, #f43f5e 54%, #fdba74)', Comp: JoyBeanRunner },
  { id: 'ai-breakout', name: 'AI 统治世界', emoji: '◎', desc: '选择 AI 挡板，击碎传统科技公司', tag: '新作', bg: 'linear-gradient(135deg, #07111f, #0e7490 55%, #10a37f)', Comp: AIWorldBreakout },
  { id: '2048', name: '合成大银鲸', emoji: '🐋', desc: '合并 DeepSeek Token，冲击 2048k 大银鲸', tag: '益智', bg: 'linear-gradient(135deg, #172554, #4d6bfe)', Comp: Game2048 },
  { id: 'snake', name: 'ChatGPT 上下文', emoji: '◎', desc: '每吃一个 2k 上下文块，记忆就更长', tag: '街机', bg: 'linear-gradient(135deg, #064e3b, #10a37f)', Comp: Snake },
  { id: 'memory', name: '互联网公司翻牌', emoji: '🏢', desc: '翻开公司商标，配对相同互联网公司', tag: '记忆', bg: 'linear-gradient(135deg, #fc466b, #3f5efb)', Comp: Memory },
  { id: 'mine', name: 'Claude A\\ 封号排查', emoji: 'A\\', desc: '逐个排查 IP，避开会触发账号风控的危险地址', tag: '风控', bg: 'linear-gradient(135deg, #292524, #d97757)', Comp: Minesweeper },
  { id: 'ttt', name: 'AI 商标井字棋', emoji: '◎', desc: 'ChatGPT 对战 Claude 或豆包', tag: '对战', bg: 'linear-gradient(135deg, #10a37f, #d97757)', Comp: TicTacToe },
  { id: 'reaction', name: '反应测试', emoji: '⚡', desc: '测测你的手速有多快', tag: '休闲', bg: 'linear-gradient(135deg, #fa709a, #fee140)', Comp: ReactionTest },
  { id: 'whack', name: '打 A\\', emoji: '🔨', desc: '敲 Claude 加分，误敲 DeepSeek 扣分', tag: '街机', bg: 'linear-gradient(135deg, #d97757, #4d6bfe)', Comp: WhackAMole },
  { id: 'token-clicker', name: 'SEPA 手速测试', emoji: '💳', desc: '5 秒连点，每次薅到 Claude 1k Token', tag: '新作', bg: 'linear-gradient(135deg, #111827, #d97757 62%, #f59e0b)', Comp: TokenClicker },
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
