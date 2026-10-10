import { roundTo } from '../simulation/prng';

interface Props {
  readonly values: readonly number[];
  readonly width?: number;
  readonly height?: number;
  readonly label: string;
  readonly stroke?: string;
}

/** 小型价格走势图：首页/卡片用的原创 SVG，无外部依赖 */
export function Sparkline({ values, width = 160, height = 44, label, stroke = '#0e9e8c' }: Props) {
  if (values.length < 2) {
    return <svg width={width} height={height} role="img" aria-label={label} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.0001, max - min);
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = roundTo(index * step, 2);
      const y = roundTo(height - ((value - min) / span) * (height - 6) - 3, 2);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
