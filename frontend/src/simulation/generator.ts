import type { Bar, StockMeta, StockSeries, Trend } from '../contracts/types';
import { businessDays } from './calendar';
import { createRng, gaussian, hashString, pick, roundTo, type Rng } from './prng';

/** 固定 seed：任何环境、任何次数生成结果完全一致 */
export const DEMO_SEED = 180;

/** 每个标的的 K 线根数 */
export const BARS_PER_STOCK = 180;

/**
 * 合成数据集的最后一根日期（= 场景 D2 数据日期）。
 * 使用 2030 年虚构日历区间：本演示的日期是自造示例，不是任何真实交易日，
 * 也不对应任何私有审计批次日期。
 */
export const SERIES_END_DATE = '2030-12-31';

/** 已发布指针初始数据日期（= 场景 D1），同样落在虚构日历内 */
export const D1_DATA_DATE = '2030-11-29';

const NAME_PREFIX = [
  '青禾', '南岭', '云泊', '昭远', '怀山', '星屿', '涧行', '澄川',
  '慕岩', '柏舟', '知野', '临溪', '闻樟', '苍梧', '越岚', '泮林',
] as const;

const NAME_SUFFIX = [
  '精工', '数据', '材料', '智能', '能源', '医疗', '物流', '装备',
] as const;

const SECTORS = [
  '工业软件', '精密制造', '新能源', '医疗器械', '智慧物流', '新材料',
  '农业科技', '消费电子',
] as const;

const TRENDS: readonly Trend[] = ['上行', '震荡', '回调'] as const;

const TAGLINES = [
  '合成标的：用于演示多阶段日更中的榜单与详情渲染。',
  '合成标的：价格序列由固定 seed 生成，不代表任何真实公司。',
  '合成标的：仅用于演示版本一致性与历史快照入口。',
] as const;

export interface StockSpec {
  readonly symbol: string;
  readonly name: string;
  readonly sector: string;
  readonly trend: Trend;
  readonly tagline: string;
}

export function symbolFor(index: number): string {
  return `DEMO${String(index + 1).padStart(3, '0')}`;
}

/** 24 个虚构标的的定义；全部名称、行业、趋势均为构造值 */
export function buildStockSpecs(count = 24): StockSpec[] {
  const specs: StockSpec[] = [];
  for (let index = 0; index < count; index += 1) {
    const rng = createRng((DEMO_SEED + index * 977) >>> 0);
    const trend = TRENDS[index % TRENDS.length] as Trend;
    specs.push({
      symbol: symbolFor(index),
      name: `${pick(rng, NAME_PREFIX)}${pick(rng, NAME_SUFFIX)}`,
      sector: SECTORS[index % SECTORS.length] as string,
      trend,
      tagline: TAGLINES[index % TAGLINES.length] as string,
    });
  }
  return specs;
}

interface PriceShape {
  readonly start: number;
  readonly drift: number;
  readonly volatility: number;
  readonly baseVolume: number;
}

function shapeFor(spec: StockSpec, rng: Rng): PriceShape {
  const start = roundTo(8 + rng() * 88, 2);
  const driftByTrend: Record<Trend, number> = {
    上行: 0.0022,
    震荡: 0.0001,
    回调: -0.0016,
  };
  return {
    start,
    drift: driftByTrend[spec.trend] + (rng() - 0.5) * 0.0006,
    volatility: 0.009 + rng() * 0.014,
    baseVolume: 900_000 + Math.floor(rng() * 4_200_000),
  };
}

/** 生成单个标的的 OHLCV 序列；OHLC 自洽（low ≤ min(o,c) ≤ max(o,c) ≤ high） */
export function generateSeries(spec: StockSpec, seed = DEMO_SEED): StockSeries {
  const rng = createRng((seed * 31 + hashString(spec.symbol)) >>> 0);
  const shape = shapeFor(spec, rng);
  const dates = businessDays(SERIES_END_DATE, BARS_PER_STOCK);
  const bars: Bar[] = [];

  let previousClose = shape.start;
  for (let i = 0; i < dates.length; i += 1) {
    const shock = gaussian(rng);
    const close = roundTo(Math.max(1.2, previousClose * (1 + shape.drift + shape.volatility * shock)), 2);
    const gap = (rng() - 0.5) * shape.volatility * 0.7;
    const open = roundTo(Math.max(1.2, previousClose * (1 + gap)), 2);
    const upper = Math.abs(gaussian(rng)) * shape.volatility * 0.8;
    const lower = Math.abs(gaussian(rng)) * shape.volatility * 0.8;
    const high = roundTo(Math.max(open, close) * (1 + upper), 2);
    const low = roundTo(Math.max(0.9, Math.min(open, close) * (1 - lower)), 2);
    const volume = Math.round(shape.baseVolume * (0.55 + Math.abs(shock) * 0.75 + rng() * 0.35));

    bars.push({
      i,
      date: dates[i] as string,
      open,
      high,
      low,
      close,
      volume,
    });
    previousClose = close;
  }

  const meta: StockMeta = {
    symbol: spec.symbol,
    name: spec.name,
    sector: spec.sector,
    trend: spec.trend,
    tagline: spec.tagline,
  };
  return { meta, bars };
}

/** 全量数据集：24 标的 × 180 根 = 4,320 根 */
export function buildDataset(specs: readonly StockSpec[] = buildStockSpecs(), seed = DEMO_SEED): StockSeries[] {
  return specs.map((spec) => generateSeries(spec, seed));
}

/** 截取到某个数据日期（含）为止的 K 线；用于「已发布指针指向 D1」时的榜单口径 */
export function barsUpTo(series: StockSeries, dataDate: string): Bar[] {
  return series.bars.filter((bar) => bar.date <= dataDate);
}

/** 规范化摘要：两次同 seed 生成必须完全一致 */
export function digestOf(series: readonly StockSeries[]): string {
  const text = series
    .map((item) =>
      item.bars
        .map((bar) => `${item.meta.symbol}|${bar.date}|${bar.open}|${bar.high}|${bar.low}|${bar.close}|${bar.volume}`)
        .join(';'),
    )
    .join('\n');
  return `${series.length}x${series[0]?.bars.length ?? 0}|${hashString(text).toString(16)}|${text.length}`;
}

export function totalBars(series: readonly StockSeries[]): number {
  return series.reduce((sum, item) => sum + item.bars.length, 0);
}
