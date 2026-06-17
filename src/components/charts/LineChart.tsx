import React, { useState, useRef, useMemo, useEffect } from 'react';

interface LineDataPoint {
  label: string;
  value: number;
  [key: string]: string | number | boolean | null | undefined;
}

interface LineConfig {
  key: string;
  color: string;
  label: string;
}

interface LineChartProps {
  data: LineDataPoint[];
  lines?: LineConfig[];
  height?: number;
  yUnit?: string;
  showArea?: boolean;
  showGrid?: boolean;
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

const LineChart: React.FC<LineChartProps> = ({
  data,
  lines,
  height = 260,
  yUnit = '',
  showArea = true,
  showGrid = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipData, setTooltipData] = useState<{ label: string; values: { label: string; value: number; color: string }[] } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const defaultLines: LineConfig[] = useMemo(() => (
    lines && lines.length > 0
      ? lines
      : [{ key: 'value', color: '#2D6A4F', label: '数值' }]
  ), [lines]);

  const { minValue, maxValue, yTicks } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    data.forEach((d) => {
      defaultLines.forEach((line) => {
        const v = Number(d[line.key]);
        if (!isNaN(v)) {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      });
    });
    if (min === Infinity) { min = 0; max = 100; }
    if (min === max) { max = min + 1; }
    const range = max - min;
    min = Math.floor(min - range * 0.1);
    max = Math.ceil(max + range * 0.1);
    const ticks: number[] = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(min + ((max - min) / tickCount) * i);
    }
    return { minValue: min, maxValue: max, yTicks: ticks };
  }, [data, defaultLines]);

  const chartW = Math.max(width - PADDING.left - PADDING.right, 100);
  const chartH = height - PADDING.top - PADDING.bottom;

  const getX = (i: number) => {
    if (data.length <= 1) return PADDING.left + chartW / 2;
    return PADDING.left + (chartW * i) / (data.length - 1);
  };

  const getY = (val: number) => {
    const ratio = (val - minValue) / (maxValue - minValue);
    return PADDING.top + chartH * (1 - ratio);
  };

  const generatePath = (key: string) => {
    return data.map((d, i) => {
      const val = Number(d[key]);
      const x = getX(i);
      const y = isNaN(val) ? PADDING.top + chartH : getY(val);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  };

  const generateAreaPath = (key: string) => {
    const linePath = data.map((d, i) => {
      const val = Number(d[key]);
      const x = getX(i);
      const y = isNaN(val) ? PADDING.top + chartH : getY(val);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    const lastX = data.length > 0 ? getX(data.length - 1) : PADDING.left;
    const firstX = data.length > 0 ? getX(0) : PADDING.left;
    const baseY = PADDING.top + chartH;
    return `${linePath} L${lastX.toFixed(2)},${baseY.toFixed(2)} L${firstX.toFixed(2)},${baseY.toFixed(2)} Z`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGGElement>, idx: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverIdx(idx);
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    const values = defaultLines.map((line) => ({
      label: line.label,
      value: Number(data[idx][line.key]),
      color: line.color,
    }));
    setTooltipData({ label: data[idx].label, values });
  };

  const handleMouseLeave = () => {
    setHoverIdx(null);
    setTooltipData(null);
  };

  const totalLength = useMemo(() => {
    return Math.sqrt(chartW * chartW + chartH * chartH) * 2;
  }, [chartW, chartH]);

  const gradientIdPrefix = useMemo(() => `line-grad-${Math.random().toString(36).slice(2, 9)}`, []);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          {defaultLines.map((line, idx) => (
            <linearGradient
              key={`${gradientIdPrefix}-${idx}`}
              id={`${gradientIdPrefix}-${idx}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={line.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={line.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {showGrid && yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y}
                y2={y}
                stroke="#E8E0D5"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={PADDING.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#9CA3AF"
              >
                {Number.isInteger(tick) ? tick : tick.toFixed(1)}{yUnit}
              </text>
            </g>
          );
        })}

        <line
          x1={PADDING.left}
          x2={width - PADDING.right}
          y1={height - PADDING.bottom}
          y2={height - PADDING.bottom}
          stroke="#E8E0D5"
          strokeWidth="1"
        />

        {data.map((d, i) => {
          const x = getX(i);
          const y = height - PADDING.bottom + 20;
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="11"
              fill="#6B7280"
            >
              {d.label}
            </text>
          );
        })}

        {showArea && defaultLines.map((line, idx) => (
          <path
            key={`area-${idx}`}
            d={generateAreaPath(line.key)}
            fill={`url(#${gradientIdPrefix}-${idx})`}
            style={{
              opacity: mounted ? 1 : 0,
              transition: `opacity 0.6s ease-out ${idx * 0.15}s`,
            }}
          />
        ))}

        {defaultLines.map((line, idx) => (
          <path
            key={`line-${idx}`}
            d={generatePath(line.key)}
            fill="none"
            stroke={line.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: totalLength,
              strokeDashoffset: mounted ? 0 : totalLength,
              transition: `stroke-dashoffset 1.2s ease-out ${idx * 0.2}s`,
            }}
          />
        ))}

        {data.map((d, i) => (
          <g key={`hit-${i}`}>
            <rect
              x={getX(i) - (chartW / Math.max(data.length - 1, 1)) / 2}
              y={PADDING.top}
              width={chartW / Math.max(data.length - 1, 1)}
              height={chartH}
              fill="transparent"
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'pointer' }}
            />
            {hoverIdx === i && (
              <line
                x1={getX(i)}
                x2={getX(i)}
                y1={PADDING.top}
                y2={height - PADDING.bottom}
                stroke="#CBD5E1"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
          </g>
        ))}

        {defaultLines.map((line, idx) =>
          data.map((d, i) => {
            const val = Number(d[line.key]);
            if (isNaN(val)) return null;
            const x = getX(i);
            const y = getY(val);
            const isHover = hoverIdx === i;
            return (
              <circle
                key={`dot-${idx}-${i}`}
                cx={x}
                cy={y}
                r={isHover ? 6 : 3.5}
                fill="#fff"
                stroke={line.color}
                strokeWidth={isHover ? 3 : 2}
                style={{
                  transition: 'r 0.2s ease, stroke-width 0.2s ease',
                  opacity: mounted ? 1 : 0,
                  animationDelay: `${idx * 0.2 + 0.8 + i * 0.05}s`,
                  animation: mounted ? `fadeInUp 0.3s ease-out ${idx * 0.2 + 0.8 + i * 0.05}s both` : undefined,
                }}
                onMouseMove={(e) => handleMouseMove(e, i)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })
        )}
      </svg>

      {tooltipData && (
        <div
          className="absolute z-50 px-3 py-2 text-xs bg-gray-900/95 text-white rounded-lg shadow-xl pointer-events-none backdrop-blur-sm"
          style={{
            left: Math.min(tooltipPos.x + 12, width - 160),
            top: Math.max(tooltipPos.y - 10, 0),
            opacity: 1,
            transition: 'opacity 0.15s',
          }}
        >
          <div className="font-medium mb-1 text-gray-200">{tooltipData.label}</div>
          <div className="space-y-0.5">
            {tooltipData.values.map((v, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: v.color }}
                />
                <span className="text-gray-300">{v.label}:</span>
                <span className="font-medium">
                  {Number.isInteger(v.value) ? v.value : v.value.toFixed(2)}{yUnit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LineChart;
