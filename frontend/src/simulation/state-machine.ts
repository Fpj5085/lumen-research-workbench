import type {
  BlockCode,
  PublishedPointer,
  RunState,
  ScenarioId,
  StageId,
  StageState,
  StageStatus,
  Verdict,
} from '../contracts/types';
import { D1_DATA_DATE, SERIES_END_DATE } from './generator';
import { initialStages, scenarioById, STAGE_LABELS, STAGE_ORDER } from './scenarios';

/**
 * 初始已发布指针：指向较旧的历史快照，明确标注，不冒充最新。
 * 快照 ID 采用本 Demo 自有的 demo-snapshot-NNN 命名，不复用任何外部发布批次编号。
 */
export const INITIAL_POINTER: PublishedPointer = {
  release: 'demo-snapshot-002',
  dataDate: D1_DATA_DATE,
  researchDate: D1_DATA_DATE,
};

export const MAX_RUNS = 6;

export function initialRunState(): RunState {
  return {
    runId: 'run-0000',
    runCount: 0,
    scenario: 'normal',
    dataDate: INITIAL_POINTER.dataDate,
    researchDate: INITIAL_POINTER.researchDate,
    stages: initialStages(),
    receipts: [
      {
        at: '—',
        stage: 'run',
        level: 'info',
        message: '尚未运行。选择场景后点击「运行演示」。',
      },
    ],
    verdict: 'PENDING',
    blockCode: 'OK',
    pointer: INITIAL_POINTER,
    publishedThisRun: null,
    finished: false,
  };
}

export interface TickResult {
  readonly state: RunState;
  readonly done: boolean;
}

function withStage(
  stages: readonly StageState[],
  id: StageId,
  status: StageStatus,
  note: string,
  count: number | null,
): StageState[] {
  return stages.map((stage) => (stage.id === id ? { ...stage, status, note, count } : stage));
}

function stageIndex(id: StageId): number {
  return STAGE_ORDER.indexOf(id);
}

function timestampOf(state: RunState, step: number): string {
  const base = 10 * 60 * 60 + 8 * 60 + 30; // 10:08:30，纯展示时间
  const total = base + state.runCount * 137 + step * 41;
  const hh = String(Math.floor(total / 3600) % 24).padStart(2, '0');
  const mm = String(Math.floor(total / 60) % 60).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/** 开始一次运行：生成新的 runId，全部阶段回到 pending */
export function startRun(previous: RunState, scenario: ScenarioId): RunState {
  const definition = scenarioById(scenario);
  const runCount = previous.runCount + 1;
  return {
    runId: `run-${String(runCount).padStart(4, '0')}`,
    runCount,
    scenario,
    dataDate: definition.dataDate,
    researchDate: definition.researchDate,
    stages: initialStages(),
    receipts: [
      {
        at: timestampOf({ ...previous, runCount }, 0),
        stage: 'run',
        level: 'info',
        message: `启动模拟运行 ${scenario}：数据日期 ${definition.dataDate}。`,
      },
    ],
    verdict: 'PENDING',
    blockCode: 'OK',
    pointer: previous.pointer,
    publishedThisRun: null,
    finished: false,
  };
}

/**
 * 推进一步（一个阶段）。纯函数：同样输入必然得到同样输出。
 * 返回 done=true 表示本次运行已经走到终态，可停止定时器。
 */
export function tick(state: RunState): TickResult {
  if (state.finished) return { state, done: true };
  const definition = scenarioById(state.scenario);
  const currentIndex = state.stages.findIndex((stage) => stage.status === 'pending' || stage.status === 'running');
  if (currentIndex < 0) {
    return { state: { ...state, finished: true }, done: true };
  }

  const stage = state.stages[currentIndex] as StageState;
  const step = currentIndex + 1;
  const at = timestampOf(state, step);
  const dataDate = state.dataDate;
  const previousRelease = state.pointer.release;

  switch (stage.id) {
    case 'ingest': {
      const stages = withStage(state.stages, 'ingest', 'ok', `生成 24 标的 × 180 根合成 K 线（截止 ${dataDate}）`, 4320);
      return {
        state: {
          ...state,
          stages,
          receipts: [
            ...state.receipts,
            { at, stage: 'ingest', level: 'ok', message: `数据生成完成：4,320 根合成 K 线，数据日期 ${dataDate}。` },
          ],
        },
        done: false,
      };
    }
    case 'validate': {
      if (!definition.validateOk) {
        const stages = withStage(state.stages, 'validate', 'failed', '发现 3 条自洽性错误，校验未通过', 0);
        const downstream: StageId[] = ['compute', 'gate', 'candidate', 'publish'];
        let next = stages;
        for (const id of downstream) {
          next = withStage(next, id, 'skipped', '上游失败，已跳过', null);
        }
        return {
          state: {
            ...state,
            stages: next,
            verdict: 'BLOCKED',
            blockCode: 'DATA_VALIDATION_FAILED',
            finished: true,
            receipts: [
              ...state.receipts,
              { at, stage: 'validate', level: 'error', message: '数据校验失败：OHLC 自洽性检查未通过，下游全部跳过。' },
              { at, stage: 'run', level: 'error', message: '本次运行终止：BLOCKED（DATA_VALIDATION_FAILED）。' },
            ],
          },
          done: true,
        };
      }
      const stages = withStage(state.stages, 'validate', 'ok', 'OHLC 自洽性与根数检查通过', 4320);
      return {
        state: {
          ...state,
          stages,
          receipts: [
            ...state.receipts,
            { at, stage: 'validate', level: 'ok', message: '数据校验通过：4,320 根 K 线自洽，无缺失日期。' },
          ],
        },
        done: false,
      };
    }
    case 'compute': {
      if (!definition.researchComplete) {
        const stages = withStage(state.stages, 'compute', 'blocked', '研究任务未完成，无有效研究产物', 0);
        const downstream: StageId[] = ['gate', 'candidate', 'publish'];
        let next = stages;
        for (const id of downstream) {
          next = withStage(next, id, 'skipped', '研究未完成，已跳过', null);
        }
        return {
          state: {
            ...state,
            stages: next,
            verdict: 'BLOCKED',
            blockCode: 'RESEARCH_INCOMPLETE',
            finished: true,
            receipts: [
              ...state.receipts,
              { at, stage: 'compute', level: 'warn', message: '研究任务未完成：本次没有可用于发布的研究结果。' },
              { at, stage: 'run', level: 'error', message: '本次运行终止：BLOCKED（RESEARCH_INCOMPLETE），发布指针不变。' },
            ],
          },
          done: true,
        };
      }
      const mismatch = definition.researchInputDate !== dataDate;
      const stages = withStage(
        state.stages,
        'compute',
        'ok',
        mismatch
          ? `研究完成，但输入版本对应 ${definition.researchInputDate}`
          : `研究完成，输入版本对应 ${dataDate}`,
        24,
      );
      return {
        state: {
          ...state,
          stages,
          receipts: [
            ...state.receipts,
            {
              at,
              stage: 'compute',
              level: mismatch ? 'warn' : 'ok',
              message: mismatch
                ? `研究产物声明的输入数据日期为 ${definition.researchInputDate}，与本次数据日期 ${dataDate} 不一致。`
                : `研究任务完成：24 个标的评估，输入版本对应 ${dataDate}。`,
            },
          ],
        },
        done: false,
      };
    }
    case 'gate': {
      const mismatch = definition.researchInputDate !== dataDate;
      if (mismatch) {
        const stages = withStage(state.stages, 'gate', 'blocked', '输入摘要与数据日期不一致，拒绝继续', null);
        let next = stages;
        for (const id of ['candidate', 'publish'] as StageId[]) {
          next = withStage(next, id, 'skipped', '门禁未放行，已跳过', null);
        }
        return {
          state: {
            ...state,
            stages: next,
            verdict: 'BLOCKED',
            blockCode: 'VERSION_MISMATCH',
            finished: true,
            receipts: [
              ...state.receipts,
              { at, stage: 'gate', level: 'error', message: '一致性门禁阻断：研究输入版本与最新数据不匹配。' },
              { at, stage: 'run', level: 'error', message: `本次运行终止：BLOCKED（VERSION_MISMATCH），已发布指针保持 ${previousRelease}。` },
            ],
          },
          done: true,
        };
      }
      const stages = withStage(state.stages, 'gate', 'ok', '研究完整性、输入摘要与数据日期一致', 3);
      return {
        state: {
          ...state,
          stages,
          receipts: [
            ...state.receipts,
            { at, stage: 'gate', level: 'ok', message: '一致性门禁放行：研究完整、输入摘要与数据日期一致。' },
          ],
        },
        done: false,
      };
    }
    case 'candidate': {
      const stages = withStage(state.stages, 'candidate', 'ok', `生成候选快照（数据日期 ${dataDate}）`, 20);
      return {
        state: {
          ...state,
          stages,
          receipts: [
            ...state.receipts,
            { at, stage: 'candidate', level: 'ok', message: '候选快照已生成：24 行，展示上限 20 行。' },
          ],
        },
        done: false,
      };
    }
    case 'publish': {
      const release = definition.releaseOnSuccess ?? previousRelease;
      const published: PublishedPointer = {
        release,
        dataDate,
        researchDate: state.researchDate ?? dataDate,
      };
      const stages = withStage(state.stages, 'publish', 'ok', `发布 ${release}`, 1);
      return {
        state: {
          ...state,
          stages,
          verdict: 'SUCCESS',
          blockCode: 'OK',
          pointer: published,
          publishedThisRun: published,
          finished: true,
          receipts: [
            ...state.receipts,
            { at, stage: 'publish', level: 'ok', message: `发布完成：${release}（数据日期 ${dataDate}）。` },
            { at, stage: 'run', level: 'ok', message: '本次运行结束：SUCCESS。' },
          ],
        },
        done: true,
      };
    }
    default: {
      return { state: { ...state, finished: true }, done: true };
    }
  }
}

/** 依次推进到终态（供单元测试与「立即完成」使用） */
export function runToCompletion(state: RunState, maxTicks = 24): RunState {
  let current = state;
  for (let i = 0; i < maxTicks; i += 1) {
    const result = tick(current);
    current = result.state;
    if (result.done) break;
  }
  return current;
}

export function runScenario(scenario: ScenarioId, previous: RunState): RunState {
  return runToCompletion(startRun(previous, scenario));
}

/** 运行结束后，把本次结果并入历史快照列表（去重，最多保留 6 条） */
export function mergeSnapshot(
  history: readonly import('../contracts/types').SnapshotRecord[],
  pointer: PublishedPointer,
  note: string,
): import('../contracts/types').SnapshotRecord[] {
  if (history.some((item) => item.release === pointer.release)) return [...history];
  return [{ ...pointer, note }, ...history].slice(0, MAX_RUNS);
}

export function stageStatusOf(state: RunState, id: StageId): StageStatus {
  const stage = state.stages.find((item) => item.id === id);
  return stage ? stage.status : 'pending';
}

export function stageLabel(id: StageId): string {
  return STAGE_LABELS[id];
}

export function verdictText(verdict: Verdict, code: BlockCode): string {
  if (verdict === 'SUCCESS') return '门禁结论：SUCCESS';
  if (verdict === 'BLOCKED') return `门禁结论：BLOCKED（${code}）`;
  return '门禁结论：待运行';
}

export function blockReasonText(code: BlockCode): string {
  switch (code) {
    case 'RESEARCH_INCOMPLETE':
      return '研究未完成，本次未发布。';
    case 'VERSION_MISMATCH':
      return '研究输入版本与最新数据不一致，本次未发布。';
    case 'DATA_VALIDATION_FAILED':
      return '数据校验失败，本次未发布。';
    default:
      return '本次运行未产生发布。';
  }
}

export const INITIAL_HISTORY: readonly import('../contracts/types').SnapshotRecord[] = [
  {
    release: 'demo-snapshot-002',
    dataDate: D1_DATA_DATE,
    researchDate: D1_DATA_DATE,
    note: '上一版本快照（历史，非最新）。',
  },
  {
    release: 'demo-snapshot-001',
    dataDate: '2030-10-25',
    researchDate: '2030-10-25',
    note: '更早的快照，仅用于演示历史入口。',
  },
] as const;

export function stageIndexOf(id: StageId): number {
  return stageIndex(id);
}

export { SERIES_END_DATE };
