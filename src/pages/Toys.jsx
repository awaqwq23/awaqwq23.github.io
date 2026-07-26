import { Link } from 'react-router-dom'
import { useScrollReveal } from '../hooks/useScrollReveal'

function AS({ children, d = 0 }) {
  const [ref, show] = useScrollReveal()
  return <div ref={ref} className={`reveal${show ? ' visible' : ''}`} style={{ transitionDelay: `${d}s` }}>{children}</div>
}

const toys = [
  {
    name: '🎮 小游戏厅',
    desc: '2048、贪吃蛇、扫雷、井字棋、打地鼠… 7 款纯浏览器小游戏，成绩本地保存，随点随玩！',
    to: '/games',
    bg: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    icon: 'fa-dice',
    internal: true,
  },
  {
    name: '💓 Heartbeat',
    desc: '一个用来视奸我电脑在干什么的小玩具，copy from quq，her github：https://github.com/shenxianovo/Heartbeat',
    url: 'https://awaqwq233.com/heartbeat/',
    bg: 'linear-gradient(135deg, #667eea, #764ba2)',
    icon: 'fa-heart',
  },
  {
    name: '🔖 资料收藏',
    desc: '我的收藏夹、开发软件、AI 工具与娱乐导航合集，好东西都堆在这儿。',
    to: '/docs',
    bg: 'linear-gradient(135deg, #10B981, #059669)',
    icon: 'fa-bookmark',
    internal: true,
  },
  {
    name: '🎵 更多精彩',
    desc: '更多小玩具正在开发中，敬请期待～',
    url: null,
    bg: 'linear-gradient(135deg, #f093fb, #f5576c)',
    icon: 'fa-music',
    soon: true,
  },
  {
    name: '🧩 更多项目',
    desc: '喵喵喵喵喵喵喵！',
    url: '/#/about',
    bg: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    icon: 'fa-cubes',
    contact: true,
  },
]

export default function Toys() {
  return (
    <div className="page">
      <AS>
        <div className="section-header">
          <h1><i className="fas fa-gamepad" style={{ color: 'var(--primary)' }} /> 小玩具</h1>
          <p>一些有趣的小项目，部署在不同的服务器上 🚀</p>
          <div className="section-line" />
        </div>
      </AS>

      <div className="toys-grid">
        {toys.map((toy, i) => (
          <AS key={toy.name} d={i * 0.1}>
            <div className="toy-card">
              <div className="toy-card-img" style={{ background: toy.bg }}>
                <i className={`fas ${toy.icon}`} />
              </div>
              <div className="toy-card-body">
                <h3>{toy.name}</h3>
                <p>{toy.desc}</p>
                {toy.soon ? (
                  <span className="btn btn-sm btn-disabled">
                    <i className="fas fa-clock" /> 即将上线
                  </span>
                ) : toy.internal ? (
                  <Link to={toy.to} className="btn btn-sm btn-primary">
                    <i className="fas fa-arrow-right" /> 进入
                  </Link>
                ) : toy.contact ? (
                  <a href={toy.url} className="btn btn-sm btn-primary">
                    <i className="fas fa-envelope" /> 联系我
                  </a>
                ) : (
                  <a href={toy.url} target="_blank" rel="noopener" className="btn btn-sm btn-primary">
                    <i className="fas fa-external-link-alt" /> 打开玩具
                  </a>
                )}
              </div>
            </div>
          </AS>
        ))}
      </div>
    </div>
  )
}
