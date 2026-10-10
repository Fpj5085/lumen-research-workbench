import { AppFooter } from './components/AppFooter';
import { AppHeader } from './components/AppHeader';
import { EngineeringPage } from './pages/EngineeringPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { StockPage } from './pages/StockPage';
import { TasksPage } from './pages/TasksPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { AppProvider } from './state/store';
import { useHashRoute } from './state/use-hash-route';
import type { Route } from './state/router';

function renderRoute(route: Route) {
  switch (route.kind) {
    case 'leaderboard':
      return <LeaderboardPage />;
    case 'stock':
      return <StockPage symbol={route.symbol} />;
    case 'watchlist':
      return <WatchlistPage />;
    case 'tasks':
      return <TasksPage />;
    case 'engineering':
      return <EngineeringPage />;
    case 'history':
      return <HistoryPage />;
    case 'home':
    default:
      return <HomePage />;
  }
}

function Shell() {
  const route = useHashRoute();
  return (
    <div className="app-shell" data-testid="app-root">
      <AppHeader route={route} />
      <main className="page" id="main-content">
        {renderRoute(route)}
      </main>
      <AppFooter />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
