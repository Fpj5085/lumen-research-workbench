// 极简 hash 路由：不引入路由库，刷新与直达链接都不依赖服务端 rewrite。

export type Route =
  | { readonly kind: 'home' }
  | { readonly kind: 'leaderboard' }
  | { readonly kind: 'stock'; readonly symbol: string }
  | { readonly kind: 'watchlist' }
  | { readonly kind: 'tasks' }
  | { readonly kind: 'engineering' }
  | { readonly kind: 'history' };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '').replace(/^\/+/, '');
  const [head, tail] = raw.split('/');
  switch (head) {
    case 'leaderboard':
      return { kind: 'leaderboard' };
    case 'stock':
      return tail ? { kind: 'stock', symbol: tail.toUpperCase() } : { kind: 'leaderboard' };
    case 'watchlist':
      return { kind: 'watchlist' };
    case 'tasks':
      return { kind: 'tasks' };
    case 'engineering':
      return { kind: 'engineering' };
    case 'history':
      return { kind: 'history' };
    default:
      return { kind: 'home' };
  }
}

export function hrefFor(route: Route): string {
  switch (route.kind) {
    case 'home':
      return '#/';
    case 'leaderboard':
      return '#/leaderboard';
    case 'stock':
      return `#/stock/${route.symbol}`;
    case 'watchlist':
      return '#/watchlist';
    case 'tasks':
      return '#/tasks';
    case 'engineering':
      return '#/engineering';
    case 'history':
      return '#/history';
    default:
      return '#/';
  }
}

export function routeKey(route: Route): string {
  return route.kind === 'stock' ? `stock:${route.symbol}` : route.kind;
}
