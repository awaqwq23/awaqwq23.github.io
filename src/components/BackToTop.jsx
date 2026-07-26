import { useState, useEffect } from 'react'

export default function BackToTop() {
  const [show, setShow] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY
      const height = document.documentElement.scrollHeight - window.innerHeight
      setShow(scrolled > 400)
      setProgress(height > 0 ? Math.min(scrolled / height, 1) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      className={`back-to-top${show ? ' show' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="回到顶部"
      style={{ '--scroll-progress': progress }}
    >
      <svg className="btt-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle className="btt-track" cx="22" cy="22" r="19" />
        <circle
          className="btt-bar"
          cx="22"
          cy="22"
          r="19"
          style={{ strokeDashoffset: 119.4 * (1 - progress) }}
        />
      </svg>
      <i className="fas fa-arrow-up" />
    </button>
  )
}
