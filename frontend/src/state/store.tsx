import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  LeaderboardRow,
  PublishedPointer,
  RunState,
  ScenarioId,
  SnapshotRecord,
  StockSeries,
} from '../contracts/types';
import { buildDataset } from '../simulation/generator';
import { buildLeaderboard, DEFAULT_QUERY, type LeaderboardQuery } from '../simulation/leaderboard';
import {
  INITIAL_HISTORY,
  initialRunState,
  mergeSnapshot,
  startRun,
  tick,
} from '../simulation/state-machine';

export interface Holding {
  readonly symbol: string;
  readonly shares: number;
  readonly cost: number;
}

export const INITIAL_WATCHLIST: readonly string[] = ['DEMO003', 'DEMO007', 'DEMO012', 'DEMO018'];

export const INITIAL_HOLDINGS: readonly Holding[] = [
  { symbol: 'DEMO005', shares: 1200, cost: 24.6 },
  { symbol: 'DEMO011', shares: 800, cost: 41.2 },
  { symbol: 'DEMO020', shares: 2000, cost: 15.35 },
];

export type ChartRange = 20 | 60 | 120 | 180;

interface AppContextValue {
  readonly series: readonly StockSeries[];
  readonly pointer: PublishedPointer;
  readonly rows: readonly LeaderboardRow[];
  readonly run: RunState;
  readonly history: readonly SnapshotRecord[];
  readonly watchlist: readonly string[];
  readonly holdings: readonly Holding[];
  readonly query: LeaderboardQuery;
  readonly running: boolean;
  readonly chartRange: ChartRange;
  readonly lastBlocked: { readonly code: RunState['blockCode']; readonly at: string } | null;
  setScenario: (scenario: ScenarioId) => void;
  startSimulation: () => void;
  resetSimulation: () => void;
  resetAll: () => void;
  updateQuery: (patch: Partial<LeaderboardQuery>) => void;
  resetQuery: () => void;
  addWatch: (symbol: string) => void;
  removeWatch: (symbol: string) => void;
  setChartRange: (range: ChartRange) => void;
  seriesFor: (symbol: string) => StockSeries | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { readonly children: ReactNode }) {
  const series = useMemo(() => buildDataset(), []);
  const [pointer, setPointer] = useState<PublishedPointer>(() => initialRunState().pointer);
  const [run, setRun] = useState<RunState>(() => initialRunState());
  const [history, setHistory] = useState<readonly SnapshotRecord[]>(INITIAL_HISTORY);
  const [watchlist, setWatchlist] = useState<readonly string[]>(INITIAL_WATCHLIST);
  const [holdings] = useState<readonly Holding[]>(INITIAL_HOLDINGS);
  const [query, setQuery] = useState<LeaderboardQuery>(DEFAULT_QUERY);
  const [running, setRunning] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>(60);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const rows = useMemo(() => buildLeaderboard(series, pointer.dataDate), [series, pointer.dataDate]);

  const startSimulation = useCallback(() => {
    stopTimer();
    setRun((previous) => startRun(previous, previous.scenario));
    setRunning(true);
  }, [stopTimer]);

  // 定时推进：每次只走一个阶段；run 变化会重新排下一次定时，因此不需要 setInterval。
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      setRun((current) => tick(current).state);
    }, 700);
    timer.current = id;
    return () => clearTimeout(id);
  }, [running, run]);

  // 终态收尾：发布指针只在正常场景推进，其余场景保持不变。
  useEffect(() => {
    if (!running || !run.finished) return;
    setRunning(false);
    const published = run.publishedThisRun;
    if (published) {
      setPointer(published);
      setHistory((items) => mergeSnapshot(items, published, '正常场景发布快照。'));
    }
  }, [running, run]);

  const resetSimulation = useCallback(() => {
    stopTimer();
    setRunning(false);
    setRun(initialRunState());
  }, [stopTimer]);

  const resetAll = useCallback(() => {
    stopTimer();
    setRunning(false);
    setRun(initialRunState());
    setPointer(initialRunState().pointer);
    setHistory(INITIAL_HISTORY);
    setWatchlist(INITIAL_WATCHLIST);
    setQuery(DEFAULT_QUERY);
    setChartRange(60);
  }, [stopTimer]);

  const setScenario = useCallback(
    (scenario: ScenarioId) => {
      stopTimer();
      setRunning(false);
      setRun((previous) => ({ ...initialRunState(), runCount: previous.runCount, runId: previous.runId, scenario }));
    },
    [stopTimer],
  );

  const updateQuery = useCallback((patch: Partial<LeaderboardQuery>) => {
    setQuery((previous) => ({ ...previous, ...patch }));
  }, []);

  const resetQuery = useCallback(() => setQuery(DEFAULT_QUERY), []);

  const addWatch = useCallback((symbol: string) => {
    setWatchlist((items) => (items.includes(symbol) ? items : [...items, symbol]));
  }, []);

  const removeWatch = useCallback((symbol: string) => {
    setWatchlist((items) => items.filter((item) => item !== symbol));
  }, []);

  const seriesFor = useCallback(
    (symbol: string) => series.find((item) => item.meta.symbol === symbol.toUpperCase()),
    [series],
  );

  const lastBlocked = useMemo(() => {
    if (run.verdict !== 'BLOCKED' || !run.finished) return null;
    const last = run.receipts[run.receipts.length - 1];
    return { code: run.blockCode, at: last ? last.at : '—' };
  }, [run]);

  const value: AppContextValue = {
    series,
    pointer,
    rows,
    run,
    history,
    watchlist,
    holdings,
    query,
    running,
    chartRange,
    lastBlocked,
    setScenario,
    startSimulation,
    resetSimulation,
    resetAll,
    updateQuery,
    resetQuery,
    addWatch,
    removeWatch,
    setChartRange,
    seriesFor,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useApp 必须在 AppProvider 内使用');
  }
  return value;
}
