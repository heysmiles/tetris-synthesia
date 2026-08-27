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
      width="36"
      height="20"
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

function OnboardHints({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="onboard-hints">
      <button className="hint-dismiss" onClick={onDismiss} title="Dismiss">✕</button>
      <div className="hint-step" style={{ top: 240 }}>
        <PixelArrow />
        <span className="hint-text">
          <span className="hint-num">1.</span> MOVE BLOCKS INTO THE LOADING ZONE
        </span>
      </div>
      <div className="hint-step" style={{ top: 640 }}>
        <PixelArrow />
        <span className="hint-text">
          <span className="hint-num">2.</span> COMMIT EDITS TO THE BOARD (ENTER)
        </span>
      </div>
      <div className="hint-step" style={{ top: 730 }}>
        <PixelArrow />
        <span className="hint-text">
          <span className="hint-num">3.</span> PLAY IT! (SPACE BAR)
        </span>
      </div>
    </div>
  )
}

export function GameScreen() {
  const st = store.state
  const frameRef = useRef<HTMLDivElement>(null)
  const [showHints, setShowHints] = useState(() => !localStorage.getItem(HINTS_KEY))

  const dismissHints = () => {
    localStorage.setItem(HINTS_KEY, '1')
    setShowHints(false)
  }

  // the steps are complete once they hit play — hints have done their job
  useEffect(() => {
    if (st.playing && showHints) dismissHints()
  }, [st.playing, showHints])

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
      const z = Math.min(0.92, window.innerHeight / h, window.innerWidth / w)
      el.style.zoom = String(z)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [showHints])

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
        {showHints && <OnboardHints onDismiss={dismissHints} />}
      </div>
    </div>
  )
}
