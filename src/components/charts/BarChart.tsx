import React, { useState, useRef, useEffect, useMemo } from 'react';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
  extra?: Record<string, unknown>;
}

interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  yUnit?: string;
  horizontal?: boolean;
  showValue?: boolean;
  compareData?: BarDataPoint[];
}

const PADDING_V = { top: 30, right: 20, bottom: 40, left: 50 };
const PADDING_H = { top: 20, right: 60, bottom: 20, left: 80 };

const POSITIVE_COLOR = '#52B788';
const NEGATIVE_COLOR = '#E76F51';

const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 260,
  yUnit = '',
  horizontal = false,
  showValue = true,
  compareData,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [mounted, setMounted] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

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

  const hasCompare = !!compareData && compareData.length > 0;
  const PAD = horizontal ? PADDING_H : PADDING_V;

  const { minValue, maxValue, yTicks } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    data.forEach((d) => {
      min = Math.min(min, d.value);
      max = Math.max(max, d.value);
    });
    if (hasCompare) {
      compareData!.forEach((d) => {
        min = Math.min(min, d.value);
        max = Math.max(max, d.value);
      });
    }
    if (min === Infinity) { min = 0; max = 100; }
    min = Math.min(0, Math.floor(min * 1.1));
    max = Math.max(0, Math.ceil(max * 1.15));
    if (min === max) { max = min + 1; }
    const ticks: number[] = [];
    const tickCount = 4;
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(min + ((max - min) / tickCount) * i);
    }
    return { minValue: min, maxValue: max, yTicks: ticks };
  }, [data, compareData, hasCompare]);

  const getThresholdColor = (value: number, compareValue?: number) => {
    if (compareValue === undefined || compareValue === 0) return null;
    const diff = (value - compareValue) / Math.abs(compareValue);
    if (diff >= 0.15) return POSITIVE_COLOR;
    if (diff <= -0.15) return NEGATIVE_COLOR;
    return null;
  };

  const barGroupCount = data.length || 1;

  if (horizontal) {
    const chartW = Math.max(width - PAD.left - PAD.right, 100);
    const chartH = height - PAD.top - PAD.bottom;
    const barGroupHeight = chartH / barGroupCount;
    const barCountInGroup = hasCompare ? 2 : 1;
    const barHeight = Math.min(barGroupHeight * 0.7 / barCountInGroup, 18);
    const gap = 4;

    const getBarY = (i: number, subIdx: number) => {
      const groupCenter = PAD.top + barGroupHeight * i + barGroupHeight / 2;
      const totalBarHeight = barHeight * barCountInGroup + gap * (barCountInGroup - 1);
      const startY = groupCenter - totalBarHeight / 2;
      return startY + subIdx * (barHeight + gap);
    };

    const getBarWidth = (val: number) => {
      const ratio = (val - minValue) / (maxValue - minValue);
      return chartW * ratio;
    };

    const zeroX = PAD.left + getBarWidth(0);

    return (
      <div ref={containerRef} className="relative w-full" style={{ height }}>
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id="hbar-main-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2D6A4F" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#40916C" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="hbar-compare-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#D4A373" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#E9C46A" stopOpacity="1" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, i) => {
            const x = PAD.left + getBarWidth(tick);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={PAD.top}
                  y2={height - PAD.bottom}
                  stroke="#E8E0D5"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={height - PAD.bottom + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#9CA3AF"
                >
                  {Number.isInteger(tick) ? tick : tick.toFixed(1)}{yUnit}
                </text>
              </g>
            );
          })}

          <line
            x1={zeroX}
            x2={zeroX}
            y1={PAD.top}
            y2={height - PAD.bottom}
            stroke="#D1D5DB"
            strokeWidth="1"
          />

          {data.map((d, i) => {
            const val = d.value;
            const compareVal = hasCompare ? compareData![i]?.value : undefined;
            const thresholdColor = getThresholdColor(val, compareVal);
            const barFill = thresholdColor || d.color || 'url(#hbar-main-grad)';
            const isPositive = val >= 0;

            return (
              <g key={`row-${i}`}>
                <text
                  x={PAD.left - 10}
                  y={getBarY(i, 0) + barHeight / 2 + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#4B5563"
                >
                  {d.label}
                </text>

                <rect
                  x={isPositive ? zeroX : zeroX - Math.max(0.01, (Math.abs(val) / (maxValue - minValue)) * chartW)}
                  y={getBarY(i, 0)}
                  width={mounted ? Math.max(2, (Math.abs(val) / (maxValue - minValue)) * chartW) : 0}
                  height={barHeight}
                  fill={barFill}
                  rx={barHeight / 2}
                  style={{
                    transformOrigin: isPositive ? 'left center' : 'right center',
                    transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDelay: `${i * 80}ms`,
                    opacity: hoverIdx === i || hoverIdx === null ? 1 : 0.6,
                  }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />

                {showValue && (
                  <text
                    x={isPositive
                      ? zeroX + Math.max(0.01, (Math.abs(val) / (maxValue - minValue)) * chartW) + 8
                      : zeroX - Math.max(0.01, (Math.abs(val) / (maxValue - minValue)) * chartW) - 8}
                    y={getBarY(i, 0) + barHeight / 2 + 4}
                    textAnchor={isPositive ? 'start' : 'end'}
                    fontSize="11"
                    fontWeight="600"
                    fill={thresholdColor || '#374151'}
                    style={{
                      opacity: mounted ? 1 : 0,
                      transition: `opacity 0.3s ease-out ${i * 80 + 600}ms`,
                    }}
                  >
                    {Number.isInteger(val) ? val : val.toFixed(1)}{yUnit}
                    {thresholdColor && compareVal !== undefined && (
                      <tspan fontSize="9" fill={thresholdColor} dx="4">
                        {val >= compareVal ? '↑' : '↓'}{Math.abs(Math.round((val - compareVal) / compareVal * 100))}%
                      </tspan>
                    )}
                  </text>
                )}

                {hasCompare && compareData![i] && (() => {
                  const cVal = compareData![i].value;
                  const cIsPositive = cVal >= 0;
                  return (
                    <>
                      <rect
                        x={cIsPositive ? zeroX : zeroX - Math.max(0.01, (Math.abs(cVal) / (maxValue - minValue)) * chartW)}
                        y={getBarY(i, 1)}
                        width={mounted ? Math.max(2, (Math.abs(cVal) / (maxValue - minValue)) * chartW) : 0}
                        height={barHeight}
                        fill={compareData![i].color || 'url(#hbar-compare-grad)'}
                        rx={barHeight / 2}
                        opacity="0.7"
                        style={{
                          transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                          transitionDelay: `${i * 80 + 100}ms`,
                          opacity: (hoverIdx === i || hoverIdx === null) ? 0.7 : 0.4,
                        }}
                        onMouseEnter={() => setHoverIdx(i)}
                        onMouseLeave={() => setHoverIdx(null)}
                      />
                      {showValue && (
                        <text
                          x={cIsPositive
                            ? zeroX + Math.max(0.01, (Math.abs(cVal) / (maxValue - minValue)) * chartW) + 8
                            : zeroX - Math.max(0.01, (Math.abs(cVal) / (maxValue - minValue)) * chartW) - 8}
                          y={getBarY(i, 1) + barHeight / 2 + 4}
                          textAnchor={cIsPositive ? 'start' : 'end'}
                          fontSize="10"
                          fill="#9CA3AF"
                          style={{
                            opacity: mounted ? 1 : 0,
                            transition: `opacity 0.3s ease-out ${i * 80 + 700}ms`,
                          }}
                        >
                          {Number.isInteger(cVal) ? cVal : cVal.toFixed(1)}{yUnit}
                        </text>
                      )}
                    </>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const chartW = Math.max(width - PAD.left - PAD.right, 100);
  const chartH = height - PAD.top - PAD.bottom;
  const barGroupWidth = chartW / barGroupCount;
  const barCountInGroup = hasCompare ? 2 : 1;
  const barWidth = Math.min(barGroupWidth * 0.6 / barCountInGroup, 36);
  const gap = 4;

  const getBarX = (i: number, subIdx: number) => {
    const groupCenter = PAD.left + barGroupWidth * i + barGroupWidth / 2;
    const totalBarWidth = barWidth * barCountInGroup + gap * (barCountInGroup - 1);
    const startX = groupCenter - totalBarWidth / 2;
    return startX + subIdx * (barWidth + gap);
  };

  const getBarHeight = (val: number) => {
    const ratio = (val - minValue) / (maxValue - minValue);
    return chartH * ratio;
  };

  const zeroY = PAD.top + chartH - getBarHeight(0);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="vbar-main-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#40916C" stopOpacity="1" />
            <stop offset="100%" stopColor="#2D6A4F" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="vbar-compare-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E9C46A" stopOpacity="1" />
            <stop offset="100%" stopColor="#D4A373" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="vbar-positive-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#95D5B2" stopOpacity="1" />
            <stop offset="100%" stopColor="#52B788" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="vbar-negative-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4A261" stopOpacity="1" />
            <stop offset="100%" stopColor="#E76F51" stopOpacity="1" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => {
          const y = PAD.top + chartH - getBarHeight(tick);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y}
                y2={y}
                stroke="#E8E0D5"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 10}
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
          x1={PAD.left}
          x2={width - PAD.right}
          y1={zeroY}
          y2={zeroY}
          stroke="#D1D5DB"
          strokeWidth="1"
        />

        {data.map((d, i) => {
          const val = d.value;
          const compareVal = hasCompare ? compareData![i]?.value : undefined;
          const thresholdColor = getThresholdColor(val, compareVal);
          const barFill = thresholdColor
            ? thresholdColor === POSITIVE_COLOR ? 'url(#vbar-positive-grad)' : 'url(#vbar-negative-grad)'
            : d.color || 'url(#vbar-main-grad)';
          const isPositive = val >= 0;
          const actualBarHeight = (Math.abs(val) / (maxValue - minValue)) * chartH;

          return (
            <g key={`col-${i}`}>
              <text
                x={PAD.left + barGroupWidth * i + barGroupWidth / 2}
                y={height - PAD.bottom + 18}
                textAnchor="middle"
                fontSize="11"
                fill="#4B5563"
              >
                {d.label}
              </text>

              <rect
                x={getBarX(i, 0)}
                y={isPositive ? zeroY - actualBarHeight : zeroY}
                width={barWidth}
                height={mounted ? Math.max(2, actualBarHeight) : 0}
                fill={barFill}
                rx={Math.min(barWidth / 2, 6)}
                style={{
                  transformOrigin: isPositive ? 'center bottom' : 'center top',
                  transition: 'height 0.8s cubic-bezier(0.22, 1, 0.36, 1), y 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                  transitionDelay: `${i * 80}ms`,
                  opacity: hoverIdx === i || hoverIdx === null ? 1 : 0.6,
                  filter: hoverIdx === i ? 'drop-shadow(0 4px 8px rgba(45,106,79,0.15))' : 'none',
                }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />

              {showValue && (
                <text
                  x={getBarX(i, 0) + barWidth / 2}
                  y={isPositive ? zeroY - actualBarHeight - 8 : zeroY + actualBarHeight + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={thresholdColor || '#374151'}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transition: `opacity 0.3s ease-out ${i * 80 + 600}ms`,
                  }}
                >
                  {Number.isInteger(val) ? val : val.toFixed(1)}{yUnit}
                </text>
              )}

              {thresholdColor && compareVal !== undefined && (
                <text
                  x={getBarX(i, 0) + barWidth / 2}
                  y={isPositive ? zeroY - actualBarHeight - 22 : zeroY + actualBarHeight + 28}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill={thresholdColor}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transition: `opacity 0.3s ease-out ${i * 80 + 700}ms`,
                  }}
                >
                  {val >= compareVal ? '↑' : '↓'}{Math.abs(Math.round((val - compareVal) / compareVal * 100))}%
                </text>
              )}

              {hasCompare && compareData![i] && (() => {
                const cVal = compareData![i].value;
                const cIsPositive = cVal >= 0;
                const cBarH = (Math.abs(cVal) / (maxValue - minValue)) * chartH;
                return (
                  <>
                    <rect
                      x={getBarX(i, 1)}
                      y={cIsPositive ? zeroY - cBarH : zeroY}
                      width={barWidth}
                      height={mounted ? Math.max(2, cBarH) : 0}
                      fill={compareData![i].color || 'url(#vbar-compare-grad)'}
                      rx={Math.min(barWidth / 2, 6)}
                      opacity="0.75"
                      style={{
                        transition: 'height 0.8s cubic-bezier(0.22, 1, 0.36, 1), y 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
                        transitionDelay: `${i * 80 + 100}ms`,
                        opacity: (hoverIdx === i || hoverIdx === null) ? 0.75 : 0.45,
                      }}
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                    />
                    {showValue && (
                      <text
                        x={getBarX(i, 1) + barWidth / 2}
                        y={cIsPositive ? zeroY - cBarH - 8 : zeroY + cBarH + 14}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#9CA3AF"
                        style={{
                          opacity: mounted ? 1 : 0,
                          transition: `opacity 0.3s ease-out ${i * 80 + 650}ms`,
                        }}
                      >
                        {Number.isInteger(cVal) ? cVal : cVal.toFixed(1)}
                      </text>
                    )}
                  </>
                );
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default BarChart;
