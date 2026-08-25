// Grid geometry — 1 board row = 1 sixteenth-note step; one descent = one bar.
export const COLS = 25 // C3..C5 inclusive, one semitone per column
export const STEPS = 16 // loop length: 16 steps = 1 bar of 4/4
export const CELL = 26 // full-size board cell, px
export const HALF = 13 // loading-zone cell height, px
export const KEYBED_H = 64
export const RATE_ROW_H = 20
export const COMMIT_ROW_H = 24

export const RATE_Y = 0
export const LOAD_Y = RATE_ROW_H
export const LOAD_H = STEPS * HALF
export const COMMIT_Y = LOAD_Y + LOAD_H
export const BOARD_Y = COMMIT_Y + COMMIT_ROW_H
export const BOARD_H = STEPS * CELL
export const KEY_Y = BOARD_Y + BOARD_H
export const CANVAS_W = COLS * CELL
export const CANVAS_H = KEY_Y + KEYBED_H

export type ColorId = 'red' | 'yellow' | 'blue' | 'green'
export const COLOR_IDS: ColorId[] = ['red', 'yellow', 'blue', 'green']

export const INSTRUMENT_NAME: Record<ColorId, string> = {
  red: 'PIANO',
  yellow: 'DRUMS',
  blue: 'SYNTH',
  green: 'PADS',
}

// NES-ish palette. fill / dark bevel / light bevel per color.
export const BLOCK_COLORS: Record<ColorId, { fill: string; dark: string; lite: string }> = {
  red: { fill: '#d82800', dark: '#7c1000', lite: '#ff8a5c' },
  yellow: { fill: '#f8b800', dark: '#a06800', lite: '#ffe08a' },
  blue: { fill: '#3cbcfc', dark: '#1a6cb0', lite: '#a8e0ff' },
  green: { fill: '#58d854', dark: '#2c9838', lite: '#b0f0a8' },
}

// Pitch classes relative to C. Sharps are the "black key" columns.
export const BLACK_PC = new Set([1, 3, 6, 8, 10])
export const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function colToNoteName(col: number): string {
  const pc = col % 12
  const octave = 3 + Math.floor(col / 12)
  return `${PC_NAMES[pc]}${octave}`
}

// Drum machine lane map (yellow blocks): column -> kit piece, repeating.
export const DRUM_LANES = [
  'kick', 'snare', 'rim', 'clap', 'chh', 'ohh', 'ltom',
  'mtom', 'htom', 'crash', 'ride', 'shaker', 'cowbell',
] as const
export type DrumPiece = (typeof DRUM_LANES)[number]

export const DRUM_ABBREV: Record<DrumPiece, string> = {
  kick: 'KCK', snare: 'SNR', rim: 'RIM', clap: 'CLP', chh: 'CHH',
  ohh: 'OHH', ltom: 'LTM', mtom: 'MTM', htom: 'HTM', crash: 'CRS',
  ride: 'RID', shaker: 'SHK', cowbell: 'CWB',
}

export function colToDrum(col: number): DrumPiece {
  return DRUM_LANES[col % DRUM_LANES.length]
}

export type LoopRate = 1 | 2 | 4
export const MIN_BPM = 60
export const MAX_BPM = 180
export const DEFAULT_BPM = 90
