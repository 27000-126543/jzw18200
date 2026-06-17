import React, { useState, useEffect, useMemo } from 'react';

interface GaugeChartProps {
  value: number;
  label?: string;
  size?: number;
  thresholds?: { warning: number; danger: number };
}

const COLORS = {
  success: '#52B788',
  warning: '#F4A261',
  danger: '#E76F51',
  track: '#E8E0D5',
};

const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  label = '完成度',
  size = 240,
  thresholds = { warning: 60, danger: 85 },
}) => {
  const [mounted, setMounted] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const clamped = Math.max(0, Math.min(100, value));
    const duration = 1200;
    const startTime = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(clamped * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [mounted, value]);

  const clampedValue = Math.max(0, Math.min(100, value));

  const getSegmentColor = (pct: number) => {
    if (pct >= thresholds.danger) return COLORS.danger;
    if (pct >= thresholds.warning) return COLORS.warning;
    return COLORS.success;
  };

  const currentColor = getSegmentColor(clampedValue);

  const cx = size / 2;
  const cy = size / 2 + size * 0.08;
  const radius = size * 0.42;
  const thickness = Math.max(16, size * 0.08);

  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const totalArcAngle = endAngle - startAngle;

  const arcPath = (startPct: number, endPct: number) => {
    const startRad = startAngle + totalArcAngle * startPct;
    const endRad = startAngle + totalArcAngle * endPct;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = endPct - startPct > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const segments = useMemo(() => {
    const { warning, danger } = thresholds;
    return [
      { start: 0, end: warning / 100, color: COLORS.success },
      { start: warning / 100, end: danger / 100, color: COLORS.warning },
      { start: danger / 100, end: 1, color: COLORS.danger },
    ].filter((s) => s.end > s.start);
  }, [thresholds]);

  const valuePct = mounted ? displayValue / 100 : 0;
  const valueAngle = startAngle + totalArcAngle * valuePct;

  const pointerX = cx + (radius - thickness * 0.6) * Math.cos(valueAngle);
  const pointerY = cy + (radius - thickness * 0.6) * Math.sin(valueAngle);

  const tickMarks = useMemo(() => {
    const ticks: { x: number; y: number; x2: number; y2: number; pct: number; label?: string }[] = [];
    const tickCount = 10;
    for (let i = 0; i <= tickCount; i++) {
      const pct = i / tickCount;
      const angle = startAngle + totalArcAngle * pct;
      const outerR = radius + thickness * 0.2;
      const innerR = i % 2 === 0 ? radius + thickness * 0.55 : radius + thickness * 0.35;
      const isLabel = i % 2 === 0;
      ticks.push({
        x: cx + innerR * Math.cos(angle),
        y: cy + innerR * Math.sin(angle),
        x2: cx + outerR * Math.cos(angle),
        y2: cy + outerR * Math.sin(angle),
        pct,
        label: isLabel ? `${i * 10}` : undefined,
      });
    }
    return ticks;
  }, [cx, cy, radius, thickness, startAngle, totalArcAngle]);

  return (
    <div className="relative w-full flex flex-col items-center" style={{ maxWidth: size }}>
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`} className="overflow-visible">
        <defs>
          <linearGradient id="gauge-success-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#95D5B2" />
            <stop offset="100%" stopColor={COLORS.success} />
          </linearGradient>
          <linearGradient id="gauge-warning-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.success} />
            <stop offset="100%" stopColor={COLORS.warning} />
          </linearGradient>
          <linearGradient id="gauge-danger-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={COLORS.warning} />
            <stop offset="100%" stopColor={COLORS.danger} />
          </linearGradient>
          <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={arcPath(0, 1)}
          fill="none"
          stroke={COLORS.track}
          strokeWidth={thickness}
          strokeLinecap="round"
          opacity="0.6"
        />

        {segments.map((seg, idx) => {
          const displayEnd = Math.min(seg.end, valuePct);
          if (displayEnd <= seg.start) return null;
          const startPct = seg.start;
          const endPct = displayEnd;
          if (endPct <= startPct) return null;
          return (
            <path
              key={`seg-${idx}`}
              d={arcPath(startPct, endPct)}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeLinecap={idx === segments.length - 1 && endPct >= seg.end - 0.001 ? 'round' : 'butt'}
              style={{
                strokeDasharray: radius * Math.PI,
                strokeDashoffset: mounted ? 0 : radius * Math.PI,
                transition: `stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.12}s`,
              }}
            />
          );
        })}

        {tickMarks.map((tick, idx) => (
          <g key={`tick-${idx}`}>
            <line
              x1={tick.x}
              y1={tick.y}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.pct * 100 <= displayValue ? currentColor : '#D1D5DB'}
              strokeWidth={idx % 2 === 0 ? 2 : 1}
              strokeLinecap="round"
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.3s ease-out ${idx * 0.03 + 0.3}s, stroke 0.3s ease`,
              }}
            />
            {tick.label && (
              <text
                x={cx + (radius + thickness * 0.95) * Math.cos(startAngle + totalArcAngle * tick.pct)}
                y={cy + (radius + thickness * 0.95) * Math.sin(startAngle + totalArcAngle * tick.pct) + 4}
                textAnchor="middle"
                fontSize="10"
                fill={tick.pct * 100 <= displayValue ? '#374151' : '#9CA3AF'}
                fontWeight="500"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.3s ease-out ${idx * 0.03 + 0.4}s`,
                }}
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}

        <circle
          cx={cx}
          cy={cy}
          r={thickness * 0.35}
          fill="#fff"
          stroke={currentColor}
          strokeWidth="2"
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.4s ease-out 0.5s, stroke 0.3s ease',
            filter: mounted ? 'url(#gauge-glow)' : undefined,
          }}
        />

        <g
          style={{
            transform: `rotate(${(valueAngle - Math.PI * 1.5) * (180 / Math.PI)}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
            opacity: mounted ? 1 : 0,
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={pointerX}
            y2={pointerY}
            stroke={currentColor}
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
            }}
          />
        </g>

        <circle
          cx={cx}
          cy={cy}
          r={thickness * 0.18}
          fill={currentColor}
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 0.4s ease-out 0.7s, fill 0.3s ease',
          }}
        />
      </svg>

      <div
        className="flex flex-col items-center mt-1"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.5s ease-out 0.8s',
        }}
      >
        <div className="flex items-baseline gap-1">
          <span
            className="font-bold leading-none"
            style={{
              fontSize: Math.max(28, size * 0.16),
              color: currentColor,
              lineHeight: 1,
            }}
          >
            {Math.round(displayValue)}
          </span>
          <span
            className="text-gray-500 font-medium"
            style={{ fontSize: Math.max(14, size * 0.07) }}
          >
            %
          </span>
        </div>
        <span
          className="text-gray-500 mt-1.5"
          style={{ fontSize: Math.max(12, size * 0.055) }}
        >
          {label}
        </span>
        <div className="mt-3 flex items-center gap-3 flex-wrap justify-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.success }} />
            <span className="text-xs text-gray-500">0-{thresholds.warning}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.warning }} />
            <span className="text-xs text-gray-500">{thresholds.warning}-{thresholds.danger}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS.danger }} />
            <span className="text-xs text-gray-500">&ge;{thresholds.danger}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GaugeChart;
