import { describe, expect, it } from 'vitest';
import { businessDays, formatCn, isOnOrBefore, shiftDays } from '../../src/simulation/calendar';
import {
  BARS_PER_STOCK,
  DEMO_SEED,
  D1_DATA_DATE,
  SERIES_END_DATE,
  barsUpTo,
  buildDataset,
  buildStockSpecs,
  digestOf,
  generateSeries,
  symbolFor,
  totalBars,
} from '../../src/simulation/generator';

describe('合成交易日历', () => {
  it('只跳过周末，返回升序且以结束日期收尾', () => {
    const days = businessDays('2030-12-31', 10);
    expect(days).toHaveLength(10);
    expect(days[days.length - 1]).toBe('2030-12-31');
    expect([...days].sort()).toEqual(days);
    for (const day of days) {
      const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
      expect(weekday).not.toBe(0);
      expect(weekday).not.toBe(6);
    }
  });

  it('shiftDays 与 isOnOrBefore 行为正确', () => {
    expect(shiftDays('2030-12-31', 1)).toBe('2031-01-01');
    expect(shiftDays('2030-12-31', -1)).toBe('2030-12-30');
    expect(isOnOrBefore('2030-11-29', '2030-12-31')).toBe(true);
    expect(isOnOrBefore('2031-01-01', '2030-12-31')).toBe(false);
  });

  it('formatCn 输出中文日期', () => {
    expect(formatCn('2030-11-29')).toBe('2030 年 11 月 29 日');
  });
});

describe('合成数据集', () => {
  it('24 个虚构标的、每个 180 根，共 4,320 根', () => {
    const dataset = buildDataset();
    expect(dataset).toHaveLength(24);
    expect(totalBars(dataset)).toBe(24 * BARS_PER_STOCK);
    expect(totalBars(dataset)).toBe(4320);
    for (const item of dataset) {
      expect(item.bars).toHaveLength(180);
      expect(item.bars[item.bars.length - 1]?.date).toBe(SERIES_END_DATE);
    }
  });

  it('标识形如 DEMO001–DEMO024 且唯一', () => {
    const specs = buildStockSpecs();
    const symbols = specs.map((spec) => spec.symbol);
    expect(symbols[0]).toBe('DEMO001');
    expect(symbols[23]).toBe('DEMO024');
    expect(new Set(symbols).size).toBe(24);
    expect(symbolFor(6)).toBe('DEMO007');
  });

  it('OHLCV 自洽：low ≤ min(open, close) ≤ max(open, close) ≤ high，且数值为正', () => {
    for (const item of buildDataset()) {
      for (const bar of item.bars) {
        expect(bar.low).toBeLessThanOrEqual(Math.min(bar.open, bar.close));
        expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
        expect(bar.low).toBeGreaterThan(0);
        expect(bar.volume).toBeGreaterThan(0);
        expect(Number.isInteger(bar.i)).toBe(true);
      }
      const dates = item.bars.map((bar) => bar.date);
      expect([...dates].sort()).toEqual(dates);
      expect(new Set(dates).size).toBe(dates.length);
    }
  });

  it('相同 seed 两次生成摘要完全一致', () => {
    const first = digestOf(buildDataset(buildStockSpecs(), DEMO_SEED));
    const second = digestOf(buildDataset(buildStockSpecs(), DEMO_SEED));
    expect(first).toBe(second);
  });

  it('不同 seed 会改变数据', () => {
    const base = digestOf(buildDataset(buildStockSpecs(), DEMO_SEED));
    const other = digestOf(buildDataset(buildStockSpecs(), DEMO_SEED + 1));
    expect(other).not.toBe(base);
  });

  it('单个标的生成可复现，且 barsUpTo 按日期截断', () => {
    const spec = buildStockSpecs()[6]!;
    const a = generateSeries(spec);
    const b = generateSeries(spec);
    expect(a.bars.map((bar) => bar.close)).toEqual(b.bars.map((bar) => bar.close));

    const d1 = barsUpTo(a, D1_DATA_DATE);
    expect(d1.length).toBeGreaterThan(0);
    expect(d1.length).toBeLessThan(a.bars.length);
    expect(d1[d1.length - 1]?.date).toBe('2030-11-29');
    expect(d1.every((bar) => bar.date <= D1_DATA_DATE)).toBe(true);
  });

  it('示例日期落在虚构 2030 区间，不复用任何审计批次日期', () => {
    expect(SERIES_END_DATE.startsWith('2030-')).toBe(true);
    expect(D1_DATA_DATE.startsWith('2030-')).toBe(true);
    expect(D1_DATA_DATE < SERIES_END_DATE).toBe(true);
    for (const item of buildDataset()) {
      for (const bar of item.bars) {
        expect(bar.date.startsWith('2030-')).toBe(true);
      }
    }
    expect(buildDataset()[0]!.bars[0]!.date).toBe('2030-04-24');
  });
});
