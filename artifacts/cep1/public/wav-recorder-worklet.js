class WavRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._recording = false;
    this.port.onmessage = (e) => {
      if (e.data === "start") this._recording = true;
      if (e.data === "stop") this._recording = false;
    };
  }

  process(inputs) {
    if (!this._recording) return true;
    const input = inputs[0];
    if (input && input.length > 0) {
      const left = input[0] ? input[0].slice() : new Float32Array(128);
      const right = input[1] ? input[1].slice() : left.slice();
      this.port.postMessage({ left, right }, [left.buffer, right.buffer]);
    }
    return true;
  }
}

registerProcessor("wav-recorder", WavRecorderProcessor);
