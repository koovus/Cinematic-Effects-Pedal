class OctDelayProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "delayTime", defaultValue: 0.5, minValue: 0.001, maxValue: 2.5, automationRate: "k-rate" },
      { name: "feedback",  defaultValue: 0.5, minValue: 0,     maxValue: 0.95, automationRate: "k-rate" },
      { name: "pitchRatio",defaultValue: 2.0, minValue: 0.5,   maxValue: 4.0,  automationRate: "k-rate" },
    ];
  }

  constructor() {
    super();
    this.bufSize = Math.ceil(3 * sampleRate);
    this.buf = new Float32Array(this.bufSize);
    this.writePos = 0;
    this.grainSize = 1024;
    this.readPos = [0, 0];
    this.phase = [0, 512];
    this.firstRun = true;
    this.lastDelayTime = 0.5;
  }

  process(inputs, outputs, parameters) {
    const inp = inputs[0]?.[0];
    const out = outputs[0]?.[0];
    if (!inp || !out) return true;

    const delayTime  = parameters.delayTime[0]  ?? 0.5;
    const feedback   = parameters.feedback[0]   ?? 0.5;
    const pitchRatio = parameters.pitchRatio[0] ?? 2.0;

    const delaySamples = Math.max(this.grainSize * 2, Math.round(delayTime * sampleRate));

    if (this.firstRun || Math.abs(delayTime - this.lastDelayTime) > 0.01) {
      this.readPos[0] = (this.writePos - delaySamples + this.bufSize) % this.bufSize;
      this.readPos[1] = (this.readPos[0] + this.grainSize / 2) % this.bufSize;
      this.phase = [0, this.grainSize / 2];
      this.firstRun = false;
      this.lastDelayTime = delayTime;
    }

    for (let i = 0; i < inp.length; i++) {
      this.buf[this.writePos] = inp[i];

      let pitchShifted = 0;
      for (let h = 0; h < 2; h++) {
        const p = this.phase[h] % this.grainSize;
        const w = 0.5 * (1 - Math.cos(2 * Math.PI * p / this.grainSize));
        const ri = (Math.floor(this.readPos[h]) + this.bufSize) % this.bufSize;
        pitchShifted += this.buf[ri] * w;

        this.readPos[h] = (this.readPos[h] + pitchRatio) % this.bufSize;
        this.phase[h]   = (this.phase[h]   + pitchRatio) % this.grainSize;

        const dist = (this.writePos - Math.floor(this.readPos[h]) + this.bufSize) % this.bufSize;
        if (dist < this.grainSize) {
          this.readPos[h] = (this.writePos - delaySamples + h * (this.grainSize / 2) + this.bufSize) % this.bufSize;
          this.phase[h] = h * (this.grainSize / 2);
        }
      }

      this.buf[this.writePos] = inp[i] + pitchShifted * feedback;
      out[i] = pitchShifted;

      this.writePos = (this.writePos + 1) % this.bufSize;
    }

    return true;
  }
}

registerProcessor("oct-delay", OctDelayProcessor);
