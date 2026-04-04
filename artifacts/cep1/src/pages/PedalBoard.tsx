import { useCallback, useRef, useState } from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { KnobControl } from "@/components/KnobControl";
import { Waveform } from "@/components/Waveform";
import type { EffectSettings, MovieSchema } from "@/schemas/types";

function SchemaCard({
  schema,
  isActive,
  onSelect,
}: {
  schema: MovieSchema;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex-shrink-0 rounded-lg border transition-all duration-200 text-left overflow-hidden"
      style={{
        width: 140,
        borderColor: isActive ? schema.accentColor : "rgba(255,255,255,0.08)",
        background: isActive
          ? schema.bgGradient
          : "rgba(255,255,255,0.03)",
        boxShadow: isActive
          ? `0 0 0 1px ${schema.accentColor}66, 0 0 24px ${schema.accentColor}22`
          : undefined,
        transform: isActive ? "translateY(-2px)" : undefined,
      }}
    >
      <div className="p-3 pb-2">
        <div
          className="text-xs font-bold uppercase tracking-widest mb-1 leading-tight"
          style={{ color: isActive ? schema.accentColor : "rgba(255,255,255,0.5)", fontSize: 8, letterSpacing: "0.12em" }}
        >
          {schema.year}
        </div>
        <div
          className="font-bold leading-tight"
          style={{
            color: isActive ? schema.accentColor : "rgba(255,255,255,0.7)",
            fontSize: 11,
          }}
        >
          {schema.title}
        </div>
        <div
          className="mt-1 leading-tight"
          style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, fontStyle: "italic" }}
        >
          {schema.tagline.length > 40 ? schema.tagline.slice(0, 38) + "…" : schema.tagline}
        </div>
      </div>
      <div
        className="h-0.5 w-full"
        style={{
          background: isActive
            ? `linear-gradient(90deg, transparent, ${schema.accentColor}, transparent)`
            : "transparent",
        }}
      />
    </button>
  );
}

function EffectPanel({
  schema,
  effectSettings,
  setParam,
}: {
  schema: MovieSchema;
  effectSettings: EffectSettings;
  setParam: (param: keyof EffectSettings, value: number | string) => void;
}) {
  const rotaryKnobs = (group: typeof schema.effectGroups[number]) =>
    group.knobs.filter((k) => !k.options);

  return (
    <div className="grid grid-cols-1 gap-3">
      {schema.effectGroups.map((group) => (
        <div
          key={group.label}
          className="rounded-lg p-3 pedal-panel"
        >
          <div
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: group.color, fontSize: 9, letterSpacing: "0.15em" }}
          >
            {group.label}
          </div>

          {group.knobs.map((knob) =>
            knob.options ? (
              <div key={knob.id} className="mb-3">
                <div
                  className="text-xs uppercase mb-1.5"
                  style={{ color: "rgba(255,255,255,0.2)", fontSize: 7, letterSpacing: "0.15em" }}
                >
                  {knob.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {knob.options.map((opt) => {
                    const active = (effectSettings[knob.id] as string) === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setParam(knob.id, opt.id)}
                        className="rounded transition-all duration-100"
                        style={{
                          padding: "2px 6px",
                          fontSize: 8,
                          letterSpacing: "0.1em",
                          fontWeight: 700,
                          fontFamily: "inherit",
                          cursor: "pointer",
                          border: `1px solid ${active ? group.color : "rgba(255,255,255,0.12)"}`,
                          background: active ? `${group.color}22` : "rgba(255,255,255,0.03)",
                          color: active ? group.color : "rgba(255,255,255,0.35)",
                          boxShadow: active ? `0 0 6px ${group.color}44` : undefined,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}

          <div className="flex flex-wrap gap-3">
            {rotaryKnobs(group).map((knob) => (
              <KnobControl
                key={knob.id}
                label={knob.label}
                value={effectSettings[knob.id] as number}
                min={knob.min ?? 0}
                max={knob.max ?? 1}
                step={knob.step ?? 0.01}
                unit={knob.unit}
                logarithmic={knob.logarithmic}
                color={group.color}
                size={52}
                onChange={(v) => setParam(knob.id, v)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecButton({
  isRecording,
  onStart,
  onStop,
}: {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <button
      onClick={isRecording ? onStop : onStart}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase text-xs tracking-widest transition-all duration-150"
      style={{
        background: isRecording
          ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
          : "rgba(255,255,255,0.05)",
        border: `1px solid ${isRecording ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
        color: isRecording ? "#fff" : "rgba(255,255,255,0.5)",
        boxShadow: isRecording
          ? "0 0 16px rgba(239,68,68,0.4)"
          : undefined,
        letterSpacing: "0.12em",
        fontSize: 9,
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: isRecording ? "#fff" : "rgba(239,68,68,0.7)",
          animation: isRecording ? "rec-pulse 1s ease-in-out infinite" : undefined,
        }}
      />
      {isRecording ? "STOP" : "REC"}
    </button>
  );
}

export default function PedalBoard() {
  const {
    isPlaying,
    isRecording,
    audioSourceType,
    hasAudioFile,
    currentSchema,
    effectSettings,
    analyser,
    schemas,
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
    ambientEnabled,
    setAmbientEnabled,
    cleanSignal,
    isClean,
  } = useAudioEngine();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [waveformMode, setWaveformMode] = useState<"oscilloscope" | "spectrum">("oscilloscope");
  const [isGlitching, setIsGlitching] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await loadFile(file);
    },
    [loadFile]
  );

  const handleGlitch = useCallback(() => {
    setIsGlitching(true);
    triggerGlitch();
    setTimeout(() => setIsGlitching(false), 3500);
  }, [triggerGlitch]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i))) {
        await loadFile(file);
      }
    },
    [loadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "hsl(220 14% 6%)", fontFamily: "var(--app-font-sans)" }}
    >
      <header className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-black uppercase tracking-widest"
                  style={{ color: currentSchema.accentColor, fontSize: 22, letterSpacing: "0.2em", lineHeight: 1 }}
                >
                  CEP
                </span>
                <span
                  className="font-black"
                  style={{ color: "rgba(255,255,255,0.9)", fontSize: 22, lineHeight: 1 }}
                >
                  1
                </span>
              </div>
              <div
                className="uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, letterSpacing: "0.25em", marginTop: 1 }}
              >
                Cinematic Effects Processor
              </div>
            </div>

            <div
              className="w-px h-8 self-center"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: isPlaying ? currentSchema.accentColor : "rgba(255,255,255,0.15)",
                    boxShadow: isPlaying ? `0 0 6px ${currentSchema.accentColor}` : undefined,
                    transition: "all 0.2s",
                  }}
                />
                <span
                  className="text-xs uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, letterSpacing: "0.15em" }}
                >
                  {isPlaying ? "Active" : "Standby"}
                </span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 7, letterSpacing: "0.05em", paddingLeft: 16 }}>
                v1.0 by @floozyspeak // Dan Rockwell 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cleanSignal}
              className="px-4 py-2 rounded-lg font-black uppercase transition-all duration-150"
              style={{
                background: isClean
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${isClean ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                color: isClean ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                fontSize: 10,
                letterSpacing: "0.15em",
                boxShadow: isClean ? "0 0 12px rgba(255,255,255,0.08)" : undefined,
                transition: "all 0.2s",
              }}
            >
              {isClean ? "◈ CLEAN" : "◈ CLEAN SIGNAL"}
            </button>

            <RecButton
              isRecording={isRecording}
              onStart={startRecording}
              onStop={stopRecording}
            />

            <button
              onClick={handleGlitch}
              disabled={isGlitching}
              className="px-4 py-2 rounded-lg font-black uppercase transition-all duration-150 glitch-btn"
              style={{
                color: "#fff",
                fontSize: 10,
                letterSpacing: "0.15em",
                opacity: isGlitching ? 0.7 : 1,
                animation: isGlitching ? "rec-pulse 0.15s ease-in-out infinite" : undefined,
              }}
            >
              MASTER GLITCH
            </button>
          </div>
        </div>
      </header>

      <div className="border-b px-6 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 overflow-x-auto pb-1 hide-scrollbar">
            {schemas.map((schema) => (
              <SchemaCard
                key={schema.id}
                schema={schema}
                isActive={schema.id === currentSchema.id}
                onSelect={() => selectSchema(schema.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div
            className="rounded-xl p-4 pedal-panel"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="text-xs uppercase tracking-widest font-bold"
                style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: "0.2em" }}
              >
                Audio Source
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.flac,.aac"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                style={{
                  background: audioSourceType === "file" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${audioSourceType === "file" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                  color: audioSourceType === "file" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)",
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
                {fileName ? fileName.slice(0, 24) + (fileName.length > 24 ? "…" : "") : "Upload Audio"}
              </button>

              {hasAudioFile && audioSourceType === "file" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={isPlaying ? pause : play}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                    style={{
                      background: `linear-gradient(135deg, ${currentSchema.accentColor}33, ${currentSchema.accentColor}11)`,
                      border: `1px solid ${currentSchema.accentColor}55`,
                      color: currentSchema.accentColor,
                    }}
                  >
                    {isPlaying ? (
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"/>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={stop}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="4" width="16" height="16"/>
                    </svg>
                  </button>
                </div>
              )}

              <div
                className="w-px h-6 self-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />

              {audioSourceType === "microphone" ? (
                <button
                  onClick={stopMic}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#ef4444",
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  Stop Mic
                </button>
              ) : (
                <button
                  onClick={startMicrophone}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  Live Mic
                </button>
              )}

              <button
                onClick={() => setAmbientEnabled(!ambientEnabled)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ml-auto"
                style={{
                  background: ambientEnabled ? `${currentSchema.accentColor}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${ambientEnabled ? currentSchema.accentColor + "44" : "rgba(255,255,255,0.07)"}`,
                  color: ambientEnabled ? currentSchema.accentColor : "rgba(255,255,255,0.4)",
                }}
              >
                <svg width={10} height={10} viewBox="0 0 24 24" fill={ambientEnabled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                Ambient {ambientEnabled ? "On" : "Off"}
              </button>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "hsl(220 13% 7%)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div
                className="text-xs uppercase tracking-widest font-bold"
                style={{ color: "rgba(255,255,255,0.25)", fontSize: 8, letterSpacing: "0.2em" }}
              >
                Signal
              </div>
              <div className="flex gap-1">
                {(["oscilloscope", "spectrum"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setWaveformMode(m)}
                    className="px-2 py-0.5 rounded text-xs transition-all duration-100"
                    style={{
                      background: waveformMode === m ? "rgba(255,255,255,0.08)" : "transparent",
                      color: waveformMode === m ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
                      fontSize: 8,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 100 }}>
              <Waveform
                analyser={analyser}
                color={currentSchema.accentColor}
                mode={waveformMode}
              />
            </div>
          </div>

          <EffectPanel
            schema={currentSchema}
            effectSettings={effectSettings}
            setParam={setParam}
          />
        </div>

        <div className="space-y-4">
          <div
            className="rounded-xl p-4 pedal-panel"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="text-xs uppercase tracking-widest font-bold mb-3"
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: "0.2em" }}
            >
              Active Schema
            </div>
            <div
              className="rounded-lg p-3 mb-3"
              style={{ background: currentSchema.bgGradient, border: `1px solid ${currentSchema.accentColor}33` }}
            >
              <div
                className="font-black uppercase tracking-widest mb-1"
                style={{ color: currentSchema.accentColor, fontSize: 13, letterSpacing: "0.1em" }}
              >
                {currentSchema.title}
              </div>
              <div
                className="mb-2"
                style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontStyle: "italic" }}
              >
                "{currentSchema.tagline}"
              </div>
              <div
                style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, lineHeight: 1.5 }}
              >
                {currentSchema.description}
              </div>
            </div>
            <div
              className="rounded-lg p-2"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div
                className="text-xs mb-1 flex items-center gap-1"
                style={{ color: "rgba(255,255,255,0.25)", fontSize: 8 }}
              >
                <svg width={8} height={8} viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" strokeWidth={2} fill="none"/>
                </svg>
                AMBIENT TEXTURE
              </div>
              <div
                style={{ color: "rgba(255,255,255,0.45)", fontSize: 9, lineHeight: 1.4 }}
              >
                {currentSchema.ambientDescription}
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-4 pedal-panel"
          >
            <div
              className="text-xs uppercase tracking-widest font-bold mb-4"
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: "0.2em" }}
            >
              Master
            </div>
            <div className="flex items-center justify-center gap-6">
              <KnobControl
                label="Volume"
                value={effectSettings.masterGain}
                min={0}
                max={2}
                step={0.01}
                color={currentSchema.accentColor}
                size={64}
                onChange={(v) => setParam("masterGain", v)}
              />
              <KnobControl
                label="Ambient"
                value={effectSettings.ambientGain}
                min={0}
                max={1}
                step={0.01}
                color={currentSchema.accentColor}
                size={64}
                onChange={(v) => setParam("ambientGain", v)}
              />
            </div>
          </div>

          <div className="rounded-xl p-4 pedal-panel">
            <div
              className="text-xs uppercase tracking-widest font-bold mb-3"
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: "0.2em" }}
            >
              Glitch
            </div>
            <button
              onClick={handleGlitch}
              disabled={isGlitching}
              className="w-full py-5 rounded-xl font-black uppercase transition-all duration-150 glitch-btn"
              style={{
                fontSize: 14,
                letterSpacing: "0.2em",
                color: "#fff",
                opacity: isGlitching ? 0.7 : 1,
                animation: isGlitching ? "rec-pulse 0.15s ease-in-out infinite" : undefined,
              }}
            >
              {isGlitching ? "GLITCHING..." : "MASTER GLITCH"}
            </button>
            <p
              className="text-center mt-2"
              style={{ color: "rgba(255,255,255,0.2)", fontSize: 8 }}
            >
              Randomizes all parameters for 2-3s, then resets
            </p>
          </div>

          <div className="rounded-xl p-4 pedal-panel">
            <div
              className="text-xs uppercase tracking-widest font-bold mb-3"
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: "0.2em" }}
            >
              Record
            </div>
            <RecButton
              isRecording={isRecording}
              onStart={startRecording}
              onStop={stopRecording}
            />
            {isRecording && (
              <p
                className="mt-2"
                style={{ color: "rgba(239,68,68,0.7)", fontSize: 8 }}
              >
                Recording… WAV download on stop.
              </p>
            )}
          </div>

          <div className="rounded-xl p-4 pedal-panel">
            <div
              className="text-xs uppercase tracking-widest font-bold mb-2"
              style={{ color: "rgba(255,255,255,0.3)", fontSize: 8, letterSpacing: "0.2em" }}
            >
              How to use
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, lineHeight: 1.6 }}>
              1. Select a movie schema above<br />
              2. Upload an MP3/WAV or use live mic<br />
              3. Press play and twist the knobs<br />
              4. Hit MASTER GLITCH for chaos<br />
              5. REC to capture to WAV
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
