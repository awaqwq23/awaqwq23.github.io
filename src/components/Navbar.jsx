import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

const links = [
  { to: '/', icon: 'fa-home', label: '首页' },
  { to: '/blog', icon: 'fa-pen-fancy', label: '博客' },
  { to: '/toys', icon: 'fa-gamepad', label: '小玩具' },
  { to: '/games', icon: 'fa-dice', label: '小游戏' },
  { to: '/docs', icon: 'fa-book', label: '文档' },
  { to: '/about', icon: 'fa-info-circle', label: '关于' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <NavLink to="/" className="nav-logo">
            <span className="nav-logo-icon">💙</span>
            <span className="nav-logo-text">awaqwq233</span>
          </NavLink>

          <div className={`nav-links${mobileOpen ? ' open' : ''}`}>
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <i className={`fas ${link.icon}`} />
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-actions">
            <ThemeToggle />
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileOpen(p => !p)}
              aria-label="菜单"
            >
              <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'}`} />
            </button>
          </div>
        </div>
      </nav>
      {mobileOpen && <div className="nav-overlay" onClick={() => setMobileOpen(false)} />}
    </>
  )
}
