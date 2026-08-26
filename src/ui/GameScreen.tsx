import { useEffect, useRef } from 'react'
import { SequencerCanvas } from './SequencerCanvas'
import {
  ProjectTitle, ScorePanel, StatsPanel, NextPanel, LevelPanel, TransportPanel, MixerPanel,
  ControlsPanel, PresetsPanel,
} from './Panels'
import { store } from '../model/store'
import * as engine from '../audio/engine'

export function GameScreen() {
  const st = store.state
  const frameRef = useRef<HTMLDivElement>(null)

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
  }, [])

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
      </div>
    </div>
  )
}
