import { describe, expect, it } from 'vitest';
import { D1_DATA_DATE, SERIES_END_DATE, buildDataset } from '../../src/simulation/generator';
import {
  DEFAULT_QUERY,
  applyQuery,
  buildLeaderboard,
  formatPct,
  formatTurnover,
  formatVolume,
  paginate,
  type LeaderboardQuery,
} from '../../src/simulation/leaderboard';

const dataset = buildDataset();

function query(patch: Partial<LeaderboardQuery> = {}): LeaderboardQuery {
  return { ...DEFAULT_QUERY, ...patch };
}

describe('榜单派生', () => {
  it('每个标的产生一行，共 24 行', () => {
    const rows = buildLeaderboard(dataset, SERIES_END_DATE);
    expect(rows).toHaveLength(24);
    expect(new Set(rows.map((row) => row.symbol)).size).toBe(24);
  });

  it('D1 口径的收盘价等于该日截断序列的最后一根收盘价', () => {
    const rows = buildLeaderboard(dataset, D1_DATA_DATE);
    const row = rows.find((item) => item.symbol === 'DEMO007')!;
    const series = dataset.find((item) => item.meta.symbol === 'DEMO007')!;
    const last = series.bars.filter((bar) => bar.date <= D1_DATA_DATE).at(-1)!;
    expect(row.close).toBe(last.close);
    expect(row.volume).toBe(last.volume);
    expect(row.turnover).toBe(Math.round(last.close * last.volume));
  });

  it('displayScore 落在 0.1–99.9 且可复现', () => {
    const a = buildLeaderboard(dataset, SERIES_END_DATE);
    const b = buildLeaderboard(dataset, SERIES_END_DATE);
    expect(a.map((row) => row.displayScore)).toEqual(b.map((row) => row.displayScore));
    for (const row of a) {
      expect(row.displayScore).toBeGreaterThanOrEqual(0.1);
      expect(row.displayScore).toBeLessThanOrEqual(99.9);
    }
  });
});

describe('筛选、排序与分页', () => {
  const rows = buildLeaderboard(dataset, SERIES_END_DATE);

  it('默认按 displayScore 降序', () => {
    const sorted = applyQuery(rows, query());
    const scores = sorted.map((row) => row.displayScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('升序切换会反转主排序方向', () => {
    const asc = applyQuery(rows, query({ sortDir: 'asc' }));
    const scores = asc.map((row) => row.displayScore);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
  });

  it('关键字匹配标识、名称与行业', () => {
    const bySymbol = applyQuery(rows, query({ keyword: 'DEMO007' }));
    expect(bySymbol).toHaveLength(1);
    expect(bySymbol[0]?.symbol).toBe('DEMO007');

    const name = rows[0]!.name;
    const byName = applyQuery(rows, query({ keyword: name }));
    expect(byName.some((row) => row.name === name)).toBe(true);
  });

  it('趋势筛选只保留对应趋势', () => {
    const up = applyQuery(rows, query({ trend: '上行' }));
    expect(up.length).toBeGreaterThan(0);
    expect(up.every((row) => row.trend === '上行')).toBe(true);
  });

  it('成交额筛选按万元阈值生效', () => {
    const threshold = 5000;
    const filtered = applyQuery(rows, query({ minTurnover: threshold }));
    expect(filtered.every((row) => row.turnover >= threshold * 10_000)).toBe(true);
    expect(filtered.length).toBeLessThanOrEqual(rows.length);
  });

  it('分页：24 行按 20 行一页得到 2 页', () => {
    const first = paginate(applyQuery(rows, query()), query());
    expect(first.pageCount).toBe(2);
    expect(first.page).toBe(1);
    expect(first.rows).toHaveLength(20);
    expect(first.matched).toBe(24);

    const second = paginate(applyQuery(rows, query()), query({ page: 2 }));
    expect(second.page).toBe(2);
    expect(second.rows).toHaveLength(4);
  });

  it('越界页码会被夹到有效范围内', () => {
    const overflow = paginate(applyQuery(rows, query()), query({ page: 99 }));
    expect(overflow.page).toBe(overflow.pageCount);
    const underflow = paginate(applyQuery(rows, query()), query({ page: -3 }));
    expect(underflow.page).toBe(1);
  });

  it('空结果时 matched 为 0 且行数为 0', () => {
    const empty = paginate(applyQuery(rows, query({ keyword: '不存在的标的' })), query());
    expect(empty.matched).toBe(0);
    expect(empty.rows).toHaveLength(0);
    expect(empty.pageCount).toBe(1);
  });
});

describe('展示格式化', () => {
  it('涨跌幅带符号', () => {
    expect(formatPct(1.234)).toBe('+1.23%');
    expect(formatPct(-0.5)).toBe('-0.50%');
  });

  it('成交额与成交量使用中文单位', () => {
    expect(formatTurnover(123_456_789)).toBe('1.23 亿');
    expect(formatTurnover(12_345_678)).toBe('1235 万');
    expect(formatVolume(123_456)).toBe('12.3 万手');
    expect(formatVolume(999)).toBe('999 手');
  });
});
