import { useCallback, useEffect, useRef, useState } from 'react'
import { creditGameReward } from './aiEconomy'

const W = 720
const H = 420
const FLOOR_Y = 392
const WHALE_X = 142
const WHALE_RADIUS = 19
const BEST_KEY = 'flying_whale_best'
const COMPANIES = [
  { name: 'OpenAI', mark: '◎', color: '#10a37f' },
  { name: 'Anthropic', mark: 'A\\', color: '#d97757' },
  { name: 'Gemini', mark: '✦', color: '#4285f4' },
  { name: 'xAI', mark: '𝕏', color: '#111827' },
  { name: 'Qwen', mark: 'Q', color: '#7c3aed' },
  { name: '豆包', mark: '豆', color: '#f43f5e' },
]

function initialGame() {
  return {
    status: 'idle',
    y: H / 2,
    vy: 0,
    score: 0,
    obstacles: [],
    spawnIn: 1.15,
    companyIndex: 0,
    lastTime: 0,
  }
}

function circleHitsRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w))
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h))
  return (cx - nearestX) ** 2 + (cy - nearestY) ** 2 < radius ** 2
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, r)
}

export default function FlyingWhale() {
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
    if (startImmediately) {
      next.status = 'playing'
      next.vy = -385
      next.score = 1
    }
    gameRef.current = next
    rewardedRef.current = false
    setPhase(next.status)
    setScore(next.score)
    setReward(0)
  }, [])

  const flap = useCallback(() => {
    const game = gameRef.current
    if (game.status === 'idle') {
      resetGame(true)
      return
    }
    if (game.status !== 'playing') return
    game.vy = -385
    game.score += 1
    setScore(game.score)
  }, [resetGame])

  const finish = useCallback(() => {
    const game = gameRef.current
    if (game.status !== 'playing') return
    game.status = 'over'
    setPhase('over')
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
      flap()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flap])

  useEffect(() => {
    if (phase !== 'over' || rewardedRef.current || score <= 0) return
    rewardedRef.current = true
    const tokenM = Number((score * 0.08).toFixed(2))
    creditGameReward({ modelId: 'deepseek-v32', tokenM })
    setReward(tokenM)
  }, [phase, score])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const drawObstacle = (obstacle) => {
      const topHeight = obstacle.gapY - obstacle.gap / 2
      const bottomY = obstacle.gapY + obstacle.gap / 2
      const company = obstacle.company
      const drawTower = (y, height, labelY) => {
        if (height <= 0) return
        const gradient = ctx.createLinearGradient(obstacle.x, 0, obstacle.x + obstacle.w, 0)
        gradient.addColorStop(0, company.color)
        gradient.addColorStop(1, '#0f172a')
        ctx.fillStyle = gradient
        roundedRect(ctx, obstacle.x, y, obstacle.w, height, 9)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,.28)'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.save()
        ctx.translate(obstacle.x + obstacle.w / 2, labelY)
        ctx.rotate(-Math.PI / 2)
        ctx.textAlign = 'center'
        ctx.fillStyle = '#fff'
        ctx.font = '800 13px Inter, sans-serif'
        ctx.fillText(`${company.mark} ${company.name}`, 0, 4)
        ctx.restore()
      }
      drawTower(0, topHeight, Math.max(40, topHeight / 2))
      drawTower(bottomY, FLOOR_Y - bottomY, bottomY + Math.max(28, (FLOOR_Y - bottomY) / 2))
    }

    const draw = (game, time) => {
      ctx.clearRect(0, 0, W, H)
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#071b3d')
      sky.addColorStop(.62, '#164e91')
      sky.addColorStop(1, '#67c4ff')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      ctx.fillStyle = 'rgba(255,255,255,.58)'
      for (let i = 0; i < 24; i += 1) {
        const x = (i * 83 + time * .012 * (1 + i % 3)) % (W + 20) - 10
        const y = 24 + (i * 47) % 210
        ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1)
      }

      game.obstacles.forEach(drawObstacle)

      ctx.fillStyle = '#082f49'
      ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y)
      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(0, FLOOR_Y, W, 4)
      ctx.fillStyle = 'rgba(125,211,252,.5)'
      for (let x = -(time * .12) % 34; x < W; x += 34) ctx.fillRect(x, FLOOR_Y + 9, 18, 2)

      ctx.save()
      ctx.translate(WHALE_X, game.y)
      ctx.rotate(Math.max(-.35, Math.min(.62, game.vy / 700)))
      ctx.shadowColor = '#60a5fa'
      ctx.shadowBlur = 18
      ctx.font = '42px "Segoe UI Emoji", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🐋', 0, 0)
      ctx.restore()

      ctx.fillStyle = 'rgba(255,255,255,.92)'
      ctx.font = '900 26px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(game.score), W / 2, 40)
      ctx.fillStyle = 'rgba(255,255,255,.62)'
      ctx.font = '700 11px Inter, sans-serif'
      ctx.fillText('每次起飞 +1', W / 2, 58)
    }

    const loop = (time) => {
      const game = gameRef.current
      const dt = game.lastTime ? Math.min(.032, (time - game.lastTime) / 1000) : 0
      game.lastTime = time

      if (game.status === 'playing') {
        game.vy += 1120 * dt
        game.y += game.vy * dt
        const speed = 185 + Math.min(95, game.score * 2.1)
        game.spawnIn -= dt
        if (game.spawnIn <= 0) {
          const company = COMPANIES[game.companyIndex % COMPANIES.length]
          game.companyIndex += 1
          game.obstacles.push({
            x: W + 30,
            w: 82,
            gap: Math.max(130, 164 - game.score * .45),
            gapY: 105 + Math.random() * 180,
            company,
          })
          game.spawnIn = Math.max(.95, 1.48 - game.score * .008)
        }
        game.obstacles.forEach(obstacle => { obstacle.x -= speed * dt })
        game.obstacles = game.obstacles.filter(obstacle => obstacle.x + obstacle.w > -20)

        const hitBoundary = game.y - WHALE_RADIUS <= 0 || game.y + WHALE_RADIUS >= FLOOR_Y
        const hitCompany = game.obstacles.some(obstacle => {
          const top = { x: obstacle.x, y: 0, w: obstacle.w, h: obstacle.gapY - obstacle.gap / 2 }
          const bottomY = obstacle.gapY + obstacle.gap / 2
          const bottom = { x: obstacle.x, y: bottomY, w: obstacle.w, h: FLOOR_Y - bottomY }
          return circleHitsRect(WHALE_X, game.y, WHALE_RADIUS, top) ||
            circleHitsRect(WHALE_X, game.y, WHALE_RADIUS, bottom)
        })
        if (hitBoundary || hitCompany) finish()
      }

      draw(game, time)
      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [finish])

  return (
    <div className="arcade-flight">
      <div className="game-theme-note deepseek-note">
        <span className="brand-orb deepseek-orb">鲸</span>
        <div><strong>我的大银鲸会飞</strong><small>每次点击让大银鲸跃升并 +1 分，避开迎面而来的 AI 公司。</small></div>
      </div>
      <div className="game-scorebar">
        <div className="score-box"><span>本局飞行</span><strong>{score}</strong></div>
        <div className="score-box"><span>最高分</span><strong>{best}</strong></div>
        <div className="score-box"><span>结算</span><strong>{reward ? `${reward}M Token` : '待飞行'}</strong></div>
        <button className="btn btn-sm btn-primary" onClick={() => resetGame(false)}>重新准备</button>
      </div>
      <div
        className="arcade-canvas-frame whale-flight-frame"
        onPointerDown={phase === 'playing' ? flap : undefined}
        role="application"
        aria-label="点击让大银鲸飞行，躲开 AI 公司障碍"
      >
        <canvas ref={canvasRef} width={W} height={H} />
        {phase !== 'playing' && (
          <div className="game-overlay">
            <div>
              <h3>{phase === 'over' ? '💥 大银鲸撞上 AI 公司了' : '🐋 准备起飞'}</h3>
              {phase === 'over'
                ? <p>本局点击飞行 <strong>{score}</strong> 次，获得 <strong>{reward}M DeepSeek V3.2 Token</strong></p>
                : <p>点击、空格、W 或 ↑ 都能跃升；每跃升一次立即 +1 分。</p>}
              <button className="btn btn-sm btn-primary" onPointerDown={event => event.stopPropagation()} onClick={() => resetGame(true)}>
                {phase === 'over' ? '再飞一次' : '点击起飞'}
              </button>
            </div>
          </div>
        )}
      </div>
      <button className="arcade-main-control" onClick={flap} disabled={phase === 'over'}>
        <span>🐋</span>{phase === 'idle' ? '起飞' : '跃升 +1'}
      </button>
      <p className="game-hint">电脑可按空格 / W / ↑，手机点击画面或跃升按钮。撞到公司、海面或天空都会结算。</p>
    </div>
  )
}
