import { useCallback, useEffect, useRef, useState } from 'react'
import { COMPANY_CATALOG, COMPANY_LOGO_URL } from './companyCatalog'

const W = 960
const H = 620
const PADDLE_Y = 564
const BRICK_COLS = 8
const BRICK_GAP = 10
const BRICK_W = 100
const BRICK_H = 40

const ROW_COLORS = ['#FF6B35', '#8B5CF6', '#06B6D4', '#22C55E', '#F59E0B', '#3B82F6']
const LOGO_CACHE = new Map()

const AIS = {
  openai: {
    name: 'OpenAI',
    mark: '◎',
    color: '#10A37F',
    width: 148,
    speed: 8.4,
    skill: '回溯协议',
    desc: '按 S 随时把球召回默认位置，不消耗重获机会。',
  },
  anthropic: {
    name: 'Anthropic',
    mark: 'A',
    color: '#D97757',
    width: 205,
    speed: 10.4,
    skill: '极速长板',
    desc: '挡板更长、球速更快，但必须在 2 分钟内清场。',
  },
  deepseek: {
    name: 'DeepSeek',
    mark: '◈',
    color: '#4D6BFE',
    width: 148,
    speed: 8.4,
    skill: '无限续航',
    desc: '球掉落后可无限次重新获得，适合稳扎稳打。',
  },
}

function shuffled(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function makeBricks() {
  const count = 28 + Math.floor(Math.random() * 15)
  const companies = shuffled(COMPANY_CATALOG).slice(0, count)
  const rows = Math.ceil(count / BRICK_COLS)
  const baseCount = Math.floor(count / rows)
  const extra = count % rows
  const rowCounts = shuffled(Array.from({ length: rows }, (_, i) => baseCount + (i < extra ? 1 : 0)))
  const bricks = []
  let companyIndex = 0

  rowCounts.forEach((rowCount, row) => {
    const totalW = rowCount * BRICK_W + (rowCount - 1) * BRICK_GAP
    const rowOffset = (Math.random() - 0.5) * Math.min(22, W - totalW - 56)
    const startX = (W - totalW) / 2 + rowOffset
    const y = 66 + row * (BRICK_H + BRICK_GAP) + (Math.random() - 0.5) * 4
    for (let col = 0; col < rowCount; col += 1) {
      const company = companies[companyIndex]
      bricks.push({
        ...company,
        x: startX + col * (BRICK_W + BRICK_GAP),
        y,
        w: BRICK_W,
        h: BRICK_H,
        color: ROW_COLORS[row % ROW_COLORS.length],
        alive: true,
      })
      companyIndex += 1
    }
  })
  return bricks
}

function freshGame(aiKey) {
  const ai = AIS[aiKey]
  return {
    aiKey,
    paddle: { x: (W - ai.width) / 2, width: ai.width },
    ball: { x: W / 2, y: PADDLE_Y - 14, r: 8, vx: 0, vy: aiKey === 'anthropic' ? -8.6 : -6.3 },
    bricks: makeBricks(),
    particles: [],
    keys: { left: false, right: false },
    status: 'ready',
    score: 0,
    retries: aiKey === 'deepseek' ? Infinity : 3,
    elapsed: 0,
    lastTime: 0,
    shake: 0,
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
}

function circleRectHit(ball, rect) {
  const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w))
  const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h))
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  return dx * dx + dy * dy <= ball.r * ball.r
}

function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds))
  const mins = Math.floor(value / 60)
  return `${mins}:${String(value % 60).padStart(2, '0')}`
}

export default function AIWorldBreakout() {
  const canvasRef = useRef(null)
  const gameRef = useRef(freshGame('openai'))
  const frameRef = useRef(0)
  const mountedRef = useRef(true)
  const noticeTimerRef = useRef(null)
  const [selectedAI, setSelectedAI] = useState('openai')
  const [destructionNotice, setDestructionNotice] = useState(null)
  const [ui, setUi] = useState({
    status: 'ready',
    score: 0,
    retries: 3,
    elapsed: 0,
    total: gameRef.current.bricks.length,
  })

  const syncUi = useCallback(() => {
    if (!mountedRef.current) return
    const g = gameRef.current
    setUi({
      status: g.status,
      score: g.score,
      retries: g.retries,
      elapsed: g.elapsed,
      total: g.bricks.length,
    })
  }, [])

  const showDestruction = useCallback((company) => {
    const g = gameRef.current
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setDestructionNotice({
      key: `${company.name}-${performance.now()}`,
      ai: AIS[g.aiKey].name,
      company: company.name,
      desc: company.desc,
      color: AIS[g.aiKey].color,
    })
    noticeTimerRef.current = setTimeout(() => setDestructionNotice(null), 5000)
  }, [])

  const placeBall = useCallback((status = 'ready') => {
    const g = gameRef.current
    const ai = AIS[g.aiKey]
    g.status = status
    g.paddle.x = (W - g.paddle.width) / 2
    g.ball.x = W / 2
    g.ball.y = PADDLE_Y - 14
    g.ball.vx = 0
    g.ball.vy = g.aiKey === 'anthropic' ? -8.6 : -6.3
    g.lastTime = 0
    syncUi()
  }, [syncUi])

  const resetGame = useCallback((aiKey = gameRef.current.aiKey) => {
    gameRef.current = freshGame(aiKey)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    setDestructionNotice(null)
    setSelectedAI(aiKey)
    syncUi()
  }, [syncUi])

  const launch = useCallback(() => {
    const g = gameRef.current
    if (g.status === 'ready') {
      g.status = 'playing'
      g.lastTime = 0
      syncUi()
    }
  }, [syncUi])

  const chooseAI = (aiKey) => {
    resetGame(aiKey)
    requestAnimationFrame(() => canvasRef.current?.focus())
  }

  const setMove = useCallback((direction, pressed) => {
    gameRef.current.keys[direction] = pressed
    canvasRef.current?.focus()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    COMPANY_CATALOG.forEach((company) => {
      if (LOGO_CACHE.has(company.icon)) return
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.src = COMPANY_LOGO_URL(company.icon)
      LOGO_CACHE.set(company.icon, image)
    })
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const key = event.key.toLowerCase()
      if (key === 'a' || event.key === 'ArrowLeft') {
        event.preventDefault()
        gameRef.current.keys.left = true
      }
      if (key === 'd' || event.key === 'ArrowRight') {
        event.preventDefault()
        gameRef.current.keys.right = true
      }
      if (key === 'w' || event.key === 'ArrowUp') {
        event.preventDefault()
        launch()
      }
      if (key === 's' && gameRef.current.aiKey === 'openai' && ['ready', 'playing'].includes(gameRef.current.status)) {
        event.preventDefault()
        placeBall()
      }
    }
    const onKeyUp = (event) => {
      const key = event.key.toLowerCase()
      if (key === 'a' || event.key === 'ArrowLeft') gameRef.current.keys.left = false
      if (key === 'd' || event.key === 'ArrowRight') gameRef.current.keys.right = false
    }
    const clearKeys = () => {
      gameRef.current.keys.left = false
      gameRef.current.keys.right = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearKeys)
    return () => {
      mountedRef.current = false
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearKeys)
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    }
  }, [launch, placeBall])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let lastUiSync = 0

    const draw = (g) => {
      const ai = AIS[g.aiKey]
      ctx.clearRect(0, 0, W, H)
      ctx.save()

      if (g.shake > 0) {
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake)
        g.shake *= 0.84
      }

      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#08111f')
      bg.addColorStop(0.55, '#0b1728')
      bg.addColorStop(1, '#101c2d')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = 'rgba(100, 180, 255, 0.055)'
      ctx.lineWidth = 1
      for (let x = 20; x < W; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 20; y < H; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.font = '600 12px Inter, sans-serif'
      ctx.letterSpacing = '2px'
      ctx.fillText('LEGACY TECH NETWORK', 32, 35)
      ctx.textAlign = 'right'
      ctx.fillStyle = ai.color
      ctx.fillText(`${ai.name.toUpperCase()} // WORLD TAKEOVER`, W - 32, 35)
      ctx.textAlign = 'left'

      g.bricks.forEach((brick) => {
        if (!brick.alive) return
        ctx.save()
        ctx.shadowColor = `${brick.color}2c`
        ctx.shadowBlur = 12
        roundedRect(ctx, brick.x, brick.y, brick.w, brick.h, 8)
        ctx.fillStyle = 'rgba(245,248,252,0.96)'
        ctx.fill()
        ctx.shadowBlur = 0
        roundedRect(ctx, brick.x, brick.y, 5, brick.h, 3)
        ctx.fillStyle = brick.color
        ctx.fill()

        const logo = LOGO_CACHE.get(brick.icon)
        if (logo?.complete && logo.naturalWidth) {
          ctx.drawImage(logo, brick.x + 12, brick.y + 9, 22, 22)
        } else {
          roundedRect(ctx, brick.x + 10, brick.y + 8, 24, 24, 6)
          ctx.fillStyle = `${brick.color}1f`
          ctx.fill()
          ctx.fillStyle = brick.color
          ctx.font = '800 11px Inter, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(brick.name.slice(0, 1), brick.x + 22, brick.y + 20)
        }

        ctx.fillStyle = '#0f172a'
        const fontSize = brick.name.length > 11 ? 8.5 : brick.name.length > 8 ? 9.5 : 11
        ctx.font = `700 ${fontSize}px Inter, sans-serif`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(brick.name, brick.x + 40, brick.y + brick.h / 2 + 0.5, brick.w - 47)
        ctx.restore()
      })

      g.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      })
      ctx.globalAlpha = 1

      ctx.save()
      ctx.shadowColor = ai.color
      ctx.shadowBlur = 24
      const paddleGradient = ctx.createLinearGradient(g.paddle.x, 0, g.paddle.x + g.paddle.width, 0)
      paddleGradient.addColorStop(0, ai.color)
      paddleGradient.addColorStop(0.5, '#ffffff')
      paddleGradient.addColorStop(1, ai.color)
      roundedRect(ctx, g.paddle.x, PADDLE_Y, g.paddle.width, 15, 8)
      ctx.fillStyle = paddleGradient
      ctx.fill()
      ctx.restore()
      ctx.fillStyle = '#dbeafe'
      ctx.font = '800 13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${ai.mark} ${ai.name}`, g.paddle.x + g.paddle.width / 2, PADDLE_Y + 34)

      const ballGlow = ctx.createRadialGradient(g.ball.x, g.ball.y, 1, g.ball.x, g.ball.y, 19)
      ballGlow.addColorStop(0, '#ffffff')
      ballGlow.addColorStop(0.3, '#80e9ff')
      ballGlow.addColorStop(1, 'rgba(49,210,255,0)')
      ctx.fillStyle = ballGlow
      ctx.beginPath()
      ctx.arc(g.ball.x, g.ball.y, 19, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(g.ball.x, g.ball.y, g.ball.r, 0, Math.PI * 2)
      ctx.fill()

      if (g.status === 'ready') {
        ctx.fillStyle = 'rgba(5,12,22,0.76)'
        roundedRect(ctx, W / 2 - 125, 395, 250, 74, 14)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.font = '800 19px Inter, sans-serif'
        ctx.fillText('按 W 发射智能体', W / 2, 423)
        ctx.fillStyle = 'rgba(255,255,255,0.62)'
        ctx.font = '500 12px Inter, sans-serif'
        ctx.fillText('A / D 移动挡板', W / 2, 448)
      }
      ctx.restore()
    }

    const update = (g, time) => {
      const ai = AIS[g.aiKey]
      if (!g.lastTime) g.lastTime = time
      const delta = Math.min(1.8, (time - g.lastTime) / (1000 / 60))
      g.lastTime = time

      if (g.keys.left) g.paddle.x -= ai.speed * delta
      if (g.keys.right) g.paddle.x += ai.speed * delta
      g.paddle.x = Math.max(12, Math.min(W - g.paddle.width - 12, g.paddle.x))

      if (g.status === 'ready') {
        g.ball.x = g.paddle.x + g.paddle.width / 2
        g.ball.y = PADDLE_Y - 14
      }

      if (g.status === 'playing') {
        g.elapsed += (time - (g.previousTime || time)) / 1000
        if (g.aiKey === 'anthropic' && g.elapsed >= 120) {
          g.status = 'lost'
          syncUi()
        }

        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(g.ball.vx), Math.abs(g.ball.vy)) * delta / 5))
        for (let s = 0; s < steps && g.status === 'playing'; s += 1) {
          const step = delta / steps
          const prevX = g.ball.x
          const prevY = g.ball.y
          g.ball.x += g.ball.vx * step
          g.ball.y += g.ball.vy * step

          if (g.ball.x - g.ball.r <= 8 && g.ball.vx < 0) {
            g.ball.x = 8 + g.ball.r
            g.ball.vx *= -1
          }
          if (g.ball.x + g.ball.r >= W - 8 && g.ball.vx > 0) {
            g.ball.x = W - 8 - g.ball.r
            g.ball.vx *= -1
          }
          if (g.ball.y - g.ball.r <= 48 && g.ball.vy < 0) {
            g.ball.y = 48 + g.ball.r
            g.ball.vy *= -1
          }

          if (
            g.ball.vy > 0 &&
            g.ball.y + g.ball.r >= PADDLE_Y &&
            g.ball.y - g.ball.r <= PADDLE_Y + 17 &&
            g.ball.x >= g.paddle.x - g.ball.r &&
            g.ball.x <= g.paddle.x + g.paddle.width + g.ball.r
          ) {
            const offset = (g.ball.x - (g.paddle.x + g.paddle.width / 2)) / (g.paddle.width / 2)
            const speed = Math.hypot(g.ball.vx, g.ball.vy) * 1.006
            g.ball.vx = Math.sin(offset * 1.02) * speed
            g.ball.vy = -Math.max(4.3, Math.cos(offset * 0.92) * speed)
            g.ball.y = PADDLE_Y - g.ball.r - 1
          }

          const hit = g.bricks.find((brick) => brick.alive && circleRectHit(g.ball, brick))
          if (hit) {
            hit.alive = false
            g.score += 1
            g.shake = 5
            showDestruction(hit)
            const wasOutsideX = prevX + g.ball.r < hit.x || prevX - g.ball.r > hit.x + hit.w
            const wasOutsideY = prevY + g.ball.r < hit.y || prevY - g.ball.r > hit.y + hit.h
            if (wasOutsideX && !wasOutsideY) g.ball.vx *= -1
            else g.ball.vy *= -1
            for (let i = 0; i < 9; i += 1) {
              g.particles.push({
                x: g.ball.x,
                y: g.ball.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1,
                size: 2 + Math.random() * 4,
                color: hit.color,
              })
            }
            if (g.score === g.bricks.length) {
              g.status = 'won'
              syncUi()
            }
          }

          if (g.ball.y - g.ball.r > H) {
            if (g.retries === Infinity || g.retries > 0) {
              if (g.retries !== Infinity) g.retries -= 1
              placeBall()
            } else {
              g.status = 'lost'
              syncUi()
            }
          }
        }
      }

      g.previousTime = time
      g.particles.forEach((p) => {
        p.x += p.vx * delta
        p.y += p.vy * delta
        p.vy += 0.08 * delta
        p.life -= 0.025 * delta
      })
      g.particles = g.particles.filter((p) => p.life > 0)

      if (time - lastUiSync > 150) {
        lastUiSync = time
        syncUi()
      }
    }

    const loop = (time) => {
      const g = gameRef.current
      update(g, time)
      draw(g)
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [placeBall, showDestruction, syncUi])

  const ai = AIS[selectedAI]
  const remaining = ui.total - ui.score
  const timeLeft = selectedAI === 'anthropic' ? 120 - ui.elapsed : ui.elapsed

  return (
    <div className="ai-breakout">
      <div className="breakout-intro">
        <div>
          <span className="breakout-kicker">AI TAKEOVER PROTOCOL</span>
          <h2>选择你的 AI，清除旧世界</h2>
        </div>
        <p>本局随机生成 {ui.total} 家传统科技公司，击碎全部目标即可见证 AI 统治世界。</p>
      </div>

      <div className="ai-select" aria-label="选择 AI 挡板">
        {Object.entries(AIS).map(([key, item]) => (
          <button
            type="button"
            key={key}
            className={`ai-option${selectedAI === key ? ' active' : ''}`}
            style={{ '--ai-color': item.color }}
            onClick={() => chooseAI(key)}
            aria-pressed={selectedAI === key}
          >
            <span className="ai-option-mark">{item.mark}</span>
            <span className="ai-option-copy">
              <strong>{item.name}</strong>
              <small>{item.skill}</small>
            </span>
            <span className="ai-option-check">✓</span>
          </button>
        ))}
      </div>

      <div className="breakout-skill" style={{ '--ai-color': ai.color }}>
        <span className="skill-icon">{ai.mark}</span>
        <span><strong>{ai.skill}</strong>{ai.desc}</span>
      </div>

      <div className="breakout-hud">
        <div><span>已清除</span><strong>{ui.score}<small> / {ui.total}</small></strong></div>
        <div><span>剩余目标</span><strong>{remaining}</strong></div>
        <div>
          <span>{selectedAI === 'anthropic' ? '剩余时间' : '行动时间'}</span>
          <strong className={selectedAI === 'anthropic' && timeLeft < 20 ? 'danger' : ''}>{formatTime(timeLeft)}</strong>
        </div>
        <div><span>重获机会</span><strong>{ui.retries === Infinity ? '∞' : ui.retries}</strong></div>
      </div>

      <div className="breakout-frame" style={{ '--ai-color': ai.color }}>
        <canvas
          ref={canvasRef}
          className="breakout-canvas"
          width={W}
          height={H}
          tabIndex="0"
          aria-label={`AI 统治世界打砖块游戏，当前挡板为 ${ai.name}`}
        />

        {destructionNotice && ['ready', 'playing'].includes(ui.status) && (
          <div
            key={destructionNotice.key}
            className="breakout-destruction-notice"
            style={{ '--notice-color': destructionNotice.color }}
            aria-live="polite"
          >
            <strong>{destructionNotice.ai} 摧毁了 {destructionNotice.company}</strong>
            <span>{destructionNotice.desc}</span>
          </div>
        )}

        {ui.status === 'won' && (
          <div className="breakout-result win" role="dialog" aria-live="assertive">
            <div className="result-orbit">◎</div>
            <span>WORLD STATUS // CAPTURED</span>
            <h3>游戏胜利</h3>
            <p>AI 成功统治世界</p>
            <button className="breakout-action" onClick={() => resetGame(selectedAI)}>再次接管</button>
          </div>
        )}
        {ui.status === 'lost' && (
          <div className="breakout-result lost" role="dialog" aria-live="assertive">
            <div className="result-orbit">×</div>
            <span>PROTOCOL INTERRUPTED</span>
            <h3>{selectedAI === 'anthropic' && ui.elapsed >= 120 ? '两分钟已到' : '接管失败'}</h3>
            <p>{selectedAI === 'anthropic' && ui.elapsed >= 120 ? 'Anthropic 已自动下线' : '球已失联，旧世界暂时幸存'}</p>
            <button className="breakout-action" onClick={() => resetGame(selectedAI)}>重新启动</button>
          </div>
        )}
      </div>

      <div className="breakout-controls" aria-label="游戏控制">
        <button
          type="button"
          onPointerDown={() => setMove('left', true)}
          onPointerUp={() => setMove('left', false)}
          onPointerLeave={() => setMove('left', false)}
          onPointerCancel={() => setMove('left', false)}
        >
          <kbd>A</kbd><span>向左</span>
        </button>
        <button type="button" className="launch" onClick={launch}>
          <kbd>W</kbd><span>发球</span>
        </button>
        <button
          type="button"
          onPointerDown={() => setMove('right', true)}
          onPointerUp={() => setMove('right', false)}
          onPointerLeave={() => setMove('right', false)}
          onPointerCancel={() => setMove('right', false)}
        >
          <kbd>D</kbd><span>向右</span>
        </button>
        {selectedAI === 'openai' && (
          <button type="button" className="reset-ball" onClick={() => placeBall()}>
            <kbd>S</kbd><span>召回球</span>
          </button>
        )}
      </div>

      <div className="breakout-footer">
        <span><i />摧毁所有公司即可获胜</span>
        <button type="button" onClick={() => resetGame(selectedAI)}>重新开始</button>
      </div>
    </div>
  )
}
