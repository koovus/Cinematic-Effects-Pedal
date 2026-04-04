// Shared ring-buffer granular pitch-shift engine used by both processors.
// writePos, two read heads with Hann crossfade, internal feedback loop.

function makeGranularPitchEngine(grainSize) {
  return {
    bufSize: Math.ceil(3 * sampleRate),
    buf: new Float32Array(Math.ceil(3 * sampleRate)),
    writePos: 0,
    grainSize,
    readPos: [0, 0],
    phase: [0, grainSize / 2],
    firstRun: true,
    lastDelayTime: 0.5,
  };
}

function processPitchEngine(eng, inp, out, delayTime, feedback, pitchRatio) {
  const delaySamples = Math.max(eng.grainSize * 2, Math.round(delayTime * sampleRate));

  if (eng.firstRun || Math.abs(delayTime - eng.lastDelayTime) > 0.01) {
    eng.readPos[0] = (eng.writePos - delaySamples + eng.bufSize) % eng.bufSize;
    eng.readPos[1] = (eng.readPos[0] + eng.grainSize / 2) % eng.bufSize;
    eng.phase = [0, eng.grainSize / 2];
    eng.firstRun = false;
    eng.lastDelayTime = delayTime;
  }

  for (let i = 0; i < inp.length; i++) {
    eng.buf[eng.writePos] = inp[i];

    let pitchShifted = 0;
    for (let h = 0; h < 2; h++) {
      const p = eng.phase[h] % eng.grainSize;
      const w = 0.5 * (1 - Math.cos(2 * Math.PI * p / eng.grainSize));
      const ri = (Math.floor(eng.readPos[h]) + eng.bufSize) % eng.bufSize;
      pitchShifted += eng.buf[ri] * w;

      eng.readPos[h] = (eng.readPos[h] + pitchRatio) % eng.bufSize;
      eng.phase[h]   = (eng.phase[h]   + pitchRatio) % eng.grainSize;

      const dist = (eng.writePos - Math.floor(eng.readPos[h]) + eng.bufSize) % eng.bufSize;
      if (dist < eng.grainSize) {
        eng.readPos[h] = (eng.writePos - delaySamples + h * (eng.grainSize / 2) + eng.bufSize) % eng.bufSize;
        eng.phase[h] = h * (eng.grainSize / 2);
      }
    }

    eng.buf[eng.writePos] = inp[i] + pitchShifted * feedback;
    out[i] = pitchShifted;

    eng.writePos = (eng.writePos + 1) % eng.bufSize;
  }
}

// ---------------------------------------------------------------------------
// oct-delay: tight grain (1024 samples ≈ 23ms) — precise octave-up echo
// ---------------------------------------------------------------------------
class OctDelayProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "delayTime",  defaultValue: 0.5, minValue: 0.001, maxValue: 2.5, automationRate: "k-rate" },
      { name: "feedback",   defaultValue: 0.5, minValue: 0,     maxValue: 0.95, automationRate: "k-rate" },
      { name: "pitchRatio", defaultValue: 2.0, minValue: 0.5,   maxValue: 4.0,  automationRate: "k-rate" },
    ];
  }
  constructor() {
    super();
    this._eng = makeGranularPitchEngine(1024);
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0]?.[0];
    const out = outputs[0]?.[0];
    if (!inp || !out) return true;
    processPitchEngine(
      this._eng, inp, out,
      parameters.delayTime[0]  ?? 0.5,
      parameters.feedback[0]   ?? 0.5,
      parameters.pitchRatio[0] ?? 2.0
    );
    return true;
  }
}

// ---------------------------------------------------------------------------
// shimmer-delay: wide grain (4096 samples ≈ 93ms) — smoother shimmer tail
// Reverb wash is added externally in AudioEngine (shimConv ConvolverNode).
// ---------------------------------------------------------------------------
class ShimmerDelayProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "delayTime",  defaultValue: 0.5, minValue: 0.001, maxValue: 2.5, automationRate: "k-rate" },
      { name: "feedback",   defaultValue: 0.5, minValue: 0,     maxValue: 0.95, automationRate: "k-rate" },
      { name: "pitchRatio", defaultValue: 2.0, minValue: 0.5,   maxValue: 4.0,  automationRate: "k-rate" },
    ];
  }
  constructor() {
    super();
    this._eng = makeGranularPitchEngine(4096);
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0]?.[0];
    const out = outputs[0]?.[0];
    if (!inp || !out) return true;
    processPitchEngine(
      this._eng, inp, out,
      parameters.delayTime[0]  ?? 0.5,
      parameters.feedback[0]   ?? 0.5,
      parameters.pitchRatio[0] ?? 2.0
    );
    return true;
  }
}

registerProcessor("oct-delay",     OctDelayProcessor);
registerProcessor("shimmer-delay", ShimmerDelayProcessor);
