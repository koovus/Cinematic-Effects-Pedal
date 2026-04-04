import { useRef, useCallback, useEffect, useState } from "react";

interface KnobControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  logarithmic?: boolean;
  color?: string;
  size?: number;
  onChange: (value: number) => void;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function toLog(value: number, min: number, max: number): number {
  if (min <= 0) return value;
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const t = (value - min) / (max - min);
  return Math.exp(lerp(logMin, logMax, t));
}

function fromLog(value: number, min: number, max: number): number {
  if (min <= 0) return value;
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const logVal = Math.log(Math.max(min, value));
  return ((logVal - logMin) / (logMax - logMin)) * (max - min) + min;
}

function valueToNorm(value: number, min: number, max: number, logarithmic?: boolean): number {
  if (logarithmic) {
    return (fromLog(value, min, max) - min) / (max - min);
  }
  return (value - min) / (max - min);
}

function normToValue(norm: number, min: number, max: number, step: number, logarithmic?: boolean): number {
  let val: number;
  if (logarithmic) {
    val = toLog(norm * (max - min) + min, min, max);
  } else {
    val = norm * (max - min) + min;
  }
  val = Math.round(val / step) * step;
  return Math.max(min, Math.min(max, parseFloat(val.toFixed(4))));
}

export function KnobControl({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit,
  logarithmic,
  color = "#4ade80",
  size = 56,
  onChange,
}: KnobControlProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const startY = useRef(0);
  const startNorm = useRef(0);
  const isDragging = useRef(false);
  const [isActive, setIsActive] = useState(false);

  const norm = valueToNorm(value, min, max, logarithmic);
  const angle = -150 + norm * 300;
  const rad = (angle * Math.PI) / 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const indicatorLength = r - 4;
  const ix = cx + Math.sin(rad) * indicatorLength;
  const iy = cy - Math.cos(rad) * indicatorLength;

  const startArc = -150;
  const endArc = angle;
  const startRad = (startArc * Math.PI) / 180;
  const endRad = (endArc * Math.PI) / 180;

  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = {
      x: cx + Math.sin((startAngle * Math.PI) / 180) * r,
      y: cy - Math.cos((startAngle * Math.PI) / 180) * r,
    };
    const end = {
      x: cx + Math.sin((endAngle * Math.PI) / 180) * r,
      y: cy - Math.cos((endAngle * Math.PI) / 180) * r,
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  const trackArcPath = describeArc(cx, cy, r + 1, -150, 150);
  const valueArcPath = angle > -150 ? describeArc(cx, cy, r + 1, -150, angle) : "";

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      startY.current = e.clientY;
      startNorm.current = valueToNorm(value, min, max, logarithmic);
      isDragging.current = true;
      setIsActive(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value, min, max, logarithmic]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dy = startY.current - e.clientY;
      const sensitivity = 0.004;
      const newNorm = Math.max(0, Math.min(1, startNorm.current + dy * sensitivity));
      const newValue = normToValue(newNorm, min, max, step, logarithmic);
      onChange(newValue);
    },
    [min, max, step, logarithmic, onChange]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    setIsActive(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? step : -step;
      const newValue = Math.max(min, Math.min(max, parseFloat((value + delta).toFixed(4))));
      onChange(newValue);
    },
    [value, min, max, step, onChange]
  );

  const formatValue = (v: number) => {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + "k";
    if (step < 0.01) return v.toFixed(3);
    if (step < 0.1) return v.toFixed(2);
    if (step < 1) return v.toFixed(1);
    return Math.round(v).toString();
  };

  return (
    <div className="flex flex-col items-center gap-1 select-none" style={{ width: size + 16 }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        style={{ filter: isActive ? `drop-shadow(0 0 6px ${color}88)` : undefined }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="url(#knob-gradient)"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
        <defs>
          <radialGradient id="knob-gradient" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="hsl(220 13% 24%)" />
            <stop offset="100%" stopColor="hsl(220 13% 10%)" />
          </radialGradient>
        </defs>
        {trackArcPath && (
          <path
            d={trackArcPath}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        {valueArcPath && (
          <path
            d={valueArcPath}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={isActive ? 1 : 0.85}
          />
        )}
        <line
          x1={cx}
          y1={cy}
          x2={ix}
          y2={iy}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={isActive ? 1 : 0.9}
        />
        <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.8} />
      </svg>
      <div className="text-center" style={{ width: size + 16 }}>
        <div
          className="text-xs font-mono tabular-nums leading-tight"
          style={{ color, fontSize: 9 }}
        >
          {formatValue(value)}
          {unit ? <span className="opacity-60"> {unit}</span> : null}
        </div>
        <div
          className="text-xs font-medium uppercase tracking-wide leading-tight mt-0.5"
          style={{ color: "rgba(255,255,255,0.45)", fontSize: 9, letterSpacing: "0.08em" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
