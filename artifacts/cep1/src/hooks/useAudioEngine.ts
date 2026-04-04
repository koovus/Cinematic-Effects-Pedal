import { useState, useEffect, useRef, useCallback } from "react";
import engine from "../audio/AudioEngine";
import { createAmbient } from "../audio/ambientSynth";
import { SCHEMAS, getSchema } from "../schemas/definitions";
import type { EffectSettings, MovieSchema } from "../schemas/types";

export type AudioSourceType = "file" | "microphone" | null;

export interface AudioEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  isRecording: boolean;
  audioSourceType: AudioSourceType;
  hasAudioFile: boolean;
  currentSchema: MovieSchema;
  effectSettings: EffectSettings;
  analyser: AnalyserNode | null;
  schemas: MovieSchema[];
  fileName: string | null;
  loadFile: (file: File) => Promise<void>;
  startMicrophone: () => Promise<void>;
  stopMic: () => void;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  selectSchema: (id: string) => Promise<void>;
  setParam: (param: keyof EffectSettings, value: number | string) => void;
  triggerGlitch: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  setAmbientEnabled: (enabled: boolean) => void;
  ambientEnabled: boolean;
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";

export function useAudioEngine(): AudioEngineState {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSourceType, setAudioSourceType] = useState<AudioSourceType>(null);
  const [hasAudioFile, setHasAudioFile] = useState(false);
  const [currentSchemaId, setCurrentSchemaId] = useState("jurassic-park");
  const [fileName, setFileName] = useState<string | null>(null);
  const [ambientEnabled, setAmbientEnabled] = useState(true);
  const [effectSettings, setEffectSettings] = useState<EffectSettings>(
    getSchema("jurassic-park").defaults
  );
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const ambientRef = useRef<{ stop: () => void } | null>(null);
  const initRef = useRef(false);

  const ensureInit = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;
    await engine.initialize(BASE_URL);
    engine.applySettings(getSchema("jurassic-park").defaults);
    setAnalyser(engine.analyser);
    setIsInitialized(true);
  }, []);

  const startAmbient = useCallback(
    async (schemaId: string) => {
      if (ambientRef.current) {
        ambientRef.current.stop();
        ambientRef.current = null;
      }
      if (!ambientEnabled) return;
      const ctx = engine.context;
      if (!ctx) return;
      const ambient = createAmbient(ctx, schemaId);
      engine.connectAmbient(ambient.outputNodes);
      ambientRef.current = ambient;
    },
    [ambientEnabled]
  );

  useEffect(() => {
    return () => {
      if (ambientRef.current) ambientRef.current.stop();
    };
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      await ensureInit();
      await engine.resume();
      await engine.loadFile(file);
      setHasAudioFile(true);
      setAudioSourceType("file");
      setIsPlaying(false);
      setFileName(file.name);
    },
    [ensureInit]
  );

  const startMicrophone = useCallback(async () => {
    await ensureInit();
    await engine.resume();
    await engine.startMicrophone();
    setAudioSourceType("microphone");
    setIsPlaying(true);
    await startAmbient(currentSchemaId);
  }, [ensureInit, currentSchemaId, startAmbient]);

  const stopMic = useCallback(() => {
    engine.stopSource();
    setIsPlaying(false);
    setAudioSourceType(null);
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
  }, []);

  const play = useCallback(async () => {
    await ensureInit();
    await engine.resume();
    engine.playFile();
    setIsPlaying(true);
    await startAmbient(currentSchemaId);
  }, [ensureInit, currentSchemaId, startAmbient]);

  const pause = useCallback(() => {
    engine.pauseFile();
    setIsPlaying(false);
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    engine.stopSource();
    setIsPlaying(false);
    setHasAudioFile(engine.hasAudioFile);
    if (ambientRef.current) {
      ambientRef.current.stop();
      ambientRef.current = null;
    }
  }, []);

  const selectSchema = useCallback(
    async (id: string) => {
      await ensureInit();
      await engine.resume();
      const schema = getSchema(id);
      setCurrentSchemaId(id);
      setEffectSettings(schema.defaults);
      engine.applySettings(schema.defaults);
      if (ambientRef.current) {
        ambientRef.current.stop();
        ambientRef.current = null;
      }
      if (isPlaying && ambientEnabled) {
        await startAmbient(id);
      }
    },
    [ensureInit, isPlaying, ambientEnabled, startAmbient]
  );

  const setParam = useCallback(
    (param: keyof EffectSettings, value: number | string) => {
      engine.setParam(param, value);
      setEffectSettings((prev) => ({ ...prev, [param]: value }));
    },
    []
  );

  const triggerGlitch = useCallback(async () => {
    await ensureInit();
    await engine.resume();
    const glitchSettings = engine.triggerGlitch(effectSettings);
    setEffectSettings(glitchSettings);
    setTimeout(async () => {
      const schema = getSchema(currentSchemaId);
      engine.applySettings(schema.defaults);
      setEffectSettings(schema.defaults);
    }, 2000 + Math.random() * 1500);
  }, [ensureInit, effectSettings, currentSchemaId]);

  const startRecording = useCallback(async () => {
    await ensureInit();
    await engine.resume();
    engine.startRecording();
    setIsRecording(true);
  }, [ensureInit]);

  const stopRecording = useCallback(() => {
    const schema = getSchema(currentSchemaId);
    engine.stopRecording(schema.title);
    setIsRecording(false);
  }, [currentSchemaId]);

  const setAmbientEnabledCb = useCallback(
    (enabled: boolean) => {
      setAmbientEnabled(enabled);
      if (!enabled && ambientRef.current) {
        ambientRef.current.stop();
        ambientRef.current = null;
      } else if (enabled && isPlaying) {
        startAmbient(currentSchemaId);
      }
    },
    [isPlaying, currentSchemaId, startAmbient]
  );

  return {
    isInitialized,
    isPlaying,
    isRecording,
    audioSourceType,
    hasAudioFile,
    currentSchema: getSchema(currentSchemaId),
    effectSettings,
    analyser,
    schemas: SCHEMAS,
    fileName,
    loadFile,
    startMicrophone,
    stopMic,
    play,
    pause,
    stop,
    selectSchema,
    setParam,
    triggerGlitch,
    startRecording,
    stopRecording,
    setAmbientEnabled: setAmbientEnabledCb,
    ambientEnabled,
  };
}
