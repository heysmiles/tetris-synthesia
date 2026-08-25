import { ColorId, LoopRate } from './constants'
import { Cell } from './shapes'

export interface Preset {
  name: string
  bpm: number
  rates: Record<number, LoopRate>
  shapes: { color: ColorId; cells: Cell[] }[]
}

// KOROBEINIKI — the public-domain Russian folk melody behind Tetris "Theme A".
// The opening phrase is exactly 16 eighth notes, so it maps 1:1 onto the
// 16-step loop (1 step = 1 song eighth; at 75 BPM the tune runs at its
// classic ~150 BPM feel).
//
// Column map (C3 = col 0, chromatic): E3=4, G3=7, A3=9, B3=11, C4=12, D4=14, E4=16.
// Melody steps:  E4 B3 C4 D4 | C4 B3 A3 A3 | C4 E4 D4 C4 | B3 B3 C4 D4
// Loading-zone row = 15 - step (bottom row strikes on beat 1).
export const KOROBEINIKI: Preset = {
  name: 'KOROBEINIKI',
  bpm: 75,
  rates: {
    0: 4, // kick: four on the floor
    4: 4, // E3 bass: two notes in the 4-step period = driving eighths
    17: 2, // closed hats: offbeats
  },
  shapes: [
    // ---- melody (blue synth lead) ----
    { color: 'blue', cells: [{ c: 16, r: 15 }] }, // E4  step 0
    { color: 'blue', cells: [{ c: 11, r: 14 }] }, // B3  step 1
    { color: 'blue', cells: [{ c: 12, r: 13 }] }, // C4  step 2
    { color: 'blue', cells: [{ c: 14, r: 12 }] }, // D4  step 3
    { color: 'blue', cells: [{ c: 12, r: 11 }] }, // C4  step 4
    { color: 'blue', cells: [{ c: 11, r: 10 }] }, // B3  step 5
    { color: 'blue', cells: [{ c: 9, r: 8 }, { c: 9, r: 9 }] }, // A3 steps 6-7 (held)
    { color: 'blue', cells: [{ c: 12, r: 7 }] }, // C4  step 8
    { color: 'blue', cells: [{ c: 16, r: 6 }] }, // E4  step 9
    { color: 'blue', cells: [{ c: 14, r: 5 }] }, // D4  step 10
    { color: 'blue', cells: [{ c: 12, r: 4 }] }, // C4  step 11
    { color: 'blue', cells: [{ c: 11, r: 2 }, { c: 11, r: 3 }] }, // B3 steps 12-13 (held)
    { color: 'blue', cells: [{ c: 12, r: 1 }] }, // C4  step 14
    { color: 'blue', cells: [{ c: 14, r: 0 }] }, // D4  step 15
    // ---- bass (red piano, E3 eighths via rate x4) ----
    { color: 'red', cells: [{ c: 4, r: 15 }] }, // strikes 0,4,8,12
    { color: 'red', cells: [{ c: 4, r: 13 }] }, // strikes 2,6,10,14
    // ---- pad (green, G3 breathing chord tone) ----
    { color: 'green', cells: [{ c: 7, r: 12 }, { c: 7, r: 13 }, { c: 7, r: 14 }, { c: 7, r: 15 }] },
    { color: 'green', cells: [{ c: 7, r: 4 }, { c: 7, r: 5 }, { c: 7, r: 6 }, { c: 7, r: 7 }] },
    // ---- drums (yellow) ----
    { color: 'yellow', cells: [{ c: 0, r: 15 }] }, // kick, every beat (rate x4)
    { color: 'yellow', cells: [{ c: 1, r: 11 }] }, // snare, step 4
    { color: 'yellow', cells: [{ c: 1, r: 3 }] }, // snare, step 12
    { color: 'yellow', cells: [{ c: 17, r: 13 }] }, // closed hat, offbeats (rate x2)
    { color: 'yellow', cells: [{ c: 17, r: 9 }] },
  ],
}
