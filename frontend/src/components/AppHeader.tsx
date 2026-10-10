import type { Route } from '../state/router';
import { navigateTo } from '../state/navigation';
import { BrandMark } from './BrandMark';
import { SyntheticBadge } from './SyntheticBadge';

const LINKS: readonly { readonly route: Route; readonly label: string; readonly testid: string }[] = [
  { route: { kind: 'home' }, label: '首页', testid: 'nav-home' },
  { route: { kind: 'leaderboard' }, label: '模拟榜单', testid: 'nav-leaderboard' },
  { route: { kind: 'watchlist' }, label: '观察与持仓', testid: 'nav-watchlist' },
  { route: { kind: 'tasks' }, label: '任务演示', testid: 'nav-tasks' },
  { route: { kind: 'engineering' }, label: '工程说明', testid: 'nav-engineering' },
];

export function AppHeader({ route }: { readonly route: Route }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="skip-to-content" href="#main-content" data-testid="skip-to-content">
          跳到主要内容
        </a>
        <div className="brand">
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">LUMEN</span>
            <span className="brand__sub">合成研究工作台 · 求职演示</span>
          </span>
        </div>
        <nav className="site-nav" data-testid="site-nav" aria-label="主导航">
          {LINKS.map((link) => (
            <a
              key={link.testid}
              data-testid={link.testid}
              href={`#/${link.route.kind === 'home' ? '' : link.route.kind}`}
              aria-current={route.kind === link.route.kind ? 'page' : undefined}
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            data-testid="nav-open-tasks"
            onClick={() => navigateTo({ kind: 'tasks' })}
          >
            演示日更
          </button>
        </nav>
        <SyntheticBadge />
        <span className="header-note" data-testid="example-date-notice">
          示例日期为虚构日历（2030 年），非实际交易日
        </span>
      </div>
    </header>
  );
}
