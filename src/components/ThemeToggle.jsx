import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const [theme, toggle] = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
      title={dark ? '浅色模式' : '深色模式'}
    >
      <i className={`fas ${dark ? 'fa-sun' : 'fa-moon'}`} />
    </button>
  )
}
