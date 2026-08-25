import { SequencerCanvas } from './SequencerCanvas'
import {
  ProjectTitle, ScorePanel, StatsPanel, NextPanel, LevelPanel, TransportPanel, MixerPanel,
} from './Panels'
import { store } from '../model/store'

export function GameScreen() {
  const st = store.state
  return (
    <div className="game-frame">
      <div className="game-grid">
        <div className="side-col">
          <div className="panel mode-panel">B-TYPE</div>
          <StatsPanel stats={st.stats} />
          <MixerPanel volumes={st.volumes} />
        </div>
        <div className="center-col">
          <ProjectTitle name={st.projectName} />
          <div className="board-frame">
            <SequencerCanvas />
          </div>
          <div className="hint keys-hint">
            SPACE PLAY · ENTER COMMIT · ↑ ROTATE · Q/E SHAPE · 1-4 COLOR · R-CLICK DELETE
          </div>
        </div>
        <div className="side-col">
          <ScorePanel top={st.top} score={st.score} lines={st.lines} />
          <NextPanel />
          <LevelPanel bpm={st.bpm} />
          <TransportPanel playing={st.playing} />
        </div>
      </div>
    </div>
  )
}
