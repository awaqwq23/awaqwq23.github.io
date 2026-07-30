import { useCallback, useEffect, useRef, useState } from 'react'
import { creditGameReward } from './aiEconomy'

const W = 720
const H = 360
const GROUND_Y = 292
const PLAYER_X = 104
const PLAYER_W = 44
const PLAYER_H = 55
const BEST_KEY = 'joy_bean_runner_best'
const COMPANIES = [
  { name: 'OpenAI', mark: '◎', color: '#10a37f' },
  { name: 'Claude', mark: 'A\\', color: '#d97757' },
  { name: 'Gemini', mark: '✦', color: '#4285f4' },
  { name: 'DeepSeek', mark: '鲸', color: '#4d6bfe' },
  { name: 'xAI', mark: '𝕏', color: '#111827' },
  { name: 'Qwen', mark: 'Q', color: '#7c3aed' },
]

function initialGame() {
  return {
    status: 'idle',
    y: GROUND_Y - PLAYER_H,
    vy: 0,
    onGround: true,
    score: 0,
    distance: 0,
    obstacles: [],
    spawnIn: 1.1,
    companyIndex: 0,
    lastTime: 0,
  }
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export default function JoyBeanRunner() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const gameRef = useRef(initialGame())
  const rewardedRef = useRef(false)
  const [phase, setPhase] = useState('idle')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0))
  const [reward, setReward] = useState(0)

  const resetGame = useCallback((startImmediately = false) => {
    const next = initialGame()
    next.status = startImmediately ? 'playing' : 'idle'
    gameRef.current = next
    rewardedRef.current = false
    setPhase(next.status)
    setScore(0)
    setReward(0)
  }, [])

  const jump = useCallback(() => {
    const game = gameRef.current
    if (game.status === 'idle') {
      game.status = 'playing'
      setPhase('playing')
    }
    if (game.status !== 'playing' || !game.onGround) return
    game.vy = -590
    game.onGround = false
  }, [])

  const finish = useCallback(() => {
    const game = gameRef.current
    if (game.status !== 'playing') return
    game.status = 'over'
    setPhase('over')
    setScore(game.score)
    setBest(previous => {
      const next = Math.max(previous, game.score)
      localStorage.setItem(BEST_KEY, String(next))
      return next
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (![' ', 'ArrowUp', 'w', 'W'].includes(event.key)) return
      event.preventDefault()
      jump()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jump])

  useEffect(() => {
    if (phase !== 'over' || rewardedRef.current || score <= 0) return
    rewardedRef.current = true
    const computeReward = 400 + score * 32
    creditGameReward({ compute: computeReward })
    setReward(computeReward)
  }, [phase, score])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const draw = (game, time) => {
      ctx.clearRect(0, 0, W, H)
      const background = ctx.createLinearGradient(0, 0, 0, H)
      background.addColorStop(0, '#fff7ed')
      background.addColorStop(.62, '#ffedd5')
      background.addColorStop(1, '#fed7aa')
      ctx.fillStyle = background
      ctx.fillRect(0, 0, W, H)

      ctx.fillStyle = 'rgba(251,146,60,.13)'
      ctx.beginPath()
      ctx.arc(600, 70, 82, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.7)'
      for (let i = 0; i < 5; i += 1) {
        const cloudX = ((i * 177 - time * .018) % (W + 140)) - 70
        ctx.beginPath()
        ctx.ellipse(cloudX, 62 + (i % 3) * 44, 42, 13, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.strokeStyle = '#ea580c'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y)
      ctx.lineTo(W, GROUND_Y)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(234,88,12,.25)'
      ctx.lineWidth = 2
      const groundOffset = -(time * .24) % 36
      for (let x = groundOffset; x < W; x += 36) {
        ctx.beginPath()
        ctx.moveTo(x, GROUND_Y + 10)
        ctx.lineTo(x + 18, GROUND_Y + 10)
        ctx.stroke()
      }

      game.obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.company.color
        ctx.beginPath()
        ctx.roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 8)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,.45)'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.font = '900 17px Inter, sans-serif'
        ctx.fillText(obstacle.company.mark, obstacle.x + obstacle.w / 2, obstacle.y + 24)
        ctx.font = '800 10px Inter, sans-serif'
        ctx.fillText(obstacle.company.name, obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h - 10)
      })

      const beanY = game.y + Math.sin(time / 55) * (game.onGround && game.status === 'playing' ? 1.6 : 0)
      ctx.save()
      ctx.translate(PLAYER_X + PLAYER_W / 2, beanY + PLAYER_H / 2)
      ctx.rotate(game.onGround ? 0 : Math.max(-.22, Math.min(.22, game.vy / 1700)))
      ctx.shadowColor = 'rgba(244,63,94,.38)'
      ctx.shadowBlur = 12
      ctx.fillStyle = '#fb4b67'
      ctx.beginPath()
      ctx.ellipse(0, 0, PLAYER_W / 2, PLAYER_H / 2, -.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(-7, -8, 4, 0, Math.PI * 2)
      ctx.arc(7, -8, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3f1724'
      ctx.beginPath()
      ctx.arc(-7, -8, 1.8, 0, Math.PI * 2)
      ctx.arc(7, -8, 1.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 4, 9, .18, Math.PI - .18)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = '900 11px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('豆包', 0, 22)
      ctx.restore()

      ctx.fillStyle = '#9a3412'
      ctx.font = '900 24px ui-monospace, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(String(game.score).padStart(5, '0'), W - 24, 38)
    }

    const loop = (time) => {
      const game = gameRef.current
      const dt = game.lastTime ? Math.min(.032, (time - game.lastTime) / 1000) : 0
      game.lastTime = time

      if (game.status === 'playing') {
        game.vy += 1550 * dt
        game.y += game.vy * dt
        if (game.y >= GROUND_Y - PLAYER_H) {
          game.y = GROUND_Y - PLAYER_H
          game.vy = 0
          game.onGround = true
        }

        const speed = 265 + Math.min(150, game.score * .55)
        game.distance += dt * (speed / 25)
        const nextScore = Math.floor(game.distance)
        if (nextScore !== game.score) {
          game.score = nextScore
          setScore(nextScore)
        }

        game.spawnIn -= dt
        if (game.spawnIn <= 0) {
          const company = COMPANIES[game.companyIndex % COMPANIES.length]
          game.companyIndex += 1
          const height = 42 + Math.random() * 42
          game.obstacles.push({
            x: W + 20,
            y: GROUND_Y - height,
            w: 48 + Math.random() * 18,
            h: height,
            company,
          })
          game.spawnIn = .9 + Math.random() * .72
        }
        game.obstacles.forEach(obstacle => { obstacle.x -= speed * dt })
        game.obstacles = game.obstacles.filter(obstacle => obstacle.x + obstacle.w > -10)

        const playerBox = {
          x: PLAYER_X + 6,
          y: game.y + 5,
          w: PLAYER_W - 12,
          h: PLAYER_H - 7,
        }
        if (game.obstacles.some(obstacle => overlaps(playerBox, obstacle))) finish()
      }

      draw(game, time)
      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [finish])

  return (
    <div className="arcade-runner">
      <div className="game-theme-note doubao-note">
        <span className="brand-orb doubao-orb">豆</span>
        <div><strong>震动的欢乐豆</strong><small>豆包化身欢乐豆一路狂奔，跳过挡路的其他 AI 公司。</small></div>
      </div>
      <div className="game-scorebar">
        <div className="score-box"><span>奔跑分数</span><strong>{score}</strong></div>
        <div className="score-box"><span>历史最高</span><strong>{best}</strong></div>
        <div className="score-box"><span>结算</span><strong>{reward ? `◈ ${reward.toLocaleString()}` : '待奔跑'}</strong></div>
        <button className="btn btn-sm btn-primary" onClick={() => resetGame(false)}>重新准备</button>
      </div>
      <div
        className={`arcade-canvas-frame joy-bean-frame${phase === 'playing' ? ' running' : ''}`}
        onPointerDown={phase === 'playing' ? jump : undefined}
        role="application"
        aria-label="点击让豆包欢乐豆跳过其他 AI 公司"
      >
        <canvas ref={canvasRef} width={W} height={H} />
        {phase !== 'playing' && (
          <div className="game-overlay">
            <div>
              <h3>{phase === 'over' ? '💥 欢乐豆被 AI 公司拦住了' : '🫘 欢乐豆准备震动'}</h3>
              {phase === 'over'
                ? <p>本局跑到 <strong>{score}</strong> 分，获得 <strong>◈ {reward.toLocaleString()} 算力点</strong></p>
                : <p>点击、空格、W 或 ↑ 跳跃，奔跑越远分数越高。</p>}
              <button className="btn btn-sm btn-primary" onPointerDown={event => event.stopPropagation()} onClick={() => resetGame(true)}>
                {phase === 'over' ? '再跑一次' : '开始奔跑'}
              </button>
            </div>
          </div>
        )}
      </div>
      <button className="arcade-main-control bean-control" onClick={jump} disabled={phase === 'over'}>
        <span>🫘</span>{phase === 'idle' ? '开始并跳跃' : '跳跃'}
      </button>
      <p className="game-hint">电脑可按空格 / W / ↑，手机点击画面或跳跃按钮。分数按奔跑距离持续增加。</p>
    </div>
  )
}
