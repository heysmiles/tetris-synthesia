import { useRef } from 'react'
import {
  COLOR_IDS, BLOCK_COLORS, INSTRUMENT_NAME, ColorId, MIN_BPM, MAX_BPM,
} from '../model/constants'
import { store } from '../model/store'
import { SHAPES, shapeCellsAt } from '../model/shapes'
import { KOROBEINIKI } from '../model/presets'
import * as engine from '../audio/engine'

const pad = (n: number, w: number) => String(Math.min(n, 10 ** w - 1)).padStart(w, '0')

export function ProjectTitle({ name }: { name: string }) {
  return (
    <input
      className="title-input"
      value={name}
      maxLength={24}
      placeholder="NAME YOUR JAM"
      spellCheck={false}
      onChange={(e) => store.setProjectName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
      }}
    />
  )
}

const CONTROLS: [string, string][] = [
  ['SPACE', 'PLAY / PAUSE'],
  ['ENTER', 'COMMIT'],
  ['↑', 'ROTATE'],
  ['Q / E', 'SHAPE'],
  ['1-4', 'COLOR'],
  ['ESC', 'DROP CURSOR'],
  ['←↓→', 'MOVE'],
  ['R-CLICK', 'DELETE'],
  ['DEL', 'DELETE'],
]

export function ControlsPanel() {
  return (
    <div className="panel">
      <div className="panel-label">CONTROLS</div>
      {CONTROLS.map(([key, action]) => (
        <div key={key + action} className="control-row">
          <span className="control-key">{key}</span>
          <span className="control-action">{action}</span>
        </div>
      ))}
    </div>
  )
}

export function ScorePanel({ top, score }: { top: number; score: number }) {
  return (
    <div className="panel">
      <div className="panel-label">TOP</div>
      <div className="panel-value">{pad(top, 6)}</div>
      <div className="panel-label" style={{ marginTop: 10 }}>SCORE</div>
      <div className="panel-value">{pad(score, 6)}</div>
    </div>
  )
}

export function StatsPanel({ stats }: { stats: Record<ColorId, number> }) {
  return (
    <div className="panel">
      <div className="panel-label">STATISTICS</div>
      {COLOR_IDS.map((c) => (
        <div key={c} className="stat-row">
          <span className="stat-chip" style={{ background: BLOCK_COLORS[c].fill }} />
          <span className="stat-name">{INSTRUMENT_NAME[c]}</span>
          <span className="stat-count">{pad(stats[c], 3)}</span>
        </div>
      ))}
    </div>
  )
}

export function NextPanel() {
  const { creator } = store.state
  const def = SHAPES[creator.shapeIndex]
  const cells = shapeCellsAt(def, creator.rot)
  const maxC = Math.max(...cells.map((x) => x.c)) + 1
  const maxR = Math.max(...cells.map((x) => x.r)) + 1
  const pal = BLOCK_COLORS[creator.color]

  return (
    <div className="panel">
      <div className="panel-label">NEXT</div>
      <div className="next-grid" style={{ width: maxC * 18, height: maxR * 18 }}>
        {cells.map((cell, i) => (
          <span
            key={i}
            className="next-cell"
            style={{
              left: cell.c * 18, top: cell.r * 18,
              background: pal.fill, borderColor: pal.dark,
            }}
          />
        ))}
      </div>
      <div className="shape-buttons">
        {SHAPES.map((s, i) => (
          <button
            key={s.name}
            className={`pix-btn ${i === creator.shapeIndex ? 'on' : ''}`}
            onClick={() => { store.setCreatorShape(i); engine.blip(760) }}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="shape-buttons">
        {COLOR_IDS.map((c, i) => (
          <button
            key={c}
            className={`pix-btn color-btn ${c === creator.color ? 'on' : ''}`}
            style={{ background: BLOCK_COLORS[c].fill }}
            title={`${i + 1}: ${INSTRUMENT_NAME[c]}`}
            onClick={() => { store.setCreatorColor(c); engine.blip(900) }}
          />
        ))}
      </div>
      <div className="hint">{INSTRUMENT_NAME[creator.color]}</div>
    </div>
  )
}

export function LevelPanel({ bpm }: { bpm: number }) {
  const change = (d: number) => {
    const v = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm + d))
    store.setBpm(v)
    engine.setBpm(v)
    engine.blip(1000)
  }
  return (
    <div className="panel">
      <div className="panel-label">LEVEL</div>
      <div className="panel-value">{bpm}</div>
      <div className="panel-label" style={{ fontSize: 7 }}>BPM</div>
      <div className="shape-buttons">
        <button className="pix-btn" onClick={() => change(-5)}>-</button>
        <button className="pix-btn" onClick={() => change(5)}>+</button>
      </div>
    </div>
  )
}

export function TransportPanel({ playing }: { playing: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)

  const onToggle = async () => {
    await engine.unlock()
    engine.togglePlay()
  }

  const onExport = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'tetris-synthesia-loop.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((raw) => {
      try {
        store.importJSON(raw)
        engine.setBpm(store.state.bpm)
      } catch {
        alert('Not a valid loop file')
      }
    })
    e.target.value = ''
  }

  return (
    <div className="panel">
      <button className={`pix-btn wide ${playing ? 'on' : ''}`} onClick={onToggle}>
        {playing ? '❚❚ PAUSE' : '▶ PLAY'}
      </button>
      <button className="pix-btn wide" onClick={() => store.commitAllStaged()}>
        COMMIT EDITS
      </button>
      <button
        className="pix-btn wide"
        onClick={() => {
          if (!confirm('Load the KOROBEINIKI preset? This replaces your current loop (SAVE it first if you want to keep it).')) return
          engine.unlock()
          store.applyPreset(KOROBEINIKI)
          engine.setBpm(store.state.bpm)
        }}
      >
        ♪ THEME A
      </button>
      <button className="pix-btn wide" onClick={onExport}>SAVE</button>
      <button className="pix-btn wide" onClick={() => fileRef.current?.click()}>LOAD</button>
      <button
        className="pix-btn wide danger"
        onClick={() => { if (confirm('Clear all blocks and loops?')) store.clearAll() }}
      >
        CLEAR
      </button>
      <input ref={fileRef} type="file" accept=".json" hidden onChange={onImport} />
    </div>
  )
}

export function MixerPanel({ volumes }: { volumes: Record<ColorId, number> }) {
  return (
    <div className="panel">
      <div className="panel-label">MIXER</div>
      {COLOR_IDS.map((c) => (
        <div key={c} className="mixer-row">
          <span className="stat-chip" style={{ background: BLOCK_COLORS[c].fill }} />
          <input
            type="range" min={0} max={100} value={Math.round(volumes[c] * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100
              store.setVolume(c, v)
              engine.setVolume(c, v)
            }}
          />
        </div>
      ))}
    </div>
  )
}
