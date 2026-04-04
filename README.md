# CEP1 — Cinematic Effects Processor 1

**v1.0 by @floozyspeak // Dan Rockwell 2026**

A browser-based multi-effect audio pedal prototype themed around six iconic films. Upload an audio file or plug in a live microphone, dial in cinematic effects, trigger ambient soundscapes, and record a processed WAV — all inside the browser with no backend required.

---

## Overview

CEP1 is a fully client-side React app built on the Web Audio API. It presents itself as a dark industrial effects pedal board. Each of the six "schemas" (movie presets) reconfigures the entire effect chain with tailored default values, recolors the UI with the film's palette, and plays a layered ambient soundscape that runs completely independently of the input signal.

---

## Features

### Audio Sources
- **File Upload** — drag or click to load any MP3 or WAV file; plays through the full effect chain with transport controls (play / pause / stop)
- **Live Microphone** — streams your mic in real time through the same chain

### Ambient Playback
The **Ambient Off/On** button operates independently of any audio source. Press it at any time — even with no file loaded and no mic active — to immediately start the current schema's ambient soundscape looping through the full effects chain. This lets you sculpt the ambient sound alone, experiment with the knobs and Master Glitch on just the ambient layer, or layer it over a playing file. Press again to stop. Switching schemas while ambient is on seamlessly restarts it with the new schema's sounds.

### Effect Chain

Signal flows through nodes in this fixed order:

```
Input → Distortion (dry/wet) → Biquad Filter → Dynamics Compressor
      → Delay (7 modes, dry/wet) → Reverb/Convolver (dry/wet)
      → Flanger (LFO-modulated delay, dry/wet) → Master Gain
      → Analyser → Output + Recorder
```

Every parameter is exposed as a labeled rotary knob with drag and scroll-wheel interaction.

| Effect | Parameters |
|--------|-----------|
| Reverb | Mix, Decay (procedural impulse response, regenerated on decay change) |
| Distortion | Drive (waveshaper curve amount), Mix |
| Delay | Time, Feedback, Mix, **Mode** (7 algorithms), **Mod** (LFO depth) |
| Flanger | Depth, Rate, Mix |
| Filter | Type (lowpass / highpass / bandpass), Frequency, Q |
| Compressor | Threshold, Ratio, Attack, Release |
| Master | Volume, Ambient level |

### Delay Modes

The Delay panel exposes a 7-mode algorithm selector (pill buttons) plus a **Mod** knob:

| Mode | Algorithm | Character |
|------|-----------|-----------|
| **STD** | Single-tap delay with feedback | Clean digital echo |
| **MULTI** | 3-tap delay (25% / 50% / 100% of Time) | Rhythmic cascading echoes |
| **BBD** | Bucket-brigade analog: LPF + soft saturation in feedback + LFO wobble | Warm, slightly dark, subtly chorusing |
| **TAPE** | Tape echo: LPF + soft-clip + wow (0.8 Hz) + flutter (7.3 Hz) LFOs | Aged, drifting echoes with tape character |
| **VERB** | Reverb-in-feedback: short plate ConvolverNode recirculates each repeat | Reverb blooms inside every echo |
| **OCT** | Granular octave-up pitch shift (2× read speed) with internal feedback | Each repeat rises one octave |
| **SHIMMER** | ShimmerDelayProcessor (4096-sample grain, smoother than OCT) + ConvolverNode reverb wash on output | Shimmering, angelic trails |

The **Mod** knob controls LFO depth for BBD wobble and tape wow/flutter. All 7 sub-graphs are permanently wired in parallel via GainNode gates — switching is instant and click-free (30 ms cross-fade). Parallel-gate design avoids glitches on mode change. SHIMMER applies reverb externally (after the worklet) via a dedicated `shimConv` ConvolverNode.

### Signal Visualizer
Real-time canvas display with two modes switchable by toggle:
- **Oscilloscope** — time-domain waveform
- **Spectrum** — FFT frequency bars

### Master Glitch
A large red button that randomizes all effect parameters simultaneously, holds the chaos for 2–3 seconds, then snaps back to the active schema's defaults. Each press produces a unique sonic result.

### Clean Signal
Resets the entire effect chain to a transparent pass-through state — wet mixes zeroed, ambient off, filter and compressor set to neutral. Lights up when active. Cleared automatically when selecting a schema.

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
- A layered ambient soundscape (real audio files + procedural fallback)
- A tagline and character description shown in the Active Schema panel

### 1. Jurassic Park (1993) — `#4ade80` Green
> "Life finds a way"

Roaring reverbs and thunderous sub-bass. Long ambient delay trails decay like jungle footsteps.

- **Preset character:** High reverb mix (0.75), 4.5 s decay, moderate distortion, medium delay with significant feedback
- **Ambient:** 3 layered audio files — deep dino growl, colossal metallic roar, jungle soundscape; procedural fallback: 40 Hz sub-bass oscillator with LFO tremolo and harmonics at 80 / 120 Hz through a lowpass filter
- **Effect panels shown:** Reverb, Distortion, Delay, Filter, Ambient

### 2. Star Wars (1977) — `#facc15` Yellow
> "A long time ago in a galaxy far, far away"

Vast space reverb. Feedback delays trailing to infinity. Lightsaber shimmer from heavy flanger.

- **Preset character:** Very high reverb (0.88, 6.5 s), long delay with high feedback (0.72), pronounced flanger, highpass filter at 5500 Hz
- **Ambient:** 3 layered audio files — short laser blast, FM radio static (x2 variants); procedural fallback: two slightly detuned sine oscillators (240 / 241.5 Hz) producing a beating lightsaber hum, 120 Hz sub sine, slow amplitude LFO
- **Effect panels shown:** Reverb, Delay, Flanger, Filter, Ambient

### 3. The Texas Chain Saw Massacre (1974) — `#f97316` Orange
> "Who will survive and what will be left of them?"

Machine shop brutality. Maximum drive. Razor bandpass cut. The blade never stops.

- **Preset character:** Extreme distortion (360 drive, 0.82 mix), bandpass filter at 2200 Hz with high Q, ultra-fast compressor (1 ms attack, 16:1 ratio), high flanger rate (5.5 Hz)
- **Ambient:** 3 layered audio files — chainsaw loop (x2 variants), loud electric chain sound; procedural fallback: sawtooth oscillator through hard-clip distortion with LFO frequency modulation sweeping 80–160 Hz
- **Effect panels shown:** Distortion, Flanger, Compressor, Filter, Ambient

### 4. Alive (1993) — `#7dd3fc` Ice Blue
> "The story of 72 days in the Andes"

Frozen expanse. Howling wind. Maximum reverb. Every sound bleeds into white silence.

- **Preset character:** Near-total reverb (0.9, 5.5 s decay), very long delay (1.2 s, 0.65 feedback), gentle distortion, lowpass at 550 Hz
- **Ambient:** 2 layered audio files — snowy blizzard wind, arctic wind howling; procedural fallback: white noise through a slowly sweeping bandpass filter (200–2000 Hz over 8 s) with a 60 Hz sub drone on a 4 s amplitude LFO
- **Effect panels shown:** Reverb, Delay, Flanger (Shimmer), Filter, Ambient (Wind)

### 5. Contact (1997) — `#c084fc` Violet
> "If it's just us, it seems like an awful waste of space"

Interstellar reverb at maximum depth. Radio-filtered static. Echoes from the edge of the universe.

- **Preset character:** Maximum reverb (0.95, 8.5 s), very long delay (1.55 s, 0.80 feedback, 0.72 mix), bandpass filter at 1100 Hz with Q 6, AM-style radio distortion
- **Ambient:** 5 layered audio files — robot movement, machine loop, electric spark, military comms transmission, cosmic background radiation; procedural fallback: pink-ish noise through narrow bandpass at 1200 Hz with a sweeping LFO and a 432 Hz sine tone fading in/out over 15 s cycles
- **Effect panels shown:** Reverb, Delay, Filter (Signal), Distortion (Noise), Ambient

### 6. Scarface (1983) — `#f43f5e` Red
> "Say hello to my little friend"

Gated reverb. Pumping compression. Slap delay. 80s excess through a cocaine-dusted mixing board.

- **Preset character:** Heavy brick-wall compression (−12 dB threshold, 14:1 ratio, 2 ms attack), short gated reverb (0.6 mix, 1.5 s decay), tight slap delay (150 ms), highpass filter at 180 Hz
- **Ambient:** 1 audio file — WW2 battlefield soundscape; procedural fallback: look-ahead scheduler (`setInterval` + 2 s lookahead window) queuing kick drums (sine sweep 160→40 Hz) and hi-hats (8 kHz highpass noise) at 120 BPM four-on-the-floor, running indefinitely
- **Effect panels shown:** Compressor, Reverb (Gate), Delay (Slap), Distortion (Grind), Ambient (Rhythm)

---

## Architecture

```
artifacts/cep1/
├── src/
│   ├── audio/
│   │   ├── AudioEngine.ts       # Web Audio API singleton: nodes, wiring, init, record
│   │   └── ambientSynth.ts      # Ambient system: file loading, procedural fallbacks
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
│   ├── wav-recorder-worklet.js  # AudioWorklet processor: buffers samples → posts chunks
│   └── sounds/
│       ├── jurassic-park/       # layer-1.mp3, layer-2.mp3, layer-3.mp3
│       ├── star-wars/           # layer-1.mp3, layer-2.mp3, layer-3.mp3
│       ├── chainsaw-massacre/   # layer-1.mp3, layer-2.mp3, layer-3.mp3
│       ├── alive/               # layer-1.mp3, layer-2.mp3
│       ├── contact/             # layer-1.mp3 – layer-5.mp3
│       └── scarface/            # layer-1.mp3
└── vite.config.ts
```

### AudioEngine (`AudioEngine.ts`)
A plain TypeScript class exported as a module singleton (`export default new AudioEngine()`). Initialization is lazy — `initialize(baseUrl)` is called on the first user interaction to satisfy browser autoplay policy. The AudioContext is created at that point.

Key design notes:
- **Impulse response for reverb** is generated procedurally by `generateIR()` — exponentially-decaying noise shaped by the decay parameter; regenerated in real time when the Decay knob moves
- **Distortion curve** uses the standard soft-clip formula `(π + k)x / (π + k|x|)` at 512 samples, computed with 4× oversampling to reduce aliasing
- **Flanger** is implemented as a short (≤25 ms) delay with an LFO modulating the delay time; the LFO oscillator is started at engine init and runs continuously
- **WAV encoding** is done in-browser: the recorder worklet posts 128-sample Float32 chunks back to the main thread; on stop, `encodeWav()` builds a RIFF/WAVE header and interleaves PCM at 16-bit integer resolution into an `ArrayBuffer`, then triggers a download via a blob URL

### Ambient System (`ambientSynth.ts`)
Each schema's ambient is driven by real audio files fetched from `public/sounds/{schema}/layer-N.mp3`, decoded via `AudioContext.decodeAudioData()`, and played as looping `AudioBufferSourceNode` layers mixed through per-layer `GainNode`s into a single master gain bus.

The loading is handled by a shared `createFromFiles()` async helper. Schema file configs live in the `FILE_LAYERS` registry — adding a new schema just requires an entry there and a matching folder under `public/sounds/`. If any individual layer fails to decode it is silently skipped; if all layers fail the schema falls back to its procedural synthesizer registered in `FALLBACKS`.

Procedural fallback synths use only built-in Web Audio primitives:
- Oscillators (`OscillatorNode`) for tonal content
- `createBuffer` + `createBufferSource` for white noise (`Math.random() * 2 - 1`)
- `BiquadFilterNode` for spectral shaping
- `GainNode` with `AudioParam` automation for envelopes and LFO targets
- Additional `OscillatorNode` sources used as LFOs connected directly to `AudioParam`s

The Scarface procedural fallback uses a look-ahead scheduler: `setInterval` fires every 500 ms and schedules all drum events within the next 2-second window using precise `AudioContext` timestamps, producing a gapless, drift-free rhythm indefinitely.

### Hook (`useAudioEngine.ts`)
Wraps the engine singleton in React state. Key design points:

- `ensureInit()` checks `engine.isReady` (the engine's own `_initialized` flag) rather than a React ref, so HMR replacements and failed initializations don't lock the engine
- **Ambient is fully independent of playback state** — toggling ambient on initializes the engine and starts the loop immediately; pausing or stopping audio does not affect it; only explicit toggle-off or Clean Signal stops it
- Switching schemas while ambient is on restarts it for the new schema
- The ambient lifecycle is managed through a `useRef` holding the current `SchemaAmbient` object — switching schemas calls `stop()` on the previous one before starting the next

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

The app serves at the root path `/` with `BASE_PATH=/` injected by the artifact configuration. The AudioWorklet file at `public/wav-recorder-worklet.js` is served as a static asset at `/wav-recorder-worklet.js`. Sound files in `public/sounds/` are served as static assets and fetched at runtime when ambient is activated.

---

## Browser Requirements

- Any modern browser with Web Audio API support (Chrome, Firefox, Edge, Safari 14.1+)
- AudioWorklet (for recording): Chrome 66+, Firefox 76+, Safari 14.1+
- If AudioWorklet is unavailable the engine initializes normally — only WAV recording is disabled
- Microphone input requires HTTPS or localhost and user permission grant
