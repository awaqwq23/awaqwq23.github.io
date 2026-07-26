import { useState, useEffect, useCallback } from 'react'

function getInitial() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.getAttribute('data-theme') || 'light'
}

/**
 * 全局主题（light / dark）。写入 <html data-theme> 与 localStorage。
 * 用简单的订阅机制让所有组件同步，避免多个 toggle 状态不一致。
 */
const listeners = new Set()

export function useTheme() {
  const [theme, setTheme] = useState(getInitial)

  useEffect(() => {
    const cb = (t) => setTheme(t)
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, [])

  const toggle = useCallback(() => {
    const next = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch (e) { /* ignore */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#0B1121' : '#1E3A5F')
    listeners.forEach((cb) => cb(next))
  }, [])

  return [theme, toggle]
}
