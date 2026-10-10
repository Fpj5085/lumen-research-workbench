import { describe, expect, it } from 'vitest';
import { hrefFor, parseHash, routeKey } from '../../src/state/router';

describe('hash 路由解析', () => {
  it('已知路径映射到对应页面', () => {
    expect(parseHash('')).toEqual({ kind: 'home' });
    expect(parseHash('#/')).toEqual({ kind: 'home' });
    expect(parseHash('#/leaderboard')).toEqual({ kind: 'leaderboard' });
    expect(parseHash('#/watchlist')).toEqual({ kind: 'watchlist' });
    expect(parseHash('#/tasks')).toEqual({ kind: 'tasks' });
    expect(parseHash('#/engineering')).toEqual({ kind: 'engineering' });
    expect(parseHash('#/history')).toEqual({ kind: 'history' });
  });

  it('详情路径解析标识并统一大写', () => {
    expect(parseHash('#/stock/DEMO007')).toEqual({ kind: 'stock', symbol: 'DEMO007' });
    expect(parseHash('#/stock/demo007')).toEqual({ kind: 'stock', symbol: 'DEMO007' });
  });

  it('未知路径回落到首页，详情缺少标识时回落到榜单', () => {
    expect(parseHash('#/nope')).toEqual({ kind: 'home' });
    expect(parseHash('#/stock')).toEqual({ kind: 'leaderboard' });
  });

  it('hrefFor 与 parseHash 互为逆运算', () => {
    const routes = [
      { kind: 'home' as const },
      { kind: 'leaderboard' as const },
      { kind: 'stock' as const, symbol: 'DEMO012' },
      { kind: 'watchlist' as const },
      { kind: 'tasks' as const },
      { kind: 'engineering' as const },
      { kind: 'history' as const },
    ];
    for (const route of routes) {
      expect(parseHash(hrefFor(route))).toEqual(route);
    }
  });

  it('routeKey 区分不同详情标的', () => {
    expect(routeKey({ kind: 'home' })).toBe('home');
    expect(routeKey({ kind: 'stock', symbol: 'DEMO001' })).toBe('stock:DEMO001');
    expect(routeKey({ kind: 'stock', symbol: 'DEMO002' })).not.toBe(routeKey({ kind: 'stock', symbol: 'DEMO001' }));
  });
});
