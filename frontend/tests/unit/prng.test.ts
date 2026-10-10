import { describe, expect, it } from 'vitest';
import { createRng, gaussian, hashString, roundTo } from '../../src/simulation/prng';

describe('确定性伪随机数', () => {
  it('相同 seed 产生完全相同的序列', () => {
    const a = createRng(180);
    const b = createRng(180);
    const left = Array.from({ length: 50 }, () => a());
    const right = Array.from({ length: 50 }, () => b());
    expect(left).toEqual(right);
  });

  it('不同 seed 产生不同序列', () => {
    const a = Array.from({ length: 20 }, createRng(180));
    const b = Array.from({ length: 20 }, createRng(181));
    expect(a).not.toEqual(b);
  });

  it('输出始终落在 [0, 1) 区间', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('hashString 稳定且区分大小写输入', () => {
    expect(hashString('DEMO007')).toBe(hashString('DEMO007'));
    expect(hashString('DEMO007')).not.toBe(hashString('demo007'));
    expect(hashString('')).toBe(2166136261);
  });

  it('gaussian 输出有限且均值接近 0', () => {
    const rng = createRng(2026);
    const samples = Array.from({ length: 4000 }, () => gaussian(rng));
    expect(samples.every((value) => Number.isFinite(value))).toBe(true);
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.12);
  });

  it('roundTo 按位数四舍五入', () => {
    expect(roundTo(12.3456, 2)).toBe(12.35);
    expect(roundTo(12.3444, 2)).toBe(12.34);
    expect(roundTo(1.5, 0)).toBe(2);
  });
});
