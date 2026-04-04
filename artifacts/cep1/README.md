# CEP1 — Cinematic Effects Processor 1

A browser-based multi-effect audio pedal prototype themed around six iconic films. Upload an audio file or plug in a live microphone, dial in cinematic effects, trigger ambient soundscapes, and record a processed WAV — all inside the browser with no backend required.

---

## Overview

CEP1 is a fully client-side React app built on the Web Audio API. It presents itself as a dark industrial effects pedal board. Each of the six "schemas" (movie presets) reconfigures the entire effect chain with tailored default values, recolors the UI with the film's palette, and launches a procedurally synthesized ambient texture that plays independently of the input signal.

---

## Features

### Audio Sources
- **File Upload** — drag or click to load any MP3 or WAV file; plays through the full effect chain with transport controls (play / pause / stop)
- **Live Microphone** — streams your mic in real time through the same chain

### Effect Chain

Signal flows through nodes in this fixed order:

```
Input → Distortion (dry/wet) → Biquad Filter → Dynamics Compressor
      → Delay (dry/wet, feedback loop) → Reverb/Convolver (dry/wet)
      → Flanger (LFO-modulated delay, dry/wet) → Master Gain
      → Analyser → Output + Recorder
```

Every parameter is exposed as a labeled rotary knob with drag and scroll-wheel interaction.

| Effect | Parameters |
|--------|-----------|
| Reverb | Mix, Decay (procedural impulse response, regenerated on decay change) |
| Distortion | Drive (waveshaper curve amount), Mix |
| Delay | Time, Feedback, Mix |
| Flanger | Depth, Rate, Mix |
| Filter | Type (lowpass / highpass / bandpass), Frequency, Q |
| Compressor | Threshold, Ratio, Attack, Release |
| Master | Volume, Ambient level |

### Signal Visualizer
Real-time canvas display with two modes switchable by toggle:
- **Oscilloscope** — time-domain waveform
- **Spectrum** — FFT frequency bars

### Master Glitch
A large red button that randomizes all effect parameters simultaneously, holds the chaos for 2–3 seconds, then snaps back to the active schema's defaults. Each press produces a unique sonic result.

### Recording
- Press **REC** to start capturing the processed stereo output
- Press again to stop and immediately download a 16-bit, 44.1 kHz stereo WAV file
- Recording uses an AudioWorklet node (`wav-recorder-worklet.js`) that accumulates Float32 samples, then a custom WAV encoder writes the file header and interleaved PCM data entirely in-browser
- If the AudioWorklet fails to load (e.g. unsupported browser), the rest of the engine degrades gracefully — playback and effects continue working

---

## Movie Schemas

Each schema sets:
- A full effect parameter preset
- A color theme (accent color, background gradient, knob colors)
- A set of visible effect panels (each film highlights what matters for that sound)
- A procedurally synthesized ambient texture
- A tagline and character description shown in the Active Schema panel

### 1. Jurassic Park (1993) — `#4ade80` Green
> "Life finds a way"

Roaring reverbs and thunderous sub-bass. Long ambient delay trails decay like jungle footsteps.

- **Preset character:** High reverb mix (0.75), 4.5 s decay, moderate distortion, medium delay with significant feedback
- **Ambient:** Sub-bass dino rumble — a deep 40 Hz oscillator with slow LFO tremolo and harmonics at 80 Hz / 120 Hz, routed through a lowpass filter
- **Effect panels shown:** Reverb, Distortion, Delay, Filter, Ambient

### 2. Star Wars (1977) — `#facc15` Yellow
> "A long time ago in a galaxy far, far away"

Vast space reverb. Feedback delays trailing to infinity. Lightsaber shimmer from heavy flanger.

- **Preset character:** Very high reverb (0.88, 6.5 s), long delay with high feedback (0.72), pronounced flanger, highpass filter at 5500 Hz
- **Ambient:** Lightsaber hum — two slightly detuned sine oscillators (240 Hz + 241.5 Hz) produce beating; a 120 Hz sub sine adds body; a slow LFO modulates volume
- **Effect panels shown:** Reverb, Delay, Flanger, Filter, Ambient

### 3. The Texas Chain Saw Massacre (1974) — `#f97316` Orange
> "Who will survive and what will be left of them?"

Machine shop brutality. Maximum drive. Razor bandpass cut. The blade never stops.

- **Preset character:** Extreme distortion (360 drive, 0.82 mix), bandpass filter at 2200 Hz with high Q, ultra-fast compressor (1 ms attack, 16:1 ratio), high flanger rate (5.5 Hz)
- **Ambient:** Chainsaw loop — a sawtooth oscillator through hard-clip distortion with LFO frequency modulation that sweeps 80–160 Hz, giving the characteristic revving texture
- **Effect panels shown:** Distortion, Flanger, Compressor, Filter, Ambient

### 4. Alive (1993) — `#7dd3fc` Ice Blue
> "The story of 72 days in the Andes"

Frozen expanse. Howling wind. Maximum reverb. Every sound bleeds into white silence.

- **Preset character:** Near-total reverb (0.9, 5.5 s decay), very long delay (1.2 s, 0.65 feedback), gentle distortion, lowpass at 550 Hz
- **Ambient:** Icy wind — filtered white noise through a slowly sweeping bandpass filter (200–2000 Hz over 8 s) layered with a 60 Hz sub drone whose amplitude fluctuates on a 4 s LFO
- **Effect panels shown:** Reverb, Delay, Flanger (Shimmer), Filter, Ambient (Wind)

### 5. Contact (1997) — `#c084fc` Violet
> "If it's just us, it seems like an awful waste of space"

Interstellar reverb at maximum depth. Radio-filtered static. Echoes from the edge of the universe.

- **Preset character:** Maximum reverb (0.95, 8.5 s), very long delay (1.55 s, 0.80 feedback, 0.72 mix), bandpass filter at 1100 Hz with Q 6, AM-style radio distortion
- **Ambient:** Interstellar static — pink-ish noise through a narrow bandpass at 1200 Hz; a slow LFO sweeps another bandpass from 400–4000 Hz; a sine tone at 432 Hz fades in and out over 15 s cycles, simulating a weak transmission
- **Effect panels shown:** Reverb, Delay, Filter (Signal), Distortion (Noise), Ambient

### 6. Scarface (1983) — `#f43f5e` Red
> "Say hello to my little friend"

Gated reverb. Pumping compression. Slap delay. 80s excess through a cocaine-dusted mixing board.

- **Preset character:** Heavy brick-wall compression (−12 dB threshold, 14:1 ratio, 2 ms attack), short gated reverb (0.6 mix, 1.5 s decay), tight slap delay (150 ms), highpass filter at 180 Hz
- **Ambient:** 80s drum machine — a look-ahead scheduler (`setInterval` + lookahead window) continuously queues kick drums (sine sweep 160→40 Hz with amplitude envelope) and hi-hats (white noise through 8 kHz highpass) at 120 BPM in a four-on-the-floor pattern; runs indefinitely without a pre-scheduled cutoff
- **Effect panels shown:** Compressor, Reverb (Gate), Delay (Slap), Distortion (Grind), Ambient (Rhythm)

---

## Architecture

```
artifacts/cep1/
├── src/
│   ├── audio/
│   │   ├── AudioEngine.ts       # Web Audio API singleton: nodes, wiring, init, record
│   │   └── ambientSynth.ts      # Procedural ambient generator (one per schema)
│   ├── schemas/
│   │   ├── types.ts             # TypeScript interfaces (MovieSchema, EffectSettings, etc.)
│   │   └── definitions.ts       # All 6 schema objects with defaults + knob configs
│   ├── hooks/
│   │   └── useAudioEngine.ts    # React hook wrapping AudioEngine + ambient lifecycle
│   ├── components/
│   │   ├── KnobControl.tsx      # SVG rotary knob (drag + scroll interaction)
│   │   └── Waveform.tsx         # requestAnimationFrame canvas oscilloscope/spectrum
│   └── pages/
│       └── PedalBoard.tsx       # Main UI layout — schema bar, effect panels, controls
├── public/
│   └── wav-recorder-worklet.js  # AudioWorklet processor: buffers samples → posts chunks
└── vite.config.ts
```

### AudioEngine (`AudioEngine.ts`)
A plain TypeScript class exported as a module singleton (`export default new AudioEngine()`). Initialization is lazy — `initialize(baseUrl)` is called on the first user interaction to satisfy browser autoplay policy. The AudioContext is created at that point.

Key design notes:
- **Impulse response for reverb** is generated procedurally by `generateIR()` — exponentially-decaying noise shaped by the decay parameter; regenerated in real time when the Decay knob moves
- **Distortion curve** uses the standard soft-clip formula `(π + k)x / (π + k|x|)` at 512 samples, computed with 4× oversampling to reduce aliasing
- **Flanger** is implemented as a short (≤25 ms) delay with an LFO modulating the delay time; the LFO oscillator is started at engine init and runs continuously
- **WAV encoding** is done in-browser: the recorder worklet posts 128-sample Float32 chunks back to the main thread; on stop, `encodeWav()` builds a RIFF/WAVE header and interleaves PCM at 16-bit integer resolution into an `ArrayBuffer`, then triggers a download via a blob URL

### Ambient Synthesis (`ambientSynth.ts`)
Each schema's ambient function creates Web Audio nodes directly on the shared AudioContext and returns an object with an `outputNodes` array and a `stop()` function. Nodes are connected to the engine's ambient gain bus via `connectAmbient()`. All synthesis uses only built-in Web Audio primitives — no sample files:

- Oscillators (`OscillatorNode`) for tonal content
- `createBuffer` + `createBufferSource` for white noise (filled with `Math.random() * 2 - 1`)
- `BiquadFilterNode` for spectral shaping
- `GainNode` with `AudioParam` automation for envelopes and LFO targets
- Additional `OscillatorNode` sources used as LFOs, connected to `AudioParam`s for modulation

The Scarface ambient uses a Web Audio look-ahead scheduler pattern: a `setInterval` fires every 500 ms and schedules all events within the next 2-second lookahead window using precise `AudioContext` timestamps, producing a gapless, drift-free rhythm that runs indefinitely.

### Hook (`useAudioEngine.ts`)
Wraps the engine singleton in React state. `ensureInit()` checks `engine.isReady` (the engine's own `_initialized` flag) rather than a React ref, so HMR module replacements and failed initializations don't lock the engine in a permanently-broken state. The ambient lifecycle is managed through a `useRef` holding the current `SchemaAmbient` object — switching schemas or toggling ambient calls `stop()` on the previous one before starting the next.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| Audio | Web Audio API (no external audio libraries) |
| Recording | AudioWorklet + custom WAV encoder |
| Package manager | pnpm (monorepo workspace) |

---

## Development

```bash
# Install dependencies from monorepo root
pnpm install

# Start the dev server (hot reload)
pnpm --filter @workspace/cep1 run dev

# Type check
pnpm --filter @workspace/cep1 run typecheck

# Production build
pnpm --filter @workspace/cep1 run build
```

The app serves at the root path `/` with `BASE_PATH=/` injected by the artifact configuration. The AudioWorklet file at `public/wav-recorder-worklet.js` is served as a static asset at `/wav-recorder-worklet.js`.

---

## Browser Requirements

- Any modern browser with Web Audio API support (Chrome, Firefox, Edge, Safari 14.1+)
- AudioWorklet (for recording): Chrome 66+, Firefox 76+, Safari 14.1+
- If AudioWorklet is unavailable the engine initializes normally — only WAV recording is disabled
- Microphone input requires HTTPS or localhost and user permission grant
