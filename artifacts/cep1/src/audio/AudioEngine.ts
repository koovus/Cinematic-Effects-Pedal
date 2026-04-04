import type { EffectSettings, BiquadType, DelayMode } from "../schemas/types";

function generateIR(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * duration);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function makeDistCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 512;
  const curve = new Float32Array(n) as Float32Array<ArrayBuffer>;
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (k === 0) {
      curve[i] = x;
    } else {
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
  }
  return curve;
}

function encodeWav(
  leftChunks: Float32Array[],
  rightChunks: Float32Array[],
  sampleRate: number
): Blob {
  const totalLen = leftChunks.reduce((acc, c) => acc + c.length, 0);
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = totalLen * numChannels * (bitsPerSample / 8);
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  let leftOffset = 0;
  for (let ci = 0; ci < leftChunks.length; ci++) {
    const lc = leftChunks[ci];
    const rc = rightChunks[leftOffset] ?? lc;
    for (let i = 0; i < lc.length; i++) {
      const ls = Math.max(-1, Math.min(1, lc[i]));
      const rs = Math.max(-1, Math.min(1, rc[i]));
      view.setInt16(offset, ls < 0 ? ls * 0x8000 : ls * 0x7fff, true);
      offset += 2;
      view.setInt16(offset, rs < 0 ? rs * 0x8000 : rs * 0x7fff, true);
      offset += 2;
    }
    leftOffset++;
  }
  return new Blob([buf], { type: "audio/wav" });
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private _initialized = false;

  private sourceGain!: GainNode;

  private distNode!: WaveShaperNode;
  private distDry!: GainNode;
  private distWet!: GainNode;
  private distMix!: GainNode;

  private filterNode!: BiquadFilterNode;
  private compNode!: DynamicsCompressorNode;

  private delayDry!: GainNode;
  private delayWet!: GainNode;
  private delayMix!: GainNode;

  private stdDelay!: DelayNode;
  private stdFb!: GainNode;
  private stdGate!: GainNode;

  private mt1!: DelayNode;
  private mt2!: DelayNode;
  private mt3!: DelayNode;
  private mt1G!: GainNode;
  private mt2G!: GainNode;
  private mt3G!: GainNode;
  private mtMerge!: GainNode;
  private mtGate!: GainNode;

  private bbdDelay!: DelayNode;
  private bbdFb!: GainNode;
  private bbdFilter!: BiquadFilterNode;
  private bbdSat!: WaveShaperNode;
  private bbdLfo!: OscillatorNode;
  private bbdLfoGain!: GainNode;
  private bbdGate!: GainNode;

  private tapeDelay!: DelayNode;
  private tapeFb!: GainNode;
  private tapeFilter!: BiquadFilterNode;
  private tapeSat!: WaveShaperNode;
  private wowLfo!: OscillatorNode;
  private wowGain!: GainNode;
  private flutterLfo!: OscillatorNode;
  private flutterGain!: GainNode;
  private tapeGate!: GainNode;

  private verbDelay!: DelayNode;
  private verbFb!: GainNode;
  private verbConv!: ConvolverNode;
  private verbGate!: GainNode;

  private octWorklet: AudioWorkletNode | null = null;
  private octGate!: GainNode;

  private shimWorklet: AudioWorkletNode | null = null;
  private shimConv!: ConvolverNode;
  private shimGate!: GainNode;

  private reverbNode!: ConvolverNode;
  private reverbDry!: GainNode;
  private reverbWet!: GainNode;
  private reverbMix!: GainNode;

  private flangerDelay!: DelayNode;
  private flangerLfo!: OscillatorNode;
  private flangerLfoGain!: GainNode;
  private flangerDry!: GainNode;
  private flangerWet!: GainNode;
  private flangerMix!: GainNode;

  private masterGain!: GainNode;
  private analyserNode!: AnalyserNode;
  private ambientGainNode!: GainNode;

  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;

  private recorderWorklet: AudioWorkletNode | null = null;
  private leftChunks: Float32Array[] = [];
  private rightChunks: Float32Array[] = [];
  private _isRecording = false;
  private _isPlaying = false;
  private _audioSourceType: "file" | "microphone" | null = null;
  private _currentSchemaId = "jurassic-park";
  private _playbackOffset = 0;
  private _playbackStartTime = 0;
  private _currentDelayMode: DelayMode = "standard";

  private ambientNodes: AudioNode[] = [];
  private ambientOscillators: OscillatorNode[] = [];

  get isPlaying() { return this._isPlaying; }
  get isRecording() { return this._isRecording; }
  get audioSourceType() { return this._audioSourceType; }
  get analyser(): AnalyserNode { return this.analyserNode; }
  get hasAudioFile() { return this.audioBuffer !== null; }
  get sampleRate() { return this.ctx?.sampleRate ?? 44100; }
  get isReady() { return this._initialized; }

  async initialize(baseUrl: string): Promise<void> {
    if (this._initialized) return;
    this.ctx = new AudioContext({ sampleRate: 44100 });
    const ctx = this.ctx;

    try {
      await ctx.audioWorklet.addModule(`${baseUrl}wav-recorder-worklet.js`);
    } catch (e) {
      console.warn("AudioWorklet (recorder) failed to load:", e);
    }

    try {
      await ctx.audioWorklet.addModule(`${baseUrl}delay-modes-worklet.js`);
    } catch (e) {
      console.warn("AudioWorklet (delay modes) failed to load:", e);
    }

    this.sourceGain = ctx.createGain();
    this.sourceGain.gain.value = 1.0;

    this.distNode = ctx.createWaveShaper();
    this.distNode.oversample = "4x";
    this.distDry = ctx.createGain();
    this.distWet = ctx.createGain();
    this.distMix = ctx.createGain();

    this.filterNode = ctx.createBiquadFilter();
    this.compNode = ctx.createDynamicsCompressor();

    this.delayDry = ctx.createGain();
    this.delayWet = ctx.createGain();
    this.delayMix = ctx.createGain();

    this.stdDelay = ctx.createDelay(2.5);
    this.stdFb = ctx.createGain();
    this.stdGate = ctx.createGain();
    this.stdGate.gain.value = 1;

    this.mt1 = ctx.createDelay(2.5);
    this.mt2 = ctx.createDelay(2.5);
    this.mt3 = ctx.createDelay(2.5);
    this.mt1G = ctx.createGain(); this.mt1G.gain.value = 1.0;
    this.mt2G = ctx.createGain(); this.mt2G.gain.value = 0.7;
    this.mt3G = ctx.createGain(); this.mt3G.gain.value = 0.5;
    this.mtMerge = ctx.createGain();
    this.mtGate = ctx.createGain();
    this.mtGate.gain.value = 0;

    this.bbdDelay = ctx.createDelay(2.5);
    this.bbdFb = ctx.createGain();
    this.bbdFilter = ctx.createBiquadFilter();
    this.bbdFilter.type = "lowpass";
    this.bbdFilter.frequency.value = 4000;
    this.bbdFilter.Q.value = 0.5;
    this.bbdSat = ctx.createWaveShaper();
    this.bbdSat.curve = makeDistCurve(30);
    this.bbdSat.oversample = "2x";
    this.bbdLfo = ctx.createOscillator();
    this.bbdLfo.type = "sine";
    this.bbdLfo.frequency.value = 3.2;
    this.bbdLfoGain = ctx.createGain();
    this.bbdLfoGain.gain.value = 0.004;
    this.bbdGate = ctx.createGain();
    this.bbdGate.gain.value = 0;

    this.tapeDelay = ctx.createDelay(2.5);
    this.tapeFb = ctx.createGain();
    this.tapeFilter = ctx.createBiquadFilter();
    this.tapeFilter.type = "lowpass";
    this.tapeFilter.frequency.value = 6000;
    this.tapeFilter.Q.value = 0.4;
    this.tapeSat = ctx.createWaveShaper();
    this.tapeSat.curve = makeDistCurve(60);
    this.tapeSat.oversample = "2x";
    this.wowLfo = ctx.createOscillator();
    this.wowLfo.type = "sine";
    this.wowLfo.frequency.value = 0.8;
    this.wowGain = ctx.createGain();
    this.wowGain.gain.value = 0.003;
    this.flutterLfo = ctx.createOscillator();
    this.flutterLfo.type = "sine";
    this.flutterLfo.frequency.value = 7.3;
    this.flutterGain = ctx.createGain();
    this.flutterGain.gain.value = 0.0003;
    this.tapeGate = ctx.createGain();
    this.tapeGate.gain.value = 0;

    this.verbDelay = ctx.createDelay(2.5);
    this.verbFb = ctx.createGain();
    this.verbConv = ctx.createConvolver();
    this.verbConv.buffer = generateIR(ctx, 0.8, 3.0);
    this.verbGate = ctx.createGain();
    this.verbGate.gain.value = 0;

    this.octGate = ctx.createGain();
    this.octGate.gain.value = 0;

    this.shimConv = ctx.createConvolver();
    this.shimConv.buffer = generateIR(ctx, 3.0, 2.0);
    this.shimGate = ctx.createGain();
    this.shimGate.gain.value = 0;

    try {
      this.octWorklet = new AudioWorkletNode(ctx, "oct-delay", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
    } catch (e) {
      console.warn("oct-delay worklet unavailable:", e);
      this.octWorklet = null;
    }

    try {
      this.shimWorklet = new AudioWorkletNode(ctx, "oct-delay", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
    } catch (e) {
      console.warn("shimmer worklet unavailable:", e);
      this.shimWorklet = null;
    }

    this.reverbNode = ctx.createConvolver();
    this.reverbDry = ctx.createGain();
    this.reverbWet = ctx.createGain();
    this.reverbMix = ctx.createGain();

    this.flangerDelay = ctx.createDelay(0.025);
    this.flangerLfo = ctx.createOscillator();
    this.flangerLfo.type = "sine";
    this.flangerLfoGain = ctx.createGain();
    this.flangerDry = ctx.createGain();
    this.flangerWet = ctx.createGain();
    this.flangerMix = ctx.createGain();

    this.masterGain = ctx.createGain();
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.ambientGainNode = ctx.createGain();

    try {
      this.recorderWorklet = new AudioWorkletNode(ctx, "wav-recorder");
      this.recorderWorklet.port.onmessage = (e) => {
        if (this._isRecording) {
          this.leftChunks.push(e.data.left);
          this.rightChunks.push(e.data.right);
        }
      };
    } catch (e) {
      console.warn("Recorder worklet unavailable:", e);
      this.recorderWorklet = null;
    }

    this._wireChain();

    this.flangerLfo.start();
    this.bbdLfo.start();
    this.wowLfo.start();
    this.flutterLfo.start();

    this._initialized = true;
  }

  private _wireChain() {
    if (!this.ctx) return;

    this.sourceGain.connect(this.distDry);
    this.sourceGain.connect(this.distNode);
    this.distNode.connect(this.distWet);
    this.distDry.connect(this.distMix);
    this.distWet.connect(this.distMix);

    this.distMix.connect(this.filterNode);
    this.filterNode.connect(this.compNode);

    this.compNode.connect(this.delayDry);
    this.delayDry.connect(this.delayMix);
    this.delayWet.connect(this.delayMix);

    this._wireDelaySection();

    this.delayMix.connect(this.reverbDry);
    this.delayMix.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbWet);
    this.reverbDry.connect(this.reverbMix);
    this.reverbWet.connect(this.reverbMix);

    this.reverbMix.connect(this.flangerDry);
    this.reverbMix.connect(this.flangerDelay);
    this.flangerLfo.connect(this.flangerLfoGain);
    this.flangerLfoGain.connect(this.flangerDelay.delayTime);
    this.flangerDelay.connect(this.flangerWet);
    this.flangerDry.connect(this.flangerMix);
    this.flangerWet.connect(this.flangerMix);

    this.flangerMix.connect(this.masterGain);
    this.ambientGainNode.connect(this.masterGain);
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
    if (this.recorderWorklet) {
      this.masterGain.connect(this.recorderWorklet);
    }
  }

  private _wireDelaySection() {
    const c = this.compNode;

    c.connect(this.stdDelay);
    this.stdDelay.connect(this.stdFb);
    this.stdFb.connect(this.stdDelay);
    this.stdDelay.connect(this.stdGate);
    this.stdGate.connect(this.delayWet);

    c.connect(this.mt1);
    c.connect(this.mt2);
    c.connect(this.mt3);
    this.mt1.connect(this.mt1G);
    this.mt2.connect(this.mt2G);
    this.mt3.connect(this.mt3G);
    this.mt1G.connect(this.mtMerge);
    this.mt2G.connect(this.mtMerge);
    this.mt3G.connect(this.mtMerge);
    this.mtMerge.connect(this.mtGate);
    this.mtGate.connect(this.delayWet);

    c.connect(this.bbdDelay);
    this.bbdDelay.connect(this.bbdFilter);
    this.bbdFilter.connect(this.bbdSat);
    this.bbdSat.connect(this.bbdFb);
    this.bbdFb.connect(this.bbdDelay);
    this.bbdDelay.connect(this.bbdGate);
    this.bbdGate.connect(this.delayWet);
    this.bbdLfo.connect(this.bbdLfoGain);
    this.bbdLfoGain.connect(this.bbdDelay.delayTime);

    c.connect(this.tapeDelay);
    this.tapeDelay.connect(this.tapeFilter);
    this.tapeFilter.connect(this.tapeSat);
    this.tapeSat.connect(this.tapeFb);
    this.tapeFb.connect(this.tapeDelay);
    this.tapeDelay.connect(this.tapeGate);
    this.tapeGate.connect(this.delayWet);
    this.wowLfo.connect(this.wowGain);
    this.wowGain.connect(this.tapeDelay.delayTime);
    this.flutterLfo.connect(this.flutterGain);
    this.flutterGain.connect(this.tapeDelay.delayTime);

    c.connect(this.verbDelay);
    this.verbDelay.connect(this.verbConv);
    this.verbConv.connect(this.verbFb);
    this.verbFb.connect(this.verbDelay);
    this.verbConv.connect(this.verbGate);
    this.verbGate.connect(this.delayWet);

    if (this.octWorklet) {
      c.connect(this.octWorklet);
      this.octWorklet.connect(this.octGate);
      this.octGate.connect(this.delayWet);
    }

    if (this.shimWorklet) {
      c.connect(this.shimWorklet);
      this.shimWorklet.connect(this.shimConv);
      this.shimConv.connect(this.shimGate);
      this.shimGate.connect(this.delayWet);
    }
  }

  setDelayMode(mode: DelayMode) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const gates: Record<DelayMode, GainNode> = {
      standard: this.stdGate,
      multitap: this.mtGate,
      analog:   this.bbdGate,
      tape:     this.tapeGate,
      verb:     this.verbGate,
      oct:      this.octGate,
      shimmer:  this.shimGate,
    };
    for (const gate of Object.values(gates)) {
      gate.gain.setTargetAtTime(0, now, 0.015);
    }
    if (mode === "oct" && !this.octWorklet) {
      gates["standard"].gain.setTargetAtTime(1, now + 0.03, 0.015);
      this._currentDelayMode = "standard";
    } else if (mode === "shimmer" && !this.shimWorklet) {
      gates["verb"].gain.setTargetAtTime(1, now + 0.03, 0.015);
      this._currentDelayMode = "verb";
    } else {
      gates[mode].gain.setTargetAtTime(1, now + 0.03, 0.015);
      this._currentDelayMode = mode;
    }
  }

  setDelayModulation(depth: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.bbdLfoGain.gain.setTargetAtTime(depth * 0.008, now, 0.05);
    this.wowGain.gain.setTargetAtTime(depth * 0.004, now, 0.05);
    this.flutterGain.gain.setTargetAtTime(depth * 0.0005, now, 0.05);
  }

  async resume() {
    if (this.ctx?.state === "suspended") {
      await this.ctx.resume();
    }
  }

  applySettings(s: EffectSettings) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    this.distNode.curve = makeDistCurve(s.distortionAmount);
    this.distDry.gain.setTargetAtTime(1 - s.distortionMix, now, 0.01);
    this.distWet.gain.setTargetAtTime(s.distortionMix, now, 0.01);

    this.filterNode.type = s.filterType as BiquadFilterType;
    this.filterNode.frequency.setTargetAtTime(s.filterFreq, now, 0.02);
    this.filterNode.Q.setTargetAtTime(s.filterQ, now, 0.02);

    this.compNode.threshold.setTargetAtTime(s.compThreshold, now, 0.01);
    this.compNode.ratio.setTargetAtTime(s.compRatio, now, 0.01);
    this.compNode.attack.setTargetAtTime(s.compAttack, now, 0.01);
    this.compNode.release.setTargetAtTime(s.compRelease, now, 0.01);

    const dt = s.delayTime;
    const fb = Math.min(0.95, s.delayFeedback);

    this.stdDelay.delayTime.setTargetAtTime(dt, now, 0.05);
    this.stdFb.gain.setTargetAtTime(fb, now, 0.01);

    this.mt1.delayTime.setTargetAtTime(Math.max(0.001, dt * 0.25), now, 0.05);
    this.mt2.delayTime.setTargetAtTime(Math.max(0.001, dt * 0.5), now, 0.05);
    this.mt3.delayTime.setTargetAtTime(Math.max(0.001, dt), now, 0.05);

    this.bbdDelay.delayTime.setTargetAtTime(dt, now, 0.05);
    this.bbdFb.gain.setTargetAtTime(fb, now, 0.01);

    this.tapeDelay.delayTime.setTargetAtTime(dt, now, 0.05);
    this.tapeFb.gain.setTargetAtTime(fb, now, 0.01);

    this.verbDelay.delayTime.setTargetAtTime(dt, now, 0.05);
    this.verbFb.gain.setTargetAtTime(Math.min(0.55, fb), now, 0.01);

    if (this.octWorklet) {
      const tp = this.octWorklet.parameters;
      tp.get("delayTime")?.setTargetAtTime(dt, now, 0.05);
      tp.get("feedback")?.setTargetAtTime(fb, now, 0.01);
    }
    if (this.shimWorklet) {
      const tp = this.shimWorklet.parameters;
      tp.get("delayTime")?.setTargetAtTime(dt, now, 0.05);
      tp.get("feedback")?.setTargetAtTime(fb, now, 0.01);
    }

    this.delayDry.gain.setTargetAtTime(1 - s.delayMix, now, 0.01);
    this.delayWet.gain.setTargetAtTime(s.delayMix, now, 0.01);

    if (s.delayMode !== this._currentDelayMode) {
      this.setDelayMode(s.delayMode);
    }
    this.setDelayModulation(s.delayModulation);

    this.reverbNode.buffer = generateIR(this.ctx, s.reverbDecay, 2.5);
    this.reverbDry.gain.setTargetAtTime(1 - s.reverbMix, now, 0.02);
    this.reverbWet.gain.setTargetAtTime(s.reverbMix, now, 0.02);

    const flangerDepthSec = s.flangerDepth * 0.01;
    this.flangerLfo.frequency.setTargetAtTime(s.flangerRate, now, 0.05);
    this.flangerLfoGain.gain.setTargetAtTime(flangerDepthSec, now, 0.05);
    this.flangerDry.gain.setTargetAtTime(1 - s.flangerMix, now, 0.01);
    this.flangerWet.gain.setTargetAtTime(s.flangerMix, now, 0.01);

    this.masterGain.gain.setTargetAtTime(s.masterGain, now, 0.01);
    this.ambientGainNode.gain.setTargetAtTime(s.ambientGain, now, 0.05);
  }

  setParam(param: keyof EffectSettings, value: number | string) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    switch (param) {
      case "reverbMix":
        this.reverbDry.gain.setTargetAtTime(1 - (value as number), now, 0.02);
        this.reverbWet.gain.setTargetAtTime(value as number, now, 0.02);
        break;
      case "reverbDecay":
        this.reverbNode.buffer = generateIR(this.ctx, value as number, 2.5);
        break;
      case "distortionAmount":
        this.distNode.curve = makeDistCurve(value as number);
        break;
      case "distortionMix":
        this.distDry.gain.setTargetAtTime(1 - (value as number), now, 0.01);
        this.distWet.gain.setTargetAtTime(value as number, now, 0.01);
        break;
      case "delayTime": {
        const dt = value as number;
        this.stdDelay.delayTime.setTargetAtTime(dt, now, 0.05);
        this.mt1.delayTime.setTargetAtTime(Math.max(0.001, dt * 0.25), now, 0.05);
        this.mt2.delayTime.setTargetAtTime(Math.max(0.001, dt * 0.5), now, 0.05);
        this.mt3.delayTime.setTargetAtTime(Math.max(0.001, dt), now, 0.05);
        this.bbdDelay.delayTime.setTargetAtTime(dt, now, 0.05);
        this.tapeDelay.delayTime.setTargetAtTime(dt, now, 0.05);
        this.verbDelay.delayTime.setTargetAtTime(dt, now, 0.05);
        this.octWorklet?.parameters.get("delayTime")?.setTargetAtTime(dt, now, 0.05);
        this.shimWorklet?.parameters.get("delayTime")?.setTargetAtTime(dt, now, 0.05);
        break;
      }
      case "delayFeedback": {
        const fb = Math.min(0.95, value as number);
        this.stdFb.gain.setTargetAtTime(fb, now, 0.01);
        this.bbdFb.gain.setTargetAtTime(fb, now, 0.01);
        this.tapeFb.gain.setTargetAtTime(fb, now, 0.01);
        this.verbFb.gain.setTargetAtTime(Math.min(0.55, fb), now, 0.01);
        this.octWorklet?.parameters.get("feedback")?.setTargetAtTime(fb, now, 0.01);
        this.shimWorklet?.parameters.get("feedback")?.setTargetAtTime(fb, now, 0.01);
        break;
      }
      case "delayMix":
        this.delayDry.gain.setTargetAtTime(1 - (value as number), now, 0.01);
        this.delayWet.gain.setTargetAtTime(value as number, now, 0.01);
        break;
      case "delayMode":
        this.setDelayMode(value as DelayMode);
        break;
      case "delayModulation":
        this.setDelayModulation(value as number);
        break;
      case "flangerDepth":
        this.flangerLfoGain.gain.setTargetAtTime((value as number) * 0.01, now, 0.05);
        break;
      case "flangerRate":
        this.flangerLfo.frequency.setTargetAtTime(value as number, now, 0.05);
        break;
      case "flangerMix":
        this.flangerDry.gain.setTargetAtTime(1 - (value as number), now, 0.01);
        this.flangerWet.gain.setTargetAtTime(value as number, now, 0.01);
        break;
      case "filterFreq":
        this.filterNode.frequency.setTargetAtTime(value as number, now, 0.02);
        break;
      case "filterQ":
        this.filterNode.Q.setTargetAtTime(value as number, now, 0.02);
        break;
      case "filterType":
        this.filterNode.type = value as BiquadFilterType;
        break;
      case "compThreshold":
        this.compNode.threshold.setTargetAtTime(value as number, now, 0.01);
        break;
      case "compRatio":
        this.compNode.ratio.setTargetAtTime(value as number, now, 0.01);
        break;
      case "compAttack":
        this.compNode.attack.setTargetAtTime(value as number, now, 0.01);
        break;
      case "compRelease":
        this.compNode.release.setTargetAtTime(value as number, now, 0.01);
        break;
      case "masterGain":
        this.masterGain.gain.setTargetAtTime(value as number, now, 0.01);
        break;
      case "ambientGain":
        this.ambientGainNode.gain.setTargetAtTime(value as number, now, 0.05);
        break;
    }
  }

  async loadFile(file: File): Promise<void> {
    if (!this.ctx) throw new Error("Engine not initialized");
    this.stopSource();
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this._audioSourceType = "file";
  }

  async startMicrophone(): Promise<void> {
    if (!this.ctx) throw new Error("Engine not initialized");
    this.stopSource();
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
    this.micSourceNode.connect(this.sourceGain);
    this._audioSourceType = "microphone";
    this._isPlaying = true;
  }

  playFile(): void {
    if (!this.ctx || !this.audioBuffer) return;
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      try { this.sourceNode.stop(); } catch {}
    }
    const node = this.ctx.createBufferSource();
    node.buffer = this.audioBuffer;
    node.loop = false;
    node.connect(this.sourceGain);
    node.start(0, this._playbackOffset);
    this._playbackStartTime = this.ctx.currentTime;
    this.sourceNode = node;
    this._isPlaying = true;
    node.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this._playbackOffset = 0;
        this._playbackStartTime = 0;
        this.sourceNode = null;
      }
    };
  }

  pauseFile(): void {
    if (!this.ctx || !this.sourceNode) return;
    const elapsed = this.ctx.currentTime - this._playbackStartTime;
    this._playbackOffset = this._playbackOffset + elapsed;
    this.sourceNode.disconnect();
    try { this.sourceNode.stop(); } catch {}
    this.sourceNode = null;
    this._isPlaying = false;
  }

  stopSource(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      try { this.sourceNode.stop(); } catch {}
      this.sourceNode = null;
    }
    if (this.micSourceNode) {
      this.micSourceNode.disconnect();
      this.micSourceNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    this._isPlaying = false;
    this._playbackOffset = 0;
    this._playbackStartTime = 0;
  }

  connectAmbient(nodes: AudioNode[]) {
    this.stopAmbient();
    for (const n of nodes) n.connect(this.ambientGainNode);
    this.ambientNodes = nodes;
  }

  stopAmbient() {
    for (const n of this.ambientNodes) {
      try {
        n.disconnect();
        if (n instanceof OscillatorNode) n.stop();
      } catch {}
    }
    this.ambientNodes = [];
    this.ambientOscillators = [];
  }

  startRecording() {
    if (!this.ctx || !this.recorderWorklet) return;
    this.leftChunks = [];
    this.rightChunks = [];
    this.recorderWorklet.port.postMessage("start");
    this._isRecording = true;
  }

  stopRecording(schemaTitle: string) {
    if (!this.recorderWorklet) return;
    this.recorderWorklet.port.postMessage("stop");
    this._isRecording = false;
    if (this.leftChunks.length === 0) return;
    const blob = encodeWav(this.leftChunks, this.rightChunks, this.sampleRate);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `CEP1_${schemaTitle.replace(/\s+/g, "_")}_${ts}.wav`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    this.leftChunks = [];
    this.rightChunks = [];
  }

  triggerGlitch(currentSettings: EffectSettings): EffectSettings {
    if (!this.ctx) return currentSettings;
    const delayModes: DelayMode[] = ["standard", "multitap", "analog", "tape", "verb", "oct", "shimmer"];
    const glitchSettings: EffectSettings = {
      reverbMix: Math.random() * 0.5 + 0.5,
      reverbDecay: Math.random() * 8 + 1,
      distortionAmount: Math.random() * 400,
      distortionMix: Math.random() * 0.8 + 0.2,
      delayTime: Math.random() * 1.8 + 0.05,
      delayFeedback: Math.random() * 0.6 + 0.3,
      delayMix: Math.random() * 0.8 + 0.1,
      delayMode: delayModes[Math.floor(Math.random() * delayModes.length)],
      delayModulation: Math.random(),
      flangerDepth: Math.random() * 0.9 + 0.1,
      flangerRate: Math.random() * 9 + 0.5,
      flangerMix: Math.random() * 0.8 + 0.2,
      filterFreq: Math.pow(10, Math.random() * 2.9 + 1.7),
      filterQ: Math.random() * 18 + 0.5,
      filterType: currentSettings.filterType,
      compThreshold: -(Math.random() * 40 + 5),
      compRatio: Math.random() * 18 + 2,
      compAttack: Math.random() * 0.05,
      compRelease: Math.random() * 0.5,
      masterGain: currentSettings.masterGain,
      ambientGain: Math.random() * 0.7 + 0.3,
    };
    this.applySettings(glitchSettings);
    return glitchSettings;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }
}

const engine = new AudioEngine();
export default engine;
