import { SequencerCanvas } from './SequencerCanvas'
import {
  ProjectTitle, ScorePanel, StatsPanel, NextPanel, LevelPanel, TransportPanel, MixerPanel,
  ControlsPanel,
} from './Panels'
import { store } from '../model/store'
import * as engine from '../audio/engine'

export function GameScreen() {
  const st = store.state
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
          <TransportPanel playing={st.playing} />
        </div>
      </div>
    </div>
  )
}
