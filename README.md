# TETRIS SYNTHESIA

A live loop sequencer disguised as a game of Tetris crossed with a Synthesia
falling-notes video. Build beats by placing tetromino blocks in a loading zone;
committed blocks rain down the board on a repeating loop and play notes when
they land on the keyboard — instrument by color, pitch by column, sustain by
block height.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173, choose **JAM** (this also unlocks audio and loads
the sample sets).

## How it works — the timing model

- **One loop = 1 bar of 4/4 = 16 steps**, each step a 16th note.
- **The board is 16 rows tall; 1 row = 1 step.** One full descent = one bar, so
  falling blocks are literally the upcoming bar, Synthesia-style.
- **Note duration = block height**: a 1-tall block is a 16th-note stab, 4-tall
  is a quarter note.
- Blocks hop one cell per step — discrete NES gravity synced to the beat.
- **Per-column loop rate** (the `x1 / x2 / x4` row at the very top): how often
  that column's pattern re-drops — every 16, 8, or 4 steps.
- **Tempo** is the LEVEL panel (60–180 BPM, default 90).

## Colors = instruments

| Color | Instrument |
|---|---|
| 🟥 Red | Piano — Salamander Grand samples (CC-BY), FM fallback offline |
| 🟨 Yellow | Drum machine — column picks the kit piece, not a pitch |
| 🟦 Blue | Square-wave lead synth |
| 🟩 Green | Pads (slow attack, reverb) |

Drum lanes left→right (repeating): kick, snare, rim, clap, closed hat, open
hat, low/mid/high tom, crash, ride, shaker, cowbell. Select yellow to see lane
labels on the keys. Closed hat chokes open hat.

## Workflow

1. Pick a shape and color (buttons in NEXT, or `Q`/`E` + `1–4`; `↑` rotates).
2. Click in the **loading zone** (upper grid) to place it. Vertical position =
   when in the bar it strikes (bottom row = beat 1).
3. Commit: click a column's **✓** or press **Enter** (commits every column
   with staged blocks). Committing while playing joins at the next 16th note —
   perceptually instant, always on-grid.
4. **Space** plays/pauses. Pause, rearrange, recommit, resume.
5. Drag staged shapes to move them; right-click deletes; click a piano key to
   audition the selected instrument.

Sessions autosave to localStorage; SAVE/LOAD exports/imports a JSON loop file.

## Preset: ♪ THEME A

The **♪ THEME A** button loads a bundled arrangement of **Korobeiniki** — the
public-domain Russian folk melody behind Tetris "Theme A". Its opening phrase
is exactly 16 eighth notes, mapping 1:1 onto the 16-step loop: blue synth
melody across five pitch columns, red E3 bass pumping eighths at rate ×4,
green G3 pad, kick on every beat, backbeat snare, and offbeat closed hats.
Loading it replaces your current loop (it asks first) — SAVE yours to keep it.

## Not implemented yet (roadmap)

- 2-bar / 32-step mode
- Velocity from drop type (all notes play at fixed velocity)
- Stack Mode (blocks piling up instead of vanishing)

## Credits

Piano: [Salamander Grand Piano](https://github.com/sfzinstruments/SalamanderGrandPiano)
(Alexander Holm, CC-BY), hosted by Tone.js. Drum one-shots from the Tone.js
community drum samples. All pixel art is original, drawn in tribute to the
NES/GBC era; not affiliated with The Tetris Company.
