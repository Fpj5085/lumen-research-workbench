import type { Bar, LeaderboardRow, StockSeries, Trend } from '../contracts/types';
import { roundTo } from './prng';

export type SortKey = 'displayScore' | 'changePct' | 'volume' | 'turnover' | 'close' | 'symbol';
export type SortDir = 'asc' | 'desc';
export type TrendFilter = Trend | '全部';

export interface LeaderboardQuery {
  readonly keyword: string;
  readonly trend: TrendFilter;
  /** 最小成交额（元），0 表示不限 */
  readonly minTurnover: number;
  readonly sortKey: SortKey;
  readonly sortDir: SortDir;
  readonly page: number;
  readonly pageSize: number;
}

export const DEFAULT_QUERY: LeaderboardQuery = {
  keyword: '',
  trend: '全部',
  minTurnover: 0,
  sortKey: 'displayScore',
  sortDir: 'desc',
  page: 1,
  pageSize: 20,
};

export const SORT_LABELS: Record<SortKey, string> = {
  displayScore: '展示分',
  changePct: '涨跌幅',
  volume: '成交量',
  turnover: '成交额',
  close: '收盘价',
  symbol: '标识',
};

export const TREND_OPTIONS: readonly TrendFilter[] = ['全部', '上行', '震荡', '回调'] as const;

export const TURNOVER_OPTIONS: readonly { readonly value: number; readonly label: string }[] = [
  { value: 0, label: '不限' },
  { value: 2000, label: '≥ 2,000 万' },
  { value: 5000, label: '≥ 5,000 万' },
  { value: 10000, label: '≥ 1 亿' },
] as const;

/**
 * 从「已发布指针」对应的数据日期截取 K 线，派生展示用榜单。
 * 这里的 displayScore 只是可复现的合成派生量，不是任何私有研究评分。
 */
export function buildLeaderboard(series: readonly StockSeries[], dataDate: string): LeaderboardRow[] {
  const rows: LeaderboardRow[] = [];
  for (const item of series) {
    const bars = item.bars.filter((bar) => bar.date <= dataDate);
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    if (!last) continue;
    const changePct = prev ? roundTo(((last.close - prev.close) / prev.close) * 100, 2) : 0;
    const turnover = Math.round(last.close * last.volume);
    rows.push({
      symbol: item.meta.symbol,
      name: item.meta.name,
      sector: item.meta.sector,
      trend: item.meta.trend,
      close: last.close,
      changePct,
      volume: last.volume,
      turnover,
      displayScore: displayScoreOf(item, last, changePct),
    });
  }
  return rows;
}

function displayScoreOf(series: StockSeries, last: Bar, changePct: number): number {
  const bars = series.bars.filter((bar) => bar.date <= last.date);
  const window = bars.slice(-20);
  const averageVolume = window.reduce((sum, bar) => sum + bar.volume, 0) / Math.max(1, window.length);
  const volumeRatio = averageVolume > 0 ? last.volume / averageVolume : 1;
  const raw = 50 + changePct * 2.6 + (volumeRatio - 1) * 12;
  return roundTo(Math.min(99.9, Math.max(0.1, raw)), 1);
}

export function applyQuery(rows: readonly LeaderboardRow[], query: LeaderboardQuery): LeaderboardRow[] {
  const keyword = query.keyword.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (keyword) {
      const haystack = `${row.symbol} ${row.name} ${row.sector}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (query.trend !== '全部' && row.trend !== query.trend) return false;
    if (query.minTurnover > 0 && row.turnover < query.minTurnover * 10_000) return false;
    return true;
  });

  const direction = query.sortDir === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    if (query.sortKey === 'symbol') {
      return a.symbol.localeCompare(b.symbol) * direction;
    }
    const delta = (a[query.sortKey] as number) - (b[query.sortKey] as number);
    if (delta !== 0) return delta * direction;
    return a.symbol.localeCompare(b.symbol);
  });
  return sorted;
}

export interface PagedRows {
  readonly rows: readonly LeaderboardRow[];
  readonly matched: number;
  readonly page: number;
  readonly pageCount: number;
}

export function paginate(rows: readonly LeaderboardRow[], query: LeaderboardQuery): PagedRows {
  const pageCount = Math.max(1, Math.ceil(rows.length / query.pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);
  const start = (page - 1) * query.pageSize;
  return {
    rows: rows.slice(start, start + query.pageSize),
    matched: rows.length,
    page,
    pageCount,
  };
}

export function formatTurnover(value: number): string {
  if (value >= 100_000_000) return `${roundTo(value / 100_000_000, 2)} 亿`;
  return `${roundTo(value / 10_000, 0)} 万`;
}

export function formatVolume(value: number): string {
  if (value >= 10_000) return `${roundTo(value / 10_000, 1)} 万手`;
  return `${value} 手`;
}

export function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}
