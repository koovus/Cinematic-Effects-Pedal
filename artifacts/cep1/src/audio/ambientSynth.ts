export type SchemaAmbient = {
  outputNodes: AudioNode[];
  stop: () => void;
};

function createNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;
  return source;
}

export function createJurassicAmbient(ctx: AudioContext): SchemaAmbient {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;

  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.value = 38;
  const osc1Gain = ctx.createGain();
  osc1Gain.gain.value = 0.6;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 6;
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  const noise = createNoise(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 120;
  noiseFilter.Q.value = 1;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.25;

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 55;
  const osc2Gain = ctx.createGain();
  osc2Gain.gain.value = 0.3;

  const rumbleLfo = ctx.createOscillator();
  rumbleLfo.type = "sine";
  rumbleLfo.frequency.value = 0.22;
  const rumbleLfoGain = ctx.createGain();
  rumbleLfoGain.gain.value = 0.25;
  rumbleLfo.connect(rumbleLfoGain);
  rumbleLfoGain.connect(osc2Gain.gain);

  osc1.connect(osc1Gain);
  osc2.connect(osc2Gain);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);

  osc1Gain.connect(masterGain);
  osc2Gain.connect(masterGain);
  noiseGain.connect(masterGain);

  osc1.start();
  osc2.start();
  lfo.start();
  rumbleLfo.start();
  noise.start();

  return {
    outputNodes: [masterGain],
    stop: () => {
      try { osc1.stop(); osc2.stop(); lfo.stop(); rumbleLfo.stop(); noise.stop(); } catch {}
    },
  };
}

export function createStarWarsAmbient(ctx: AudioContext): SchemaAmbient {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;

  const freq1 = 188;
  const freq2 = 194;

  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = freq1;
  const osc1Gain = ctx.createGain();
  osc1Gain.gain.value = 0.35;

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = freq2;
  const osc2Gain = ctx.createGain();
  osc2Gain.gain.value = 0.35;

  const osc3 = ctx.createOscillator();
  osc3.type = "triangle";
  osc3.frequency.value = 95;
  const osc3Gain = ctx.createGain();
  osc3Gain.gain.value = 0.2;

  const lfo1 = ctx.createOscillator();
  lfo1.type = "sine";
  lfo1.frequency.value = 0.04;
  const lfo1Gain = ctx.createGain();
  lfo1Gain.gain.value = 0.15;
  lfo1.connect(lfo1Gain);
  lfo1Gain.connect(osc1Gain.gain);

  const noise = createNoise(ctx);
  const spaceFilter = ctx.createBiquadFilter();
  spaceFilter.type = "bandpass";
  spaceFilter.frequency.value = 600;
  spaceFilter.Q.value = 0.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.07;

  osc1.connect(osc1Gain);
  osc2.connect(osc2Gain);
  osc3.connect(osc3Gain);
  noise.connect(spaceFilter);
  spaceFilter.connect(noiseGain);

  osc1Gain.connect(masterGain);
  osc2Gain.connect(masterGain);
  osc3Gain.connect(masterGain);
  noiseGain.connect(masterGain);

  osc1.start();
  osc2.start();
  osc3.start();
  lfo1.start();
  noise.start();

  return {
    outputNodes: [masterGain],
    stop: () => {
      try { osc1.stop(); osc2.stop(); osc3.stop(); lfo1.stop(); noise.stop(); } catch {}
    },
  };
}

export function createChainsawAmbient(ctx: AudioContext): SchemaAmbient {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;

  const sawtooth = ctx.createOscillator();
  sawtooth.type = "sawtooth";
  sawtooth.frequency.value = 72;

  const freqLfo = ctx.createOscillator();
  freqLfo.type = "sawtooth";
  freqLfo.frequency.value = 3.5;
  const freqLfoGain = ctx.createGain();
  freqLfoGain.gain.value = 12;
  freqLfo.connect(freqLfoGain);
  freqLfoGain.connect(sawtooth.frequency);

  const distWave = ctx.createWaveShaper();
  const distCurve = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    const x = (i * 2) / 512 - 1;
    distCurve[i] = x < 0 ? -1 : 1;
  }
  distWave.curve = distCurve;
  distWave.oversample = "4x";

  const sawGain = ctx.createGain();
  sawGain.gain.value = 0.55;

  const noise = createNoise(ctx);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 2000;
  noiseFilter.Q.value = 3;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.2;

  const ampLfo = ctx.createOscillator();
  ampLfo.type = "sine";
  ampLfo.frequency.value = 0.15;
  const ampLfoGain = ctx.createGain();
  ampLfoGain.gain.value = 0.12;
  const ampBase = ctx.createGain();
  ampBase.gain.value = 0.55;
  ampLfo.connect(ampLfoGain);
  ampLfoGain.connect(ampBase.gain);

  sawtooth.connect(distWave);
  distWave.connect(sawGain);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);

  sawGain.connect(ampBase);
  noiseGain.connect(ampBase);
  ampBase.connect(masterGain);

  sawtooth.start();
  freqLfo.start();
  ampLfo.start();
  noise.start();

  return {
    outputNodes: [masterGain],
    stop: () => {
      try { sawtooth.stop(); freqLfo.stop(); ampLfo.stop(); noise.stop(); } catch {}
    },
  };
}

export function createAliveAmbient(ctx: AudioContext): SchemaAmbient {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;

  const noise = createNoise(ctx);
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 350;
  windFilter.Q.value = 0.7;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.45;

  const windLfo = ctx.createOscillator();
  windLfo.type = "sine";
  windLfo.frequency.value = 0.05;
  const windLfoGain = ctx.createGain();
  windLfoGain.gain.value = 200;
  windLfo.connect(windLfoGain);
  windLfoGain.connect(windFilter.frequency);

  const ampLfo = ctx.createOscillator();
  ampLfo.type = "sine";
  ampLfo.frequency.value = 0.11;
  const ampLfoGain = ctx.createGain();
  ampLfoGain.gain.value = 0.2;
  ampLfo.connect(ampLfoGain);
  ampLfoGain.connect(windGain.gain);

  const drone = ctx.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 28;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.22;

  const creak = ctx.createOscillator();
  creak.type = "triangle";
  creak.frequency.value = 80;
  const creakGain = ctx.createGain();
  creakGain.gain.value = 0.0;
  const creakAmpLfo = ctx.createOscillator();
  creakAmpLfo.type = "sine";
  creakAmpLfo.frequency.value = 0.07;
  const creakAmpGain = ctx.createGain();
  creakAmpGain.gain.value = 0.08;
  creakAmpLfo.connect(creakAmpGain);
  creakAmpGain.connect(creakGain.gain);

  noise.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(masterGain);
  drone.connect(droneGain);
  droneGain.connect(masterGain);
  creak.connect(creakGain);
  creakGain.connect(masterGain);

  noise.start();
  windLfo.start();
  ampLfo.start();
  drone.start();
  creak.start();
  creakAmpLfo.start();

  return {
    outputNodes: [masterGain],
    stop: () => {
      try { noise.stop(); windLfo.stop(); ampLfo.stop(); drone.stop(); creak.stop(); creakAmpLfo.stop(); } catch {}
    },
  };
}

export function createContactAmbient(ctx: AudioContext): SchemaAmbient {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;

  const noise = createNoise(ctx);
  const radioFilter = ctx.createBiquadFilter();
  radioFilter.type = "bandpass";
  radioFilter.frequency.value = 1100;
  radioFilter.Q.value = 8;
  const staticGain = ctx.createGain();
  staticGain.gain.value = 0.3;

  const sweep = ctx.createOscillator();
  sweep.type = "sine";
  sweep.frequency.value = 800;
  const sweepGain = ctx.createGain();
  sweepGain.gain.value = 0.0;
  const sweepLfo = ctx.createOscillator();
  sweepLfo.type = "sine";
  sweepLfo.frequency.value = 0.08;
  const sweepLfoGain = ctx.createGain();
  sweepLfoGain.gain.value = 600;
  sweepLfo.connect(sweepLfoGain);
  sweepLfoGain.connect(sweep.frequency);
  const sweepAmpLfo = ctx.createOscillator();
  sweepAmpLfo.type = "sine";
  sweepAmpLfo.frequency.value = 0.13;
  const sweepAmpGain = ctx.createGain();
  sweepAmpGain.gain.value = 0.2;
  sweepAmpLfo.connect(sweepAmpGain);
  sweepAmpGain.connect(sweepGain.gain);

  const pulse = ctx.createOscillator();
  pulse.type = "square";
  pulse.frequency.value = 1450;
  const pulseFilter = ctx.createBiquadFilter();
  pulseFilter.type = "bandpass";
  pulseFilter.frequency.value = 1450;
  pulseFilter.Q.value = 20;
  const pulseGain = ctx.createGain();
  pulseGain.gain.value = 0.0;
  const pulseLfo = ctx.createOscillator();
  pulseLfo.type = "square";
  pulseLfo.frequency.value = 0.3;
  const pulseLfoGain = ctx.createGain();
  pulseLfoGain.gain.value = 0.08;
  pulseLfo.connect(pulseLfoGain);
  pulseLfoGain.connect(pulseGain.gain);

  noise.connect(radioFilter);
  radioFilter.connect(staticGain);
  staticGain.connect(masterGain);
  sweep.connect(sweepGain);
  sweepGain.connect(masterGain);
  pulse.connect(pulseFilter);
  pulseFilter.connect(pulseGain);
  pulseGain.connect(masterGain);

  noise.start();
  sweep.start();
  sweepLfo.start();
  sweepAmpLfo.start();
  pulse.start();
  pulseLfo.start();

  return {
    outputNodes: [masterGain],
    stop: () => {
      try {
        noise.stop(); sweep.stop(); sweepLfo.stop(); sweepAmpLfo.stop();
        pulse.stop(); pulseLfo.stop();
      } catch {}
    },
  };
}

export function createScarfaceAmbient(ctx: AudioContext): SchemaAmbient {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;

  const bpm = 120;
  const beatInterval = 60 / bpm;
  const barDuration = beatInterval * 4;
  const lookahead = 2.0;
  const scheduleInterval = 500;

  let nextBarTime = ctx.currentTime + 0.1;
  let stopped = false;

  function scheduleKick(time: number) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.9, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  function scheduleHat(time: number, volume: number) {
    const noise = createNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 8000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(volume, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(filter);
    filter.connect(env);
    env.connect(masterGain);
    noise.start(time);
    noise.stop(time + 0.06);
  }

  function scheduleBar(barStart: number) {
    scheduleKick(barStart);
    scheduleKick(barStart + beatInterval * 2);
    scheduleHat(barStart + beatInterval, 0.4);
    scheduleHat(barStart + beatInterval * 3, 0.4);
    scheduleHat(barStart + beatInterval * 0.5, 0.15);
    scheduleHat(barStart + beatInterval * 1.5, 0.15);
    scheduleHat(barStart + beatInterval * 2.5, 0.15);
    scheduleHat(barStart + beatInterval * 3.5, 0.15);
  }

  function tick() {
    if (stopped) return;
    while (nextBarTime < ctx.currentTime + lookahead) {
      scheduleBar(nextBarTime);
      nextBarTime += barDuration;
    }
  }

  tick();
  const intervalId = setInterval(tick, scheduleInterval);

  return {
    outputNodes: [masterGain],
    stop: () => {
      stopped = true;
      clearInterval(intervalId);
    },
  };
}

async function createFromFiles(
  ctx: AudioContext,
  schema: string,
  layers: { file: string; gain: number }[],
  masterGainValue: number,
  baseUrl: string,
  fallback: () => SchemaAmbient
): Promise<SchemaAmbient> {
  const masterGain = ctx.createGain();
  masterGain.gain.value = masterGainValue;
  const sources: AudioBufferSourceNode[] = [];

  await Promise.all(
    layers.map(async ({ file, gain }) => {
      try {
        const url = `${baseUrl}sounds/${schema}/${file}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gainNode = ctx.createGain();
        gainNode.gain.value = gain;
        source.connect(gainNode);
        gainNode.connect(masterGain);
        sources.push(source);
        source.start();
      } catch { /* skip failed layer */ }
    })
  );

  if (sources.length === 0) {
    masterGain.disconnect();
    return fallback();
  }

  return {
    outputNodes: [masterGain],
    stop: () => { sources.forEach(s => { try { s.stop(); } catch {} }); },
  };
}


const FILE_LAYERS: Record<string, { file: string; gain: number }[]> = {
  "jurassic-park": [
    { file: "layer-1.mp3", gain: 0.5 },
    { file: "layer-2.mp3", gain: 0.6 },
    { file: "layer-3.mp3", gain: 0.55 },
  ],
  "star-wars": [
    { file: "layer-1.mp3", gain: 0.45 },
    { file: "layer-2.mp3", gain: 0.6 },
    { file: "layer-3.mp3", gain: 0.65 },
  ],
  "alive": [
    { file: "layer-1.mp3", gain: 0.6 },
    { file: "layer-2.mp3", gain: 0.7 },
  ],
  "contact": [
    { file: "layer-1.mp3", gain: 0.25 },
    { file: "layer-2.mp3", gain: 0.35 },
    { file: "layer-3.mp3", gain: 0.5 },
    { file: "layer-4.mp3", gain: 0.6 },
    { file: "layer-5.mp3", gain: 0.65 },
  ],
};

const FALLBACKS: Record<string, (ctx: AudioContext) => SchemaAmbient> = {
  "jurassic-park": createJurassicAmbient,
  "star-wars": createStarWarsAmbient,
  "alive": createAliveAmbient,
  "contact": createContactAmbient,
};

export async function createAmbient(
  ctx: AudioContext,
  schemaId: string,
  baseUrl = "/"
): Promise<SchemaAmbient> {
  if (FILE_LAYERS[schemaId]) {
    return createFromFiles(
      ctx,
      schemaId,
      FILE_LAYERS[schemaId],
      0.75,
      baseUrl,
      () => FALLBACKS[schemaId](ctx)
    );
  }
  switch (schemaId) {
    case "star-wars": return createStarWarsAmbient(ctx);
    case "chainsaw-massacre": return createChainsawAmbient(ctx);
    case "alive": return createAliveAmbient(ctx);
    case "scarface": return createScarfaceAmbient(ctx);
    default: return createJurassicAmbient(ctx);
  }
}
