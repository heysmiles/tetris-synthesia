import {
  COLS, STEPS, ColorId, COLOR_IDS, LoopRate, DEFAULT_BPM, MIN_BPM, MAX_BPM,
} from './constants'
import { Cell } from './shapes'

export interface StagedShape {
  id: number
  color: ColorId
  cells: Cell[] // absolute loading-zone coords (c: 0..COLS-1, r: 0..STEPS-1)
}

// One looping note in a column's committed pattern.
// start: step in the bar when the block strikes (0..15). dur: sustain in steps.
export interface ColNote {
  start: number
  dur: number
  color: ColorId
}

export interface ColumnState {
  active: boolean
  rate: LoopRate
  notes: ColNote[]
}

export type Screen = 'title' | 'jam' | 'credits'

export interface State {
  screen: Screen
  projectName: string
  showTutorial: boolean
  playing: boolean
  step: number // current global step 0..15
  bpm: number
  shapes: StagedShape[]
  columns: ColumnState[]
  selectedShapeId: number | null
  creator: { shapeIndex: number; rot: number; color: ColorId }
  creatorArmed: boolean // false = Escape pressed, no placement ghost on hover
  score: number
  top: number
  stats: Record<ColorId, number> // shapes placed per color
  volumes: Record<ColorId, number> // 0..1
}

const STORAGE_KEY = 'tetris-synthesia-session'
const TOP_KEY = 'tetris-synthesia-top'

function freshColumns(): ColumnState[] {
  return Array.from({ length: COLS }, () => ({ active: false, rate: 1 as LoopRate, notes: [] }))
}

function initialState(): State {
  return {
    screen: 'title',
    projectName: '',
    showTutorial: false,
    playing: false,
    step: 0,
    bpm: DEFAULT_BPM,
    shapes: [],
    columns: freshColumns(),
    selectedShapeId: null,
    creator: { shapeIndex: 9, rot: 0, color: 'red' }, // vertical 3-bar, red
    creatorArmed: true,
    score: 0,
    top: Number(localStorage.getItem(TOP_KEY) || 0),
    stats: { red: 0, yellow: 0, blue: 0, green: 0 },
    volumes: { red: 0.9, yellow: 0.9, blue: 0.7, green: 0.7 },
  }
}

type Listener = () => void

class Store {
  state: State = initialState()
  version = 0
  private listeners = new Set<Listener>()
  private nextId = 1
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  subscribe = (fn: Listener) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getVersion = () => this.version

  private emit(persist = true) {
    this.version++
    this.listeners.forEach((fn) => fn())
    if (persist) this.scheduleSave()
  }

  // ---- session persistence ----

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.save(), 400)
  }

  save() {
    const { shapes, columns, bpm, stats, volumes, score, projectName } = this.state
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        shapes, columns, bpm, stats, volumes, score, projectName, nextId: this.nextId,
      }),
    )
  }

  loadSaved(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      this.applySession(JSON.parse(raw))
      return true
    } catch {
      return false
    }
  }

  exportJSON(): string {
    const { shapes, columns, bpm, stats, volumes, projectName } = this.state
    return JSON.stringify(
      { shapes, columns, bpm, stats, volumes, projectName, nextId: this.nextId }, null, 2)
  }

  importJSON(raw: string) {
    this.applySession(JSON.parse(raw))
    this.emit()
  }

  private applySession(data: any) {
    const s = this.state
    if (Array.isArray(data.shapes)) s.shapes = data.shapes
    if (Array.isArray(data.columns) && data.columns.length === COLS) s.columns = data.columns
    if (typeof data.bpm === 'number') s.bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, data.bpm))
    if (data.stats) s.stats = { ...s.stats, ...data.stats }
    if (data.volumes) s.volumes = { ...s.volumes, ...data.volumes }
    if (typeof data.score === 'number') s.score = data.score
    if (typeof data.projectName === 'string') s.projectName = data.projectName.slice(0, 24)
    if (typeof data.nextId === 'number') this.nextId = data.nextId
    this.emit(false)
  }

  setProjectName(name: string) {
    this.state.projectName = name.toUpperCase().slice(0, 24)
    this.emit()
  }

  // ---- screens / transport-adjacent ----

  setScreen(screen: Screen) {
    this.state.screen = screen
    this.emit(false)
  }

  openTutorial() {
    this.state.showTutorial = true
    this.emit(false)
  }

  closeTutorial() {
    this.state.showTutorial = false
    localStorage.setItem('tetris-synthesia-tutorial-seen', '1')
    this.emit(false)
  }

  setPlaying(playing: boolean) {
    this.state.playing = playing
    this.emit(false)
  }

  setStep(step: number) {
    this.state.step = step
    this.emit(false)
  }

  addScore(n: number) {
    this.state.score += n
    if (this.state.score > this.state.top) {
      this.state.top = this.state.score
      localStorage.setItem(TOP_KEY, String(this.state.top))
    }
    this.emit(false)
  }

  setBpm(bpm: number) {
    this.state.bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, bpm))
    this.emit()
  }

  setVolume(color: ColorId, v: number) {
    this.state.volumes[color] = Math.min(1, Math.max(0, v))
    this.emit()
  }

  // ---- creator ----

  setCreatorShape(shapeIndex: number) {
    this.state.creator.shapeIndex = shapeIndex
    this.state.creator.rot = 0
    this.state.creatorArmed = true
    this.emit(false)
  }

  rotateCreator() {
    this.state.creator.rot = (this.state.creator.rot + 1) % 4
    this.state.creatorArmed = true
    this.emit(false)
  }

  setCreatorColor(color: ColorId) {
    this.state.creator.color = color
    this.state.creatorArmed = true
    this.emit(false)
  }

  disarmCreator() {
    this.state.creatorArmed = false
    this.state.selectedShapeId = null
    this.emit(false)
  }

  // ---- loading zone ----

  occupied(): Map<string, number> {
    const m = new Map<string, number>()
    for (const s of this.state.shapes)
      for (const cell of s.cells) m.set(`${cell.c},${cell.r}`, s.id)
    return m
  }

  canPlace(cells: Cell[], ignoreId?: number): boolean {
    const occ = this.occupied()
    return cells.every(({ c, r }) => {
      if (c < 0 || c >= COLS || r < 0 || r >= STEPS) return false
      const owner = occ.get(`${c},${r}`)
      return owner === undefined || owner === ignoreId
    })
  }

  placeShape(color: ColorId, cells: Cell[]): boolean {
    if (!this.canPlace(cells)) return false
    const id = this.nextId++
    this.state.shapes.push({ id, color, cells })
    this.state.selectedShapeId = id
    this.state.stats[color]++
    this.emit()
    return true
  }

  moveShape(id: number, dc: number, dr: number): boolean {
    const shape = this.state.shapes.find((s) => s.id === id)
    if (!shape) return false
    const moved = shape.cells.map(({ c, r }) => ({ c: c + dc, r: r + dr }))
    if (!this.canPlace(moved, id)) return false
    shape.cells = moved
    this.emit()
    return true
  }

  deleteShape(id: number) {
    this.state.shapes = this.state.shapes.filter((s) => s.id !== id)
    if (this.state.selectedShapeId === id) this.state.selectedShapeId = null
    this.emit()
  }

  selectShape(id: number | null) {
    this.state.selectedShapeId = id
    this.emit(false)
  }

  shapeAt(c: number, r: number): StagedShape | undefined {
    return this.state.shapes.find((s) => s.cells.some((x) => x.c === c && x.r === r))
  }

  // ---- columns / committing ----

  // Compile a column's staged cells into loop notes. Contiguous same-color
  // vertical runs become one note; the run's BOTTOM row sets the strike step
  // (bottom row 15 strikes at step 0 — lower cells arrive first).
  compileColumn(c: number): ColNote[] {
    const cellsInCol: { r: number; color: ColorId }[] = []
    for (const s of this.state.shapes)
      for (const cell of s.cells)
        if (cell.c === c) cellsInCol.push({ r: cell.r, color: s.color })
    cellsInCol.sort((a, b) => a.r - b.r)

    const notes: ColNote[] = []
    let run: { r0: number; r1: number; color: ColorId } | null = null
    for (const { r, color } of cellsInCol) {
      if (run && r === run.r1 + 1 && color === run.color) {
        run.r1 = r
      } else {
        if (run) notes.push(this.runToNote(run))
        run = { r0: r, r1: r, color }
      }
    }
    if (run) notes.push(this.runToNote(run))
    return notes
  }

  private runToNote(run: { r0: number; r1: number; color: ColorId }): ColNote {
    return { start: STEPS - 1 - run.r1, dur: run.r1 - run.r0 + 1, color: run.color }
  }

  toggleColumn(c: number) {
    const col = this.state.columns[c]
    if (col.active) {
      col.active = false
    } else {
      col.notes = this.compileColumn(c)
      col.active = col.notes.length > 0
    }
    this.emit()
  }

  // Enter / COMMIT EDITS: full sync of the loading zone into the loop.
  // Columns with staged cells are (re)compiled and activated; columns whose
  // blocks were deleted are dropped from the flow.
  commitAllStaged() {
    const colsWithCells = new Set<number>()
    for (const s of this.state.shapes) for (const cell of s.cells) colsWithCells.add(cell.c)
    for (let c = 0; c < COLS; c++) {
      const col = this.state.columns[c]
      if (colsWithCells.has(c)) {
        col.notes = this.compileColumn(c)
        col.active = col.notes.length > 0
      } else {
        col.notes = []
        col.active = false
      }
    }
    this.emit()
  }

  cycleRate(c: number) {
    const col = this.state.columns[c]
    col.rate = (col.rate === 1 ? 2 : col.rate === 2 ? 4 : 1) as LoopRate
    this.emit()
  }

  clearAll() {
    this.state.shapes = []
    this.state.columns = freshColumns()
    this.state.selectedShapeId = null
    this.emit()
  }

  // Replace the whole session with a bundled preset: stage its shapes, set
  // per-column rates, then commit everything so it joins the loop compiled
  // by the same code path as hand-placed blocks.
  applyPreset(p: {
    name: string
    bpm: number
    rates: Record<number, LoopRate>
    shapes: { color: ColorId; cells: Cell[] }[]
  }) {
    this.state.shapes = p.shapes.map((s) => ({
      id: this.nextId++,
      color: s.color,
      cells: s.cells,
    }))
    this.state.columns = freshColumns()
    for (const [c, rate] of Object.entries(p.rates)) {
      this.state.columns[Number(c)].rate = rate
    }
    this.state.projectName = p.name
    this.state.bpm = p.bpm
    this.state.selectedShapeId = null
    this.commitAllStaged()
  }
}

export const store = new Store()

// Does this note strike at the given global step, for a column at `rate`?
export function strikesAt(note: ColNote, rate: LoopRate, step: number): boolean {
  const period = STEPS / rate
  return ((step - note.start) % period + period) % period === 0
}

// Is this note sounding (key held) at the given global step?
export function soundingAt(note: ColNote, rate: LoopRate, step: number): boolean {
  const period = STEPS / rate
  const since = ((step - note.start) % period + period) % period
  return since < note.dur
}
