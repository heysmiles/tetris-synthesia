import * as Tone from 'tone'
import {
  ColorId, COLOR_IDS, STEPS, colToNoteName, colToDrum, DrumPiece,
} from '../model/constants'
import { store, strikesAt } from '../model/store'

// All scheduling goes through Tone.Transport so loops, tempo changes and
// next-step-quantized joins stay sample-accurate. The tick callback reads the
// store's committed columns live, which is what makes "commit while playing,
// join at the next 16th" work with zero extra machinery.

let inited = false
let ready = false
let stepCounter = 0

let limiter: Tone.Limiter
let gains: Record<ColorId, Tone.Gain>
let piano: Tone.Sampler
let pianoFallback: Tone.PolySynth
let lead: Tone.PolySynth
let pads: Tone.PolySynth

let drumPlayers: Tone.Players
let noiseHit: Tone.NoiseSynth // snare/clap/shaker fallback family
let clapSynth: Tone.NoiseSynth
let shakerSynth: Tone.NoiseSynth
let membrane: Tone.MembraneSynth // kick/tom/rim fallback family
let metalOhh: Tone.MetalSynth
let metalCrash: Tone.MetalSynth
let metalRide: Tone.MetalSynth
let metalCowbell: Tone.MetalSynth
let uiBlip: Tone.Synth

export function isReady() {
  return ready
}

export async function init(): Promise<void> {
  if (inited) return
  inited = true

  limiter = new Tone.Limiter(-3).toDestination()
  gains = {} as Record<ColorId, Tone.Gain>
  for (const c of COLOR_IDS) {
    gains[c] = new Tone.Gain(store.state.volumes[c]).connect(limiter)
  }

  // RED — sampled grand (Salamander, CC-BY, hosted by Tone.js), FM EP fallback.
  piano = new Tone.Sampler({
    urls: {
      C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
      C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3', C5: 'C5.mp3',
    },
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    release: 1,
  }).connect(gains.red)
  pianoFallback = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2,
    modulationIndex: 3,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.6, sustain: 0.4, release: 0.8 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.5 },
  }).connect(gains.red)

  // BLUE — chiptune-adjacent lead with filter envelope.
  lead = new Tone.PolySynth(Tone.MonoSynth, {
    oscillator: { type: 'square' },
    filter: { type: 'lowpass', Q: 2 },
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.5, release: 0.15 },
    filterEnvelope: {
      attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.2,
      baseFrequency: 300, octaves: 3.2,
    },
  }).connect(gains.blue)
  lead.maxPolyphony = 12

  // GREEN — slow pads through reverb.
  const padVerb = new Tone.Reverb({ decay: 4, wet: 0.35 }).connect(gains.green)
  pads = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 3, spread: 24 } as any,
    envelope: { attack: 0.3, decay: 0.4, sustain: 0.8, release: 1.6 },
  }).connect(padVerb)
  pads.maxPolyphony = 12
  pads.volume.value = -8

  // YELLOW — sampled acoustic kit for the core pieces, synthesized for the rest.
  drumPlayers = new Tone.Players({
    urls: {
      kick: 'kick.mp3', snare: 'snare.mp3', hihat: 'hihat.mp3',
      tom1: 'tom1.mp3', tom2: 'tom2.mp3', tom3: 'tom3.mp3',
    },
    baseUrl: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/',
  }).connect(gains.yellow)
  membrane = new Tone.MembraneSynth({
    pitchDecay: 0.04, octaves: 6,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0 },
  }).connect(gains.yellow)
  noiseHit = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
  }).connect(gains.yellow)
  clapSynth = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.002, decay: 0.18, sustain: 0 },
  }).connect(gains.yellow)
  shakerSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
  }).connect(gains.yellow)
  shakerSynth.volume.value = -10
  metalOhh = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.4, release: 0.1 },
    harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  }).connect(gains.yellow)
  metalOhh.volume.value = -14
  metalCrash = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 1.2, release: 0.4 },
    harmonicity: 5.1, modulationIndex: 40, resonance: 4000, octaves: 1.5,
  }).connect(gains.yellow)
  metalCrash.volume.value = -14
  metalRide = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.6, release: 0.2 },
    harmonicity: 8, modulationIndex: 20, resonance: 6000, octaves: 1,
  }).connect(gains.yellow)
  metalRide.volume.value = -16
  metalCowbell = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.25, release: 0.05 },
    harmonicity: 4.1, modulationIndex: 16, resonance: 800, octaves: 0.5,
  }).connect(gains.yellow)
  metalCowbell.volume.value = -10

  uiBlip = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.02 },
  }).connect(limiter)
  uiBlip.volume.value = -16

  Tone.Transport.bpm.value = store.state.bpm

  // The heartbeat: one callback per 16th note.
  Tone.Transport.scheduleRepeat((time) => {
    const step = stepCounter
    stepCounter = (stepCounter + 1) % STEPS
    const { columns } = store.state
    const stepSec = Tone.Time('16n').toSeconds()
    let triggered = 0

    for (let c = 0; c < columns.length; c++) {
      const col = columns[c]
      if (!col.active) continue
      for (const note of col.notes) {
        if (!strikesAt(note, col.rate, step)) continue
        triggered++
        playNote(note.color, c, note.dur * stepSec, time, 0.8)
      }
    }

    // Update state synchronously with the tick: the transport clock runs in a
    // worker, so this never skips even when the tab is hidden. (Tone.Draw
    // would drop updates in a backgrounded tab — its rAF queue expires.)
    store.setStep(step)
    if (triggered) store.addScore(triggered)
  }, '16n')

  // Wait (bounded) for samples so first playback uses the real piano/kit.
  try {
    await Promise.race([
      Tone.loaded(),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ])
  } catch {
    // offline — fallback synths cover everything
  }
  ready = true
}

function playNote(color: ColorId, col: number, durSec: number, time: number, vel: number) {
  switch (color) {
    case 'red': {
      const name = colToNoteName(col)
      if (piano.loaded) piano.triggerAttackRelease(name, durSec, time, vel)
      else pianoFallback.triggerAttackRelease(name, durSec, time, vel)
      break
    }
    case 'blue':
      lead.triggerAttackRelease(colToNoteName(col), durSec, time, vel)
      break
    case 'green':
      pads.triggerAttackRelease(colToNoteName(col), durSec, time, vel)
      break
    case 'yellow':
      playDrum(colToDrum(col), time, vel)
      break
  }
}

function playDrum(piece: DrumPiece, time: number, vel: number) {
  const sample = (name: string, opts?: { rate?: number; dur?: number }) => {
    if (drumPlayers.has(name) && drumPlayers.player(name).loaded) {
      const p = drumPlayers.player(name)
      p.playbackRate = opts?.rate ?? 1
      p.start(time, 0, opts?.dur)
      return true
    }
    return false
  }
  switch (piece) {
    case 'kick':
      if (!sample('kick')) membrane.triggerAttackRelease('C1', 0.3, time, vel)
      break
    case 'snare':
      if (!sample('snare')) noiseHit.triggerAttackRelease(0.15, time, vel)
      break
    case 'rim':
      membrane.triggerAttackRelease('A3', 0.04, time, vel * 0.7)
      break
    case 'clap':
      clapSynth.triggerAttackRelease(0.18, time, vel)
      break
    case 'chh':
      // closed hat chokes the open hat — standard drum-machine behavior
      metalOhh.triggerRelease(time)
      if (!sample('hihat', { dur: 0.08 })) shakerSynth.triggerAttackRelease(0.04, time, vel)
      break
    case 'ohh':
      metalOhh.triggerAttackRelease('A5', 0.5, time, vel * 0.6)
      break
    case 'ltom':
      if (!sample('tom1')) membrane.triggerAttackRelease('G1', 0.25, time, vel)
      break
    case 'mtom':
      if (!sample('tom2')) membrane.triggerAttackRelease('C2', 0.25, time, vel)
      break
    case 'htom':
      if (!sample('tom3')) membrane.triggerAttackRelease('F2', 0.25, time, vel)
      break
    case 'crash':
      metalCrash.triggerAttackRelease('C6', 1.2, time, vel * 0.5)
      break
    case 'ride':
      metalRide.triggerAttackRelease('D6', 0.6, time, vel * 0.5)
      break
    case 'shaker':
      shakerSynth.triggerAttackRelease(0.05, time, vel)
      break
    case 'cowbell':
      metalCowbell.triggerAttackRelease('G#5', 0.25, time, vel * 0.6)
      break
  }
}

// ---- public controls ----

export async function unlock() {
  await Tone.start()
}

export function play() {
  Tone.Transport.start()
  store.setPlaying(true)
}

export function pause() {
  Tone.Transport.pause()
  store.setPlaying(false)
}

export function togglePlay() {
  if (store.state.playing) pause()
  else play()
}

export function setBpm(bpm: number) {
  Tone.Transport.bpm.value = bpm
}

export function setVolume(color: ColorId, v: number) {
  if (gains?.[color]) gains[color].gain.rampTo(v, 0.05)
}

// Immediate one-shot for clicking piano keys / placing blocks.
export function audition(color: ColorId, col: number) {
  if (!inited) return
  const now = Tone.now()
  playNote(color, col, Tone.Time('8n').toSeconds(), now, 0.8)
}

export function blip(freq = 880) {
  if (!inited) return
  uiBlip.triggerAttackRelease(freq, 0.05, Tone.now())
}
