import { useEffect } from 'react'
import { SequencerCanvas } from './SequencerCanvas'
import { COLOR_IDS, BLOCK_COLORS, INSTRUMENT_NAME } from '../model/constants'
import {
  ProjectTitle, ScorePanel, StatsPanel, NextPanel, LevelPanel, TransportPanel, MixerPanel,
  ControlsPanel, PresetsPanel,
} from './Panels'
import { store } from '../model/store'
import * as engine from '../audio/engine'

function TutorialModal() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault()
        e.stopImmediatePropagation()
        store.closeTutorial()
      }
    }
    // capture phase so the game shortcuts underneath never fire
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <div className="modal-overlay" onClick={() => store.closeTutorial()}>
      <div className="tutorial" onClick={(e) => e.stopPropagation()}>
        <h2>HOW TO JAM</h2>
        <div className="tut-step">
          <span className="tut-num">1</span>
          <span>
            PICK A SHAPE + COLOR IN THE NEXT BOX. COLORS ARE INSTRUMENTS:
            <span className="tut-legend">
              {COLOR_IDS.map((c) => (
                <span key={c} className="tut-legend-item">
                  <span className="tut-chip" style={{ background: BLOCK_COLORS[c].fill }} />
                  {INSTRUMENT_NAME[c]}
                </span>
              ))}
            </span>
          </span>
        </div>
        <div className="tut-step">
          <span className="tut-num">2</span>
          <span>
            STACK BLOCKS IN THE LOADING ZONE (TOP GRID). THE COLUMN IS THE KEY IT
            WILL HIT, HOW HIGH IT SITS IS WHEN IT PLAYS IN THE BAR, AND ITS
            LENGTH IS HOW LONG THE NOTE HOLDS.
          </span>
        </div>
        <div className="tut-step">
          <span className="tut-num">3</span>
          <span>
            HIT ENTER (OR A COLUMN&apos;S ✓) TO COMMIT YOUR BLOCKS INTO THE LOOP.
            DELETE BLOCKS AND COMMIT AGAIN TO TAKE THEM BACK OUT.
          </span>
        </div>
        <div className="tut-step">
          <span className="tut-num">4</span>
          <span>
            PRESS SPACE. BLOCKS RAIN ONTO THE PIANO AND PLAY ON LOOP. THE
            ×1 ×2 ×4 ROW UP TOP MAKES A COLUMN REPEAT MORE OFTEN.
          </span>
        </div>
        <div className="tut-tip">
          TIP: YELLOW COLUMNS ARE DRUM LANES (KICK, SNARE, HATS…) — LANE NAMES
          APPEAR ON THE KEYS WHILE YELLOW IS SELECTED. NOT SURE WHERE TO START?
          LOAD A PRESET AND STUDY HOW IT&apos;S BUILT.
        </div>
        <button className="pix-btn wide on" onClick={() => store.closeTutorial()}>
          LET&apos;S JAM ▶
        </button>
      </div>
    </div>
  )
}

export function GameScreen() {
  const st = store.state

  useEffect(() => {
    if (!localStorage.getItem('tetris-synthesia-tutorial-seen')) store.openTutorial()
  }, [])

  return (
    <div className="game-frame">
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
      {st.showTutorial && <TutorialModal />}
    </div>
  )
}
