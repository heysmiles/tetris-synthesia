import { useEffect, useMemo, useState } from 'react'
import { store } from '../model/store'
import * as engine from '../audio/engine'

const MENU = ['JAM', 'CREDITS'] as const

export function TitleScreen() {
  const [sel, setSel] = useState(0)
  const [loading, setLoading] = useState(false)

  const stars = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: `${(i * 37 + 13) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        ch: i % 5 === 0 ? '✦' : i % 3 === 0 ? '+' : '·',
        delay: `${(i % 7) * 0.4}s`,
      })),
    [],
  )

  const activate = async (index: number) => {
    if (MENU[index] === 'CREDITS') {
      store.setScreen('credits')
      return
    }
    setLoading(true)
    await engine.unlock()
    await engine.init()
    engine.setBpm(store.state.bpm)
    store.setScreen('jam')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (store.state.screen !== 'title' || loading) return
      if (e.key === 'ArrowUp') setSel((s) => (s + MENU.length - 1) % MENU.length)
      if (e.key === 'ArrowDown') setSel((s) => (s + 1) % MENU.length)
      if (e.key === 'Enter' || e.key === ' ') activate(sel)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, loading])

  return (
    <div className="title-screen">
      {stars.map((s, i) => (
        <span key={i} className="star" style={{ left: s.left, top: s.top, animationDelay: s.delay }}>
          {s.ch}
        </span>
      ))}
      <div className="logo-box">
        <div className="logo-main">TETRIS</div>
        <div className="logo-sub">SYNTHESIA</div>
      </div>
      <div className="title-tagline">A FALLING-BLOCKS BEAT MACHINE</div>
      {loading ? (
        <div className="title-menu"><div className="menu-item">LOADING SOUNDS…</div></div>
      ) : (
        <div className="title-menu">
          {MENU.map((m, i) => (
            <div
              key={m}
              className={`menu-item ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => activate(i)}
            >
              {i === sel ? <span className="arrow">▶</span> : <span className="arrow"> </span>}
              {m}
              {i === sel ? <span className="arrow flip">◀</span> : <span className="arrow"> </span>}
            </div>
          ))}
        </div>
      )}
      <div className="title-foot">ORIGINAL PIXEL TRIBUTE · NOT AFFILIATED WITH THE TETRIS COMPANY</div>
    </div>
  )
}

export function CreditsScreen() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (store.state.screen !== 'credits') return
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') store.setScreen('title')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="title-screen">
      <div className="logo-box small">
        <div className="logo-main">CREDITS</div>
      </div>
      <div className="credits-body">
        <p>CONCEPT &amp; DESIGN — CHARLIE SMILES</p>
        <p>CODE — CLAUDE</p>
        <p>PIANO — SALAMANDER GRAND (CC-BY, A. HOLM)</p>
        <p>DRUM SAMPLES — TONE.JS COMMUNITY KIT</p>
        <p>SYNTHS &amp; PADS — TONE.JS</p>
        <p>INSPIRED BY SYNTHESIA &amp; CLASSIC TETRIS</p>
      </div>
      <div className="title-menu">
        <div className="menu-item sel" onClick={() => store.setScreen('title')}>
          <span className="arrow">▶</span>BACK
        </div>
      </div>
    </div>
  )
}
