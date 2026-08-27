import { useEffect, useRef, useState } from 'react'
import { SequencerCanvas } from './SequencerCanvas'
import {
  ProjectTitle, ScorePanel, StatsPanel, NextPanel, LevelPanel, TransportPanel, MixerPanel,
  ControlsPanel, PresetsPanel,
} from './Panels'
import { store } from '../model/store'
import * as engine from '../audio/engine'

// Chunky left-pointing pixel arrow in the controls-panel gold.
function PixelArrow() {
  return (
    <svg
      className="hint-arrow"
      viewBox="0 0 9 5"
      width="54"
      height="30"
      shapeRendering="crispEdges"
    >
      <g fill="#f8b800">
        <rect x="2" y="0" width="1" height="1" />
        <rect x="1" y="1" width="2" height="1" />
        <rect x="0" y="2" width="9" height="1" />
        <rect x="1" y="3" width="2" height="1" />
        <rect x="2" y="4" width="1" height="1" />
      </g>
    </svg>
  )
}

const HINTS_KEY = 'tetris-synthesia-hints-seen'

const HINT_STEPS = [
  { target: '#panel-next', num: '1.', text: 'MOVE BLOCKS INTO THE LOADING ZONE' },
  { target: '#btn-commit', num: '2.', text: 'COMMIT EDITS TO THE BOARD (ENTER)' },
  { target: '#btn-play', num: '3.', text: 'PLAY IT! (SPACE BAR)' },
]

// One hint at a time, its arrow measured to point at the actual target
// element (NEXT panel, COMMIT EDITS button, PLAY button).
function OnboardHints({ step, onDismiss }: { step: number; onDismiss: () => void }) {
  const [top, setTop] = useState(220)

  useEffect(() => {
    const place = () => {
      const target = document.querySelector(HINT_STEPS[step].target)
      const grid = document.querySelector('.game-grid')
      const frame = document.querySelector('.game-frame') as HTMLElement | null
      if (!target || !grid) return
      const z = parseFloat(frame?.style.zoom || '1') || 1
      const t = target.getBoundingClientRect()
      const g = grid.getBoundingClientRect()
      setTop((t.top + t.height / 2 - g.top) / z - 24)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [step])

  const { num, text } = HINT_STEPS[step]
  return (
    <div className="onboard-hints">
      <div className="hint-step" style={{ top }}>
        <PixelArrow />
        <span className="hint-text">
          <span className="hint-num">{num}</span> {text}
        </span>
        <button className="hint-dismiss" onClick={onDismiss} title="Dismiss">✕</button>
      </div>
    </div>
  )
}

export function GameScreen() {
  const st = store.state
  const frameRef = useRef<HTMLDivElement>(null)
  // 0..2 = current hint, 3 = done
  const [hintStep, setHintStep] = useState(() => (localStorage.getItem(HINTS_KEY) ? 3 : 0))
  const baseline = useRef({
    shapes: store.state.shapes.length,
    active: store.state.columns.filter((c) => c.active).length,
  })

  const advanceHint = () => {
    setHintStep((s) => {
      const next = Math.min(3, s + 1)
      if (next >= 3) localStorage.setItem(HINTS_KEY, '1')
      baseline.current = {
        shapes: store.state.shapes.length,
        active: store.state.columns.filter((c) => c.active).length,
      }
      return next
    })
  }

  const dismissHints = () => {
    localStorage.setItem(HINTS_KEY, '1')
    setHintStep(3)
  }

  // advance when the instructed action happens...
  useEffect(() => {
    if (hintStep >= 3) return
    const b = baseline.current
    const active = st.columns.filter((c) => c.active).length
    if (hintStep === 0 && st.shapes.length > b.shapes) advanceHint()
    else if (hintStep === 1 && active > b.active) advanceHint()
    else if (hintStep === 2 && st.playing) advanceHint()
  })

  // ...or on any key press
  useEffect(() => {
    if (hintStep >= 3) return
    const onAnyKey = () => advanceHint()
    window.addEventListener('keydown', onAnyKey)
    return () => window.removeEventListener('keydown', onAnyKey)
  }, [hintStep])

  // Scale the whole game frame to fit the viewport: measure the natural
  // layout size at zoom 1, then zoom so nothing (board, keyboard, or side
  // panels) runs off-screen. The board column is the tallest element, so
  // the side panels always end at or above the keyboard line.
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const fit = () => {
      if (window.matchMedia('(max-width: 1080px)').matches) {
        el.style.zoom = '1' // stacked mobile layout scrolls naturally
        return
      }
      el.style.zoom = '1'
      const h = el.scrollHeight
      const w = el.scrollWidth
      let z = Math.min(0.92, window.innerHeight / h, window.innerWidth / w)
      // The hint rail overhangs the centered grid's right edge, and zooming
      // out shifts the centered grid rightward in zoomed units — so the rail
      // fits only when z <= V / (gridWidth + 2 * overhang).
      const hints = el.querySelector('.onboard-hints')
      const grid = el.querySelector('.game-grid')
      if (hints && grid) {
        const overhang = hints.getBoundingClientRect().right - grid.getBoundingClientRect().right
        const gridW = grid.getBoundingClientRect().width
        z = Math.min(z, window.innerWidth / (gridW + 2 * overhang))
      }
      el.style.zoom = String(z)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [hintStep >= 3])

  return (
    <div className="game-frame" ref={frameRef}>
      <div className="game-grid">
        <div className="side-col">
          <button
            className="panel mode-panel main-btn"
            onClick={() => {
              engine.pause()
              store.setScreen('title')
            }}
          >
            MAIN MENU
          </button>
          <StatsPanel stats={st.stats} />
          <MixerPanel volumes={st.volumes} />
          <LevelPanel bpm={st.bpm} />
          <ControlsPanel />
        </div>
        <div className="center-col">
          <ProjectTitle name={st.projectName} />
          <div className="board-frame">
            <SequencerCanvas />
          </div>
        </div>
        <div className="side-col">
          <ScorePanel top={st.top} score={st.score} />
          <NextPanel />
          <PresetsPanel />
          <TransportPanel playing={st.playing} />
        </div>
        {hintStep < 3 && <OnboardHints step={hintStep} onDismiss={dismissHints} />}
      </div>
    </div>
  )
}
