import type { Bar } from '../contracts/types';
import { formatTurnover } from '../simulation/leaderboard';
import { roundTo } from '../simulation/prng';

const WIDTH = 900;
const HEIGHT = 340;
const PAD = { top: 16, right: 56, bottom: 26, left: 12 };
const PRICE_HEIGHT = 214;
const VOLUME_TOP = PAD.top + PRICE_HEIGHT + 26;
const VOLUME_HEIGHT = 62;

interface Props {
  readonly bars: readonly Bar[];
  /** 图表内展示的最近根数 */
  readonly visible: number;
  readonly symbol: string;
}

interface Scaled {
  readonly bars: readonly Bar[];
  readonly min: number;
  readonly max: number;
  readonly maxVolume: number;
  readonly step: number;
}

function scale(bars: readonly Bar[], visible: number): Scaled {
  const slice = bars.slice(Math.max(0, bars.length - visible));
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let maxVolume = 0;
  for (const bar of slice) {
    if (bar.low < min) min = bar.low;
    if (bar.high > max) max = bar.high;
    if (bar.volume > maxVolume) maxVolume = bar.volume;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  const span = Math.max(0.01, max - min);
  const padded = { min: min - span * 0.06, max: max + span * 0.06 };
  return {
    bars: slice,
    min: padded.min,
    max: padded.max,
    maxVolume: Math.max(1, maxVolume),
    step: (WIDTH - PAD.left - PAD.right) / Math.max(1, slice.length),
  };
}

export function CandlestickChart({ bars, visible, symbol }: Props) {
  const data = scale(bars, visible);
  const priceRange = data.max - data.min;
  const yOf = (price: number): number =>
    PAD.top + ((data.max - price) / priceRange) * PRICE_HEIGHT;
  const plotWidth = WIDTH - PAD.left - PAD.right;

  const gridPrices = [0, 0.25, 0.5, 0.75, 1].map((ratio) => data.min + priceRange * ratio);
  const closePath = data.bars
    .map((bar, index) => {
      const x = PAD.left + index * data.step + data.step / 2;
      return `${index === 0 ? 'M' : 'L'}${roundTo(x, 2)} ${roundTo(yOf(bar.close), 2)}`;
    })
    .join(' ');

  const last = data.bars[data.bars.length - 1];
  const labelStep = Math.max(1, Math.ceil(data.bars.length / 6));

  return (
    <div className="chart-box" data-testid="stock-chart-container">
      <svg
        className="chart-svg"
        data-testid="stock-chart-svg"
        data-bars={data.bars.length}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${symbol} 合成 K 线图，共 ${data.bars.length} 根`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="lumen-close-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14c2ac" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#14c2ac" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#ffffff" />

        {gridPrices.map((price, index) => {
          const y = roundTo(yOf(price), 2);
          return (
            <g key={`grid-${index}`}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y}
                y2={y}
                stroke="rgba(11,26,43,0.10)"
                strokeDasharray="3 5"
              />
              <text
                x={WIDTH - PAD.right + 6}
                y={y + 4}
                fontSize="11"
                fill="#5a6b7d"
                fontFamily="monospace"
              >
                {price.toFixed(2)}
              </text>
            </g>
          );
        })}

        {data.bars.map((bar, index) => {
          const x = PAD.left + index * data.step + data.step / 2;
          const rising = bar.close >= bar.open;
          const color = rising ? '#d4556b' : '#0e9e8c';
          const bodyTop = yOf(Math.max(bar.open, bar.close));
          const bodyBottom = yOf(Math.min(bar.open, bar.close));
          const bodyWidth = Math.max(1.6, data.step * 0.56);
          return (
            <g key={`bar-${bar.i}`}>
              <line
                x1={roundTo(x, 2)}
                x2={roundTo(x, 2)}
                y1={roundTo(yOf(bar.high), 2)}
                y2={roundTo(yOf(bar.low), 2)}
                stroke={color}
                strokeWidth="1"
              />
              <rect
                x={roundTo(x - bodyWidth / 2, 2)}
                y={roundTo(bodyTop, 2)}
                width={roundTo(bodyWidth, 2)}
                height={roundTo(Math.max(1, bodyBottom - bodyTop), 2)}
                fill={color}
                opacity="0.92"
              />
            </g>
          );
        })}

        <path
          d={`${closePath} L${roundTo(PAD.left + plotWidth, 2)} ${roundTo(PAD.top + PRICE_HEIGHT, 2)} L${PAD.left} ${roundTo(PAD.top + PRICE_HEIGHT, 2)} Z`}
          fill="url(#lumen-close-fill)"
          stroke="none"
        />
        <path d={closePath} fill="none" stroke="#0b7f71" strokeWidth="1.4" strokeLinejoin="round" />

        <line
          x1={PAD.left}
          x2={PAD.left + plotWidth}
          y1={VOLUME_TOP + VOLUME_HEIGHT}
          y2={VOLUME_TOP + VOLUME_HEIGHT}
          stroke="rgba(11,26,43,0.18)"
        />
        {data.bars.map((bar, index) => {
          const x = PAD.left + index * data.step + data.step / 2;
          const height = Math.max(1, (bar.volume / data.maxVolume) * VOLUME_HEIGHT);
          const rising = bar.close >= bar.open;
          const barWidth = Math.max(1.6, data.step * 0.56);
          return (
            <rect
              key={`vol-${bar.i}`}
              x={roundTo(x - barWidth / 2, 2)}
              y={roundTo(VOLUME_TOP + VOLUME_HEIGHT - height, 2)}
              width={roundTo(barWidth, 2)}
              height={roundTo(height, 2)}
              fill={rising ? 'rgba(212,85,107,0.42)' : 'rgba(14,158,140,0.42)'}
            />
          );
        })}
        <text x={PAD.left} y={VOLUME_TOP - 6} fontSize="11" fill="#5a6b7d">
          成交量
        </text>
        <text x={PAD.left + plotWidth} y={VOLUME_TOP - 6} fontSize="11" fill="#5a6b7d" textAnchor="end">
          峰值 {formatTurnover(last ? last.volume * last.close : 0)}
        </text>

        {data.bars.map((bar, index) =>
          index % labelStep === 0 || index === data.bars.length - 1 ? (
            <text
              key={`label-${bar.i}`}
              x={roundTo(PAD.left + index * data.step + data.step / 2, 2)}
              y={HEIGHT - 8}
              fontSize="10"
              fill="#5a6b7d"
              textAnchor="middle"
            >
              {bar.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
