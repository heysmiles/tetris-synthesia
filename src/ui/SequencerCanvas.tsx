import { useEffect, useRef } from 'react'
import {
  COLS, STEPS, CELL, HALF, CANVAS_W, CANVAS_H, RATE_Y, RATE_ROW_H, LOAD_Y, LOAD_H,
  COMMIT_Y, COMMIT_ROW_H, BOARD_Y, BOARD_H, KEY_Y, KEYBED_H, BLOCK_COLORS, BLACK_PC,
  ColorId, DRUM_ABBREV, colToDrum,
} from '../model/constants'
import { store, strikesAt, soundingAt } from '../model/store'
import { SHAPES, shapeCellsAt, Cell } from '../model/shapes'
import * as engine from '../audio/engine'

interface Hover {
  zone: 'rate' | 'load' | 'commit' | 'board' | 'keys' | null
  c: number
  r: number
}

export function SequencerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef<Hover>({ zone: null, c: 0, r: 0 })
  const dragRef = useRef<{ id: number; lastC: number; lastR: number } | null>(null)
  const keyFlashRef = useRef<Map<number, number>>(new Map()) // col -> until-timestamp (audition flash)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const draw = () => {
      render(ctx, hoverRef.current, keyFlashRef.current)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (store.state.screen !== 'jam') return
      // don't steal keys while the user is typing (e.g. the project-name field)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const sel = store.state.selectedShapeId
      switch (e.key) {
        case ' ':
          e.preventDefault()
          engine.unlock().then(() => engine.togglePlay())
          break
        case 'ArrowUp':
          e.preventDefault()
          store.rotateCreator()
          engine.blip(1200)
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (sel != null) store.moveShape(sel, -1, 0)
          break
        case 'ArrowRight':
          e.preventDefault()
          if (sel != null) store.moveShape(sel, 1, 0)
          break
        case 'ArrowDown':
          e.preventDefault()
          if (sel != null) store.moveShape(sel, 0, 1)
          break
        case 'Enter':
          e.preventDefault()
          store.commitAllStaged()
          engine.blip(1600)
          break
        case 'Escape':
          store.disarmCreator()
          break
        case 'Delete':
        case 'Backspace':
          if (sel != null) {
            store.deleteShape(sel)
            engine.blip(440)
          }
          break
        case '1': store.setCreatorColor('red'); break
        case '2': store.setCreatorColor('yellow'); break
        case '3': store.setCreatorColor('blue'); break
        case '4': store.setCreatorColor('green'); break
        case 'q':
        case 'Q':
          store.setCreatorShape(
            (store.state.creator.shapeIndex + SHAPES.length - 1) % SHAPES.length)
          break
        case 'e':
        case 'E':
          store.setCreatorShape((store.state.creator.shapeIndex + 1) % SHAPES.length)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toCanvasXY = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
    }
  }

  const hitTest = (x: number, y: number): Hover => {
    const c = Math.min(COLS - 1, Math.max(0, Math.floor(x / CELL)))
    if (y >= RATE_Y && y < RATE_Y + RATE_ROW_H) return { zone: 'rate', c, r: 0 }
    if (y >= LOAD_Y && y < LOAD_Y + LOAD_H)
      return { zone: 'load', c, r: Math.floor((y - LOAD_Y) / HALF) }
    if (y >= COMMIT_Y && y < COMMIT_Y + COMMIT_ROW_H) return { zone: 'commit', c, r: 0 }
    if (y >= BOARD_Y && y < BOARD_Y + BOARD_H)
      return { zone: 'board', c, r: Math.floor((y - BOARD_Y) / CELL) }
    if (y >= KEY_Y) return { zone: 'keys', c, r: 0 }
    return { zone: null, c: 0, r: 0 }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    const { x, y } = toCanvasXY(e)
    const h = hitTest(x, y)
    hoverRef.current = h
    const drag = dragRef.current
    if (drag && h.zone === 'load') {
      const dc = h.c - drag.lastC
      const dr = h.r - drag.lastR
      if ((dc || dr) && store.moveShape(drag.id, dc, dr)) {
        drag.lastC = h.c
        drag.lastR = h.r
      }
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const { x, y } = toCanvasXY(e)
    const h = hitTest(x, y)
    const rightClick = e.button === 2

    switch (h.zone) {
      case 'rate':
        store.cycleRate(h.c)
        engine.blip(980)
        break
      case 'commit':
        engine.unlock()
        store.toggleColumn(h.c)
        engine.blip(store.state.columns[h.c].active ? 1600 : 520)
        break
      case 'load': {
        const existing = store.shapeAt(h.c, h.r)
        if (existing) {
          if (rightClick) {
            store.deleteShape(existing.id)
            engine.blip(440)
          } else {
            store.selectShape(existing.id)
            dragRef.current = { id: existing.id, lastC: h.c, lastR: h.r }
          }
        } else if (!rightClick && store.state.creatorArmed) {
          const { shapeIndex, rot, color } = store.state.creator
          const cells = shapeCellsAt(SHAPES[shapeIndex], rot).map(({ c, r }) => ({
            c: c + h.c,
            r: r + h.r,
          }))
          engine.unlock()
          if (store.placeShape(color, cells)) engine.blip(700)
          else engine.blip(220)
        }
        break
      }
      case 'keys': {
        engine.unlock().then(() => engine.audition(store.state.creator.color, h.c))
        keyFlashRef.current.set(h.c, performance.now() + 200)
        break
      }
    }
  }

  const onMouseUp = () => {
    dragRef.current = null
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="seq-canvas"
      style={{ cursor: store.state.creatorArmed ? 'crosshair' : 'default' }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        hoverRef.current = { zone: null, c: 0, r: 0 }
        dragRef.current = null
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}

// ---------------- rendering ----------------

function render(ctx: CanvasRenderingContext2D, hover: Hover, keyFlash: Map<number, number>) {
  const st = store.state
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  drawRateRow(ctx, hover)
  drawLoadingZone(ctx, hover)
  drawCommitRow(ctx, hover)
  drawBoard(ctx)
  drawKeyboard(ctx, keyFlash)

  // ghost preview of the creator shape under the cursor (Escape disarms it)
  if (hover.zone === 'load' && st.creatorArmed && !store.shapeAt(hover.c, hover.r)) {
    const { shapeIndex, rot, color } = st.creator
    const cells = shapeCellsAt(SHAPES[shapeIndex], rot).map(({ c, r }) => ({
      c: c + hover.c,
      r: r + hover.r,
    }))
    const ok = store.canPlace(cells)
    ctx.globalAlpha = 0.5
    for (const cell of cells) {
      if (cell.c < 0 || cell.c >= COLS || cell.r < 0 || cell.r >= STEPS) continue
      drawNesCell(ctx, cell.c * CELL, LOAD_Y + cell.r * HALF, CELL, HALF,
        ok ? color : 'red', !ok)
    }
    ctx.globalAlpha = 1
  }
}

function drawRateRow(ctx: CanvasRenderingContext2D, hover: Hover) {
  ctx.fillStyle = '#181818'
  ctx.fillRect(0, RATE_Y, CANVAS_W, RATE_ROW_H)
  ctx.font = '9px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let c = 0; c < COLS; c++) {
    const rate = store.state.columns[c].rate
    const hovered = hover.zone === 'rate' && hover.c === c
    ctx.fillStyle = hovered ? '#444' : '#222'
    ctx.fillRect(c * CELL + 1, RATE_Y + 1, CELL - 2, RATE_ROW_H - 2)
    ctx.fillStyle = rate === 1 ? '#777' : rate === 2 ? '#f8b800' : '#ff6b47'
    ctx.fillText(`x${rate}`, c * CELL + CELL / 2, RATE_Y + RATE_ROW_H / 2 + 1)
  }
}

function drawLoadingZone(ctx: CanvasRenderingContext2D, hover: Hover) {
  const st = store.state
  ctx.fillStyle = '#101014'
  ctx.fillRect(0, LOAD_Y, CANVAS_W, LOAD_H)

  // beat guides: steps 0/4/8/12 strike from rows 15/11/7/3
  for (let r = 0; r < STEPS; r++) {
    const step = STEPS - 1 - r
    ctx.fillStyle = step % 4 === 0 ? '#2e2e3a' : '#1a1a20'
    ctx.fillRect(0, LOAD_Y + r * HALF, CANVAS_W, 1)
  }
  // octave guides
  for (const c of [0, 12, 24]) {
    ctx.fillStyle = '#2e2e3a'
    ctx.fillRect(c * CELL, LOAD_Y, 1, LOAD_H)
  }

  for (const s of st.shapes) {
    const selected = s.id === st.selectedShapeId
    for (const cell of s.cells) {
      drawNesCell(ctx, cell.c * CELL, LOAD_Y + cell.r * HALF, CELL, HALF, s.color)
    }
    if (selected) {
      ctx.strokeStyle = '#ffffff'
      ctx.setLineDash([3, 2])
      ctx.lineWidth = 1
      for (const cell of s.cells) {
        ctx.strokeRect(cell.c * CELL + 0.5, LOAD_Y + cell.r * HALF + 0.5, CELL - 1, HALF - 1)
      }
      ctx.setLineDash([])
    }
  }
}

function drawCommitRow(ctx: CanvasRenderingContext2D, hover: Hover) {
  const st = store.state
  ctx.fillStyle = '#181818'
  ctx.fillRect(0, COMMIT_Y, CANVAS_W, COMMIT_ROW_H)
  ctx.font = '11px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const staged = new Set<number>()
  for (const s of st.shapes) for (const cell of s.cells) staged.add(cell.c)
  for (let c = 0; c < COLS; c++) {
    const col = st.columns[c]
    const hovered = hover.zone === 'commit' && hover.c === c
    ctx.fillStyle = hovered ? '#3a3a3a' : '#242424'
    ctx.fillRect(c * CELL + 1, COMMIT_Y + 2, CELL - 2, COMMIT_ROW_H - 4)
    if (col.active) {
      ctx.fillStyle = '#58d854'
      ctx.fillText('✓', c * CELL + CELL / 2, COMMIT_Y + COMMIT_ROW_H / 2 + 1)
    } else if (staged.has(c)) {
      ctx.fillStyle = '#888'
      ctx.fillText('·', c * CELL + CELL / 2, COMMIT_Y + COMMIT_ROW_H / 2 + 1)
    }
  }
}

function drawBoard(ctx: CanvasRenderingContext2D) {
  const st = store.state
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, BOARD_Y, CANVAS_W, BOARD_H)
  for (const c of [0, 12, 24]) {
    ctx.fillStyle = '#1c1c24'
    ctx.fillRect(c * CELL, BOARD_Y, 1, BOARD_H)
  }
  ctx.fillStyle = '#141418'
  for (let r = 1; r < STEPS; r++) ctx.fillRect(0, BOARD_Y + r * CELL, CANVAS_W, 1)

  // falling blocks, derived from the committed patterns and current step —
  // discrete one-cell-per-step hops, no interpolation (NES gravity).
  for (let c = 0; c < COLS; c++) {
    const col = st.columns[c]
    if (!col.active) continue
    const period = STEPS / col.rate
    for (const note of col.notes) {
      for (let d = 1; d <= STEPS; d++) {
        if (!strikesAt(note, col.rate, st.step + d)) continue
        const bottomRow = STEPS - d // d=1 -> row 15 (about to strike), d=16 -> row 0
        for (let k = 0; k < note.dur; k++) {
          const row = bottomRow - k
          if (row < 0 || row > STEPS - 1) continue
          drawNesCell(ctx, c * CELL, BOARD_Y + row * CELL, CELL, CELL, note.color)
        }
      }
      // a struck block waterfalls into the key one row per step: the part
      // that hasn't landed yet keeps sliding down until the last row hits
      const since = ((st.step - note.start) % period + period) % period
      const remaining = note.dur - 1 - since
      for (let k = 0; k < remaining; k++) {
        const row = STEPS - 1 - k
        if (row < 0) break
        drawNesCell(ctx, c * CELL, BOARD_Y + row * CELL, CELL, CELL, note.color)
      }
    }
  }
  // strike line
  ctx.fillStyle = '#b02020'
  ctx.fillRect(0, KEY_Y - 2, CANVAS_W, 2)
}

// Per-column strike animation state (survives across frames).
const strikeStart = new Map<number, number>()
const wasSounding = new Set<number>()

function drawKeyboard(ctx: CanvasRenderingContext2D, keyFlash: Map<number, number>) {
  const st = store.state
  const now = performance.now()
  const showDrumLabels = st.creator.color === 'yellow'

  for (let c = 0; c < COLS; c++) {
    const black = BLACK_PC.has(c % 12)
    const x = c * CELL

    // sounding? which color?
    let sounding: ColorId | null = null
    const col = st.columns[c]
    if (col.active && st.playing) {
      for (const note of col.notes) {
        if (soundingAt(note, col.rate, st.step)) { sounding = note.color; break }
      }
    }
    if ((keyFlash.get(c) ?? 0) > now && !sounding) sounding = st.creator.color

    // detect the strike moment so the burst animates once per hit
    if (sounding && !wasSounding.has(c)) strikeStart.set(c, now)
    if (sounding) wasSounding.add(c)
    else wasSounding.delete(c)

    // key body — chunky 8-bit piano; a sounding key sinks 3px
    const press = sounding ? 3 : 0
    ctx.fillStyle = '#e8e8e8'
    ctx.fillRect(x, KEY_Y + press, CELL, KEYBED_H - press)
    if (black) {
      ctx.fillStyle = '#202020'
      ctx.fillRect(x, KEY_Y + press, CELL, Math.floor(KEYBED_H * 0.62) - press)
    }

    if (sounding) {
      // the key becomes the block that hit it: flat fill, NES bevel, no gradient
      const pal = BLOCK_COLORS[sounding]
      ctx.fillStyle = pal.fill
      ctx.fillRect(x + 1, KEY_Y + press + 1, CELL - 2, KEYBED_H - press - 2)
      ctx.fillStyle = pal.lite
      ctx.fillRect(x + 1, KEY_Y + press + 1, CELL - 2, 3)
      ctx.fillStyle = pal.dark
      ctx.fillRect(x + 1, KEY_Y + KEYBED_H - 4, CELL - 2, 3)
      ctx.fillRect(x + CELL - 3, KEY_Y + press + 1, 2, KEYBED_H - press - 2)
      // shadow above the sunk key sells the press
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(x, KEY_Y, CELL, press)
    }

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, KEY_Y + 0.5, CELL - 1, KEYBED_H - 1)

    // strike burst in the note's own color: three chunky 8-bit frames,
    // square sparks that hop upward and outward, then vanish (no alpha fades)
    const t0 = strikeStart.get(c)
    if (sounding && t0 !== undefined) {
      const t = (now - t0) / 300
      if (t < 1) {
        const pal = BLOCK_COLORS[sounding]
        const frame = Math.min(2, Math.floor(t * 3))
        const rise = [3, 9, 15][frame]
        const spread = [3, 6, 9][frame]
        const size = [4, 3, 2][frame]
        if (frame < 2) {
          ctx.fillStyle = pal.lite
          ctx.fillRect(x + 2, KEY_Y - 4, CELL - 4, frame === 0 ? 3 : 2)
        }
        ctx.fillStyle = frame === 0 ? pal.lite : pal.fill
        ctx.fillRect(x + CELL / 2 - spread - size, KEY_Y - 4 - rise, size, size)
        ctx.fillRect(x + CELL / 2 + spread, KEY_Y - 4 - rise, size, size)
        ctx.fillStyle = pal.fill
        ctx.fillRect(x + CELL / 2 - 1, KEY_Y - 8 - rise, 3, 3)
      }
    }

    if (showDrumLabels) {
      const abbrev = DRUM_ABBREV[colToDrum(c)]
      ctx.font = '7px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = sounding ? '#000' : black ? '#f8b800' : '#806000'
      for (let i = 0; i < abbrev.length; i++) {
        ctx.fillText(abbrev[i], x + CELL / 2, KEY_Y + 14 + i * 10)
      }
    }
  }
}

// Classic NES block cell: fill, dark bevel bottom/right, white glint top-left.
function drawNesCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: ColorId, invalid = false,
) {
  const pal = BLOCK_COLORS[color]
  ctx.fillStyle = invalid ? '#552222' : pal.fill
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = invalid ? '#331111' : pal.dark
  ctx.fillRect(x, y + h - 2, w, 2)
  ctx.fillRect(x + w - 2, y, 2, h)
  ctx.fillStyle = '#ffffff'
  const g = Math.max(2, Math.floor(Math.min(w, h) / 6))
  ctx.fillRect(x + 2, y + 2, g, g)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
}
