// Demo 自有类型。全部字段为独立构造的合成数据，不含任何私有研究语义。

export type Trend = '上行' | '震荡' | '回调';

export interface Bar {
  /** 序号，0 为最早一根 */
  readonly i: number;
  /** 交易日 YYYY-MM-DD */
  readonly date: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  /** 成交量（股，合成值） */
  readonly volume: number;
}

export interface StockMeta {
  /** 虚构标识，形如 DEMO007 */
  readonly symbol: string;
  readonly name: string;
  readonly sector: string;
  readonly trend: Trend;
  /** 一句话说明，纯展示文案 */
  readonly tagline: string;
}

export interface StockSeries {
  readonly meta: StockMeta;
  readonly bars: readonly Bar[];
}

export interface LeaderboardRow {
  readonly symbol: string;
  readonly name: string;
  readonly sector: string;
  readonly trend: Trend;
  readonly close: number;
  /** 相对上一交易日的涨跌幅，百分数 */
  readonly changePct: number;
  readonly volume: number;
  /** 成交额（元） */
  readonly turnover: number;
  /** 展示用排序分，0–100，纯合成派生量 */
  readonly displayScore: number;
}

export type StageId =
  | 'ingest'
  | 'validate'
  | 'compute'
  | 'gate'
  | 'candidate'
  | 'publish';

export type StageStatus =
  | 'pending'
  | 'running'
  | 'ok'
  | 'failed'
  | 'blocked'
  | 'skipped';

export type ScenarioId =
  | 'normal'
  | 'research_failed'
  | 'version_mismatch'
  | 'data_failed';

export type Verdict = 'PENDING' | 'SUCCESS' | 'BLOCKED';

export type BlockCode =
  | 'OK'
  | 'RESEARCH_INCOMPLETE'
  | 'VERSION_MISMATCH'
  | 'DATA_VALIDATION_FAILED';

export type ReceiptLevel = 'info' | 'ok' | 'warn' | 'error';

export interface StageState {
  readonly id: StageId;
  readonly status: StageStatus;
  readonly note: string;
  /** 该阶段的模拟输入/输出计数，纯展示 */
  readonly count: number | null;
}

export interface Receipt {
  readonly at: string;
  readonly stage: StageId | 'run';
  readonly level: ReceiptLevel;
  readonly message: string;
}

export interface PublishedPointer {
  readonly release: string;
  readonly dataDate: string;
  readonly researchDate: string;
}

export interface RunState {
  readonly runId: string;
  readonly runCount: number;
  readonly scenario: ScenarioId;
  readonly dataDate: string;
  readonly researchDate: string | null;
  readonly stages: readonly StageState[];
  readonly receipts: readonly Receipt[];
  readonly verdict: Verdict;
  readonly blockCode: BlockCode;
  readonly pointer: PublishedPointer;
  /** 本次运行是否产生了新的已发布版本 */
  readonly publishedThisRun: PublishedPointer | null;
  readonly finished: boolean;
}

export interface SnapshotRecord extends PublishedPointer {
  readonly note: string;
}
