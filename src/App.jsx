import { useEffect } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import Home from './pages/Home'
import Blog from './pages/Blog'
import Toys from './pages/Toys'
import Games from './pages/Games'
import About from './pages/About'
import Docs from './pages/Docs'
import MusicCuration from './pages/MusicCuration'
import TodayPicker from './pages/TodayPicker'
import Lyrics from './pages/Lyrics'
import { useEconomyClock } from './games/aiEconomy'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function NotFound() {
  return (
    <div className="page notfound">
      <div className="notfound-code">404</div>
      <h1>诶呀，页面走丢了喵</h1>
      <p>你要找的东西不在这里，也许它跑去别的星球了 🪐</p>
      <Link to="/" className="btn btn-primary"><i className="fas fa-home" /> 回到首页</Link>
    </div>
  )
}

export default function App() {
  useEconomyClock()
  return (
    <div className="app">
      <ScrollToTop />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/toys" element={<Toys />} />
          <Route path="/games" element={<Games />} />
          <Route path="/about" element={<About />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/music" element={<MusicCuration />} />
          <Route path="/today" element={<TodayPicker />} />
          <Route path="/lyrics" element={<Lyrics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
