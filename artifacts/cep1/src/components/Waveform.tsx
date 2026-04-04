import { useEffect, useRef } from "react";

interface WaveformProps {
  analyser: AnalyserNode | null;
  color?: string;
  width?: number;
  height?: number;
  mode?: "oscilloscope" | "spectrum";
}

export function Waveform({
  analyser,
  color = "#4ade80",
  width = 400,
  height = 120,
  mode = "oscilloscope",
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.fftSize;
    const timeDomainData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(10, 12, 16, 0.85)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 4) * i);
        ctx.lineTo(w, (h / 4) * i);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();

      if (mode === "oscilloscope") {
        analyser.getByteTimeDomainData(timeDomainData);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        const sliceWidth = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = timeDomainData[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      } else {
        analyser.getByteFrequencyData(freqData);
        const barWidth = w / analyser.frequencyBinCount;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        for (let i = 0; i < analyser.frequencyBinCount; i++) {
          const barHeight = (freqData[i] / 255) * h;
          const alpha = 0.5 + (freqData[i] / 255) * 0.5;
          ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, "0");
          ctx.fillRect(i * barWidth, h - barHeight, barWidth - 0.5, barHeight);
        }
      }

      ctx.shadowBlur = 0;
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, color, mode]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full rounded waveform-canvas"
      style={{ imageRendering: "auto" }}
    />
  );
}
