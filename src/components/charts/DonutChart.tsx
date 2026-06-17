import React, { useState, useMemo, useEffect } from 'react';

interface DonutDataPoint {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDataPoint[];
  size?: number;
  thickness?: number;
  centerText?: string;
  centerSubtext?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 240,
  thickness = 28,
  centerText,
  centerSubtext,
}) => {
  const [mounted, setMounted] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const total = useMemo(() => {
    return data.reduce((acc, d) => acc + Math.max(0, d.value), 0);
  }, [data]);

  const radius = size / 2 - thickness / 2 - 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(() => {
    let accumulated = 0;
    return data.map((d, idx) => {
      const value = Math.max(0, d.value);
      const percentage = total > 0 ? value / total : 0;
      const dashLength = circumference * percentage;
      const gapLength = circumference - dashLength;
      const offset = circumference * 0.25 - circumference * accumulated;
      accumulated += percentage;
      return {
        ...d,
        idx,
        percentage,
        dashArray: `${dashLength} ${gapLength}`,
        dashOffset: -offset,
        value,
      };
    });
  }, [data, total, circumference]);

  const displayCenterText = centerText ?? (total > 0 ? total.toLocaleString() : '0');
  const displayCenterSubtext = centerSubtext ?? '总计';

  return (
    <div className="flex items-center gap-6 w-full flex-wrap justify-center">
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            {data.map((d, idx) => (
              <filter key={`shadow-${idx}`} id={`donut-shadow-${idx}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={d.color} floodOpacity="0.25" />
              </filter>
            ))}
          </defs>

          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth={thickness}
          />

          {segments.map((seg, idx) => {
            const isHover = hoverIdx === idx;
            return (
              <circle
                key={`seg-${idx}`}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHover ? thickness + 4 : thickness}
                strokeLinecap={seg.percentage > 0.01 ? 'butt' : undefined}
                strokeDasharray={mounted ? seg.dashArray : `0 ${circumference}`}
                strokeDashoffset={mounted ? seg.dashOffset : circumference * 0.25}
                filter={isHover && seg.percentage > 0 ? `url(#donut-shadow-${idx})` : undefined}
                style={{
                  transition: `stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.15}s,
                               stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.15}s,
                               stroke-width 0.25s ease-out,
                               filter 0.25s ease-out`,
                  cursor: seg.value > 0 ? 'pointer' : 'default',
                  transform: isHover ? `scale(1.03)` : 'scale(1)',
                  transformOrigin: `${center}px ${center}px`,
                }}
                onMouseEnter={() => seg.value > 0 && setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
          })}
        </svg>

        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="font-bold text-gray-800 leading-none"
            style={{
              fontSize: Math.max(18, size * 0.15),
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.5s ease-out 0.6s',
            }}
          >
            {displayCenterText}
          </div>
          <div
            className="text-gray-500 mt-1.5"
            style={{
              fontSize: Math.max(11, size * 0.075),
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(6px)',
              transition: 'all 0.5s ease-out 0.75s',
            }}
          >
            {displayCenterSubtext}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-[180px] animate-stagger">
        {segments.map((seg, idx) => {
          const isHover = hoverIdx === idx;
          const displayPct = (seg.percentage * 100).toFixed(1);
          return (
            <div
              key={`legend-${idx}`}
              className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
                isHover ? 'bg-gray-50 -mx-1' : (hoverIdx !== null ? 'opacity-50' : '')
              }`}
              onMouseEnter={() => seg.value > 0 && setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{
                transform: mounted ? 'translateX(0)' : 'translateX(12px)',
                opacity: mounted ? (hoverIdx !== null ? (isHover ? 1 : 0.5) : 1) : 0,
                transition: `transform 0.45s ease-out ${idx * 60 + 400}ms,
                             opacity 0.45s ease-out ${idx * 60 + 400}ms,
                             background-color 0.2s ease`,
              }}
            >
              <span
                className="flex-shrink-0 rounded-md transition-all duration-200"
                style={{
                  width: isHover ? 14 : 12,
                  height: isHover ? 14 : 12,
                  backgroundColor: seg.color,
                  boxShadow: isHover ? `0 2px 8px ${seg.color}40` : 'none',
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {seg.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                    {seg.value.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: mounted ? `${Math.min(100, parseFloat(displayPct))}%` : '0%',
                        backgroundColor: seg.color,
                        transition: `width 0.8s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 100 + 500}ms`,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium flex-shrink-0 min-w-[42px] text-right"
                    style={{ color: seg.color }}
                  >
                    {displayPct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonutChart;
