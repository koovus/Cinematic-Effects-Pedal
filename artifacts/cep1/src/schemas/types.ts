export type BiquadType =
  | "lowpass"
  | "highpass"
  | "bandpass"
  | "notch"
  | "allpass"
  | "peaking"
  | "lowshelf"
  | "highshelf";

export interface EffectSettings {
  reverbMix: number;
  reverbDecay: number;
  distortionAmount: number;
  distortionMix: number;
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
  flangerDepth: number;
  flangerRate: number;
  flangerMix: number;
  filterFreq: number;
  filterQ: number;
  filterType: BiquadType;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compRelease: number;
  masterGain: number;
  ambientGain: number;
}

export interface KnobDef {
  id: keyof EffectSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  logarithmic?: boolean;
}

export interface EffectGroup {
  label: string;
  color: string;
  knobs: KnobDef[];
}

export interface MovieSchema {
  id: string;
  title: string;
  year: number;
  accentColor: string;
  bgGradient: string;
  textColor: string;
  tagline: string;
  description: string;
  defaults: EffectSettings;
  effectGroups: EffectGroup[];
  ambientDescription: string;
}
