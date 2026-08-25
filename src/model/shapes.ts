export interface Cell {
  c: number
  r: number
}

export interface ShapeDef {
  name: string
  cells: Cell[]
}

// Tetrominoes plus plain vertical bars of length 1–3 (I is the 4-bar).
export const SHAPES: ShapeDef[] = [
  { name: 'I', cells: [{ c: 0, r: 0 }, { c: 0, r: 1 }, { c: 0, r: 2 }, { c: 0, r: 3 }] },
  { name: 'O', cells: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 0, r: 1 }, { c: 1, r: 1 }] },
  { name: 'T', cells: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 1, r: 1 }] },
  { name: 'S', cells: [{ c: 1, r: 0 }, { c: 2, r: 0 }, { c: 0, r: 1 }, { c: 1, r: 1 }] },
  { name: 'Z', cells: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 2, r: 1 }] },
  { name: 'J', cells: [{ c: 1, r: 0 }, { c: 1, r: 1 }, { c: 0, r: 2 }, { c: 1, r: 2 }] },
  { name: 'L', cells: [{ c: 0, r: 0 }, { c: 0, r: 1 }, { c: 0, r: 2 }, { c: 1, r: 2 }] },
  { name: '1', cells: [{ c: 0, r: 0 }] },
  { name: '2', cells: [{ c: 0, r: 0 }, { c: 0, r: 1 }] },
  { name: '3', cells: [{ c: 0, r: 0 }, { c: 0, r: 1 }, { c: 0, r: 2 }] },
]

// Rotate 90° clockwise, then re-normalize to origin.
export function rotateCells(cells: Cell[]): Cell[] {
  const maxR = Math.max(...cells.map((x) => x.r))
  const rotated = cells.map(({ c, r }) => ({ c: maxR - r, r: c }))
  return normalize(rotated)
}

export function normalize(cells: Cell[]): Cell[] {
  const minC = Math.min(...cells.map((x) => x.c))
  const minR = Math.min(...cells.map((x) => x.r))
  return cells.map(({ c, r }) => ({ c: c - minC, r: r - minR }))
}

export function shapeCellsAt(def: ShapeDef, rot: number): Cell[] {
  let cells = def.cells
  for (let i = 0; i < rot % 4; i++) cells = rotateCells(cells)
  return cells
}
