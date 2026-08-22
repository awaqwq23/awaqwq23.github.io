import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import { useEconomyClock } from './games/aiEconomy'

const Home = lazy(() => import('./pages/Home'))
const Blog = lazy(() => import('./pages/Blog'))
const Toys = lazy(() => import('./pages/Toys'))
const Games = lazy(() => import('./pages/Games'))
const About = lazy(() => import('./pages/About'))
const Docs = lazy(() => import('./pages/Docs'))
const MusicCuration = lazy(() => import('./pages/MusicCuration'))
const TodayPicker = lazy(() => import('./pages/TodayPicker'))
const Lyrics = lazy(() => import('./pages/Lyrics'))
const AnimeTracker = lazy(() => import('./pages/AnimeTracker'))
const BangumiAiring = lazy(() => import('./pages/BangumiAiring'))

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
        <Suspense fallback={<div className="route-loading"><i className="fas fa-spinner fa-spin" /><span>正在加载当前页面…</span></div>}><Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/toys" element={<Toys />} />
          <Route path="/games" element={<Games />} />
          <Route path="/about" element={<About />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/music" element={<MusicCuration />} />
          <Route path="/today" element={<TodayPicker />} />
          <Route path="/lyrics" element={<Lyrics />} />
          <Route path="/anime" element={<AnimeTracker />} />
          <Route path="/anime/bangumi" element={<BangumiAiring />} />
          <Route path="*" element={<NotFound />} />
        </Routes></Suspense>
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
