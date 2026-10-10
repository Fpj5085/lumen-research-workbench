// 确定性伪随机数：固定 seed 必然复现同一序列，便于单元测试与「两次生成一致」验收。

export type Rng = () => number;

/** mulberry32：32 位状态，输出 [0, 1) */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 稳定字符串散列，用于把 symbol 映射成派生 seed */
export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** 标准正态样本（Box–Muller），使用两个均匀样本 */
export function gaussian(rng: Rng): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index] as T;
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
