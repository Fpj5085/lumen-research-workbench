import { describe, expect, it } from 'vitest';
import type { RunState, ScenarioId, StageId, StageStatus } from '../../src/contracts/types';
import { D1_DATA_DATE, SERIES_END_DATE } from '../../src/simulation/generator';
import { SCENARIOS, STAGE_ORDER, scenarioById } from '../../src/simulation/scenarios';
import {
  INITIAL_POINTER,
  blockReasonText,
  initialRunState,
  mergeSnapshot,
  runScenario,
  stageStatusOf,
  startRun,
  tick,
  verdictText,
} from '../../src/simulation/state-machine';

function finalState(scenario: ScenarioId, from: RunState = initialRunState()): RunState {
  return runScenario(scenario, from);
}

function statuses(state: RunState): Record<StageId, StageStatus> {
  return STAGE_ORDER.reduce(
    (acc, id) => {
      acc[id] = stageStatusOf(state, id);
      return acc;
    },
    {} as Record<StageId, StageStatus>,
  );
}

describe('初始状态', () => {
  it('指针为历史版本，六阶段全部 pending，verdict 为 PENDING', () => {
    const state = initialRunState();
    expect(state.pointer).toEqual(INITIAL_POINTER);
    expect(state.pointer.release).toBe('demo-snapshot-002');
    expect(state.pointer.dataDate).toBe(D1_DATA_DATE);
    expect(state.verdict).toBe('PENDING');
    expect(state.stages).toHaveLength(6);
    expect(state.stages.every((stage) => stage.status === 'pending')).toBe(true);
    expect(state.runCount).toBe(0);
    expect(state.finished).toBe(false);
  });

  it('初始指针数据日期早于合成数据集最后交易日，明确是历史日期', () => {
    expect(INITIAL_POINTER.dataDate < SERIES_END_DATE).toBe(true);
  });
});

describe('正常场景', () => {
  it('六阶段依次完成，门禁 SUCCESS，指针推进到新版本', () => {
    const state = finalState('normal');
    expect(statuses(state)).toEqual({
      ingest: 'ok',
      validate: 'ok',
      compute: 'ok',
      gate: 'ok',
      candidate: 'ok',
      publish: 'ok',
    });
    expect(state.verdict).toBe('SUCCESS');
    expect(state.blockCode).toBe('OK');
    expect(state.pointer.release).toBe('demo-snapshot-003');
    expect(state.pointer.dataDate).toBe(SERIES_END_DATE);
    expect(state.pointer.researchDate).toBe(SERIES_END_DATE);
    expect(state.publishedThisRun).toEqual(state.pointer);
    expect(state.finished).toBe(true);
  });

  it('发布版本的数据日期与研究日期一致', () => {
    const state = finalState('normal');
    expect(state.pointer.dataDate).toBe(state.pointer.researchDate);
  });
});

describe('研究未完成场景', () => {
  it('研究阶段阻断，下游跳过，不产生发布', () => {
    const state = finalState('research_failed');
    expect(statuses(state)).toEqual({
      ingest: 'ok',
      validate: 'ok',
      compute: 'blocked',
      gate: 'skipped',
      candidate: 'skipped',
      publish: 'skipped',
    });
    expect(state.verdict).toBe('BLOCKED');
    expect(state.blockCode).toBe('RESEARCH_INCOMPLETE');
    expect(state.publishedThisRun).toBeNull();
    expect(state.pointer).toEqual(INITIAL_POINTER);
    expect(state.researchDate).toBeNull();
  });
});

describe('版本不匹配场景', () => {
  it('研究完成但输入版本为旧日期，门禁阻断，指针不变', () => {
    const state = finalState('version_mismatch');
    expect(statuses(state)).toEqual({
      ingest: 'ok',
      validate: 'ok',
      compute: 'ok',
      gate: 'blocked',
      candidate: 'skipped',
      publish: 'skipped',
    });
    expect(state.verdict).toBe('BLOCKED');
    expect(state.blockCode).toBe('VERSION_MISMATCH');
    expect(state.pointer).toEqual(INITIAL_POINTER);
    expect(state.publishedThisRun).toBeNull();
    // 研究声明日期是本次数据日期，但输入版本是 D1 —— 不允许重新贴上最新日期
    expect(state.researchDate).toBe(SERIES_END_DATE);
    expect(scenarioById('version_mismatch').researchInputDate).toBe(D1_DATA_DATE);
  });
});

describe('数据校验失败场景', () => {
  it('校验阶段失败，研究与发布全部跳过', () => {
    const state = finalState('data_failed');
    expect(statuses(state)).toEqual({
      ingest: 'ok',
      validate: 'failed',
      compute: 'skipped',
      gate: 'skipped',
      candidate: 'skipped',
      publish: 'skipped',
    });
    expect(state.verdict).toBe('BLOCKED');
    expect(state.blockCode).toBe('DATA_VALIDATION_FAILED');
    expect(state.pointer).toEqual(INITIAL_POINTER);
  });
});

describe('发布指针不变量', () => {
  it('三个失败场景都不推进指针，且发布事件为零', () => {
    const failures: ScenarioId[] = ['research_failed', 'version_mismatch', 'data_failed'];
    for (const scenario of failures) {
      const state = finalState(scenario);
      expect(state.pointer).toEqual(INITIAL_POINTER);
      expect(state.publishedThisRun).toBeNull();
      expect(state.verdict).toBe('BLOCKED');
      const publishStage = state.stages.find((stage) => stage.id === 'publish')!;
      expect(publishStage.status).not.toBe('ok');
    }
  });

  it('失败运行之后仍可正常发布，指针从历史版本推进', () => {
    const failed = finalState('research_failed');
    const recovered = finalState('normal', failed);
    expect(recovered.pointer.release).toBe('demo-snapshot-003');
    expect(recovered.verdict).toBe('SUCCESS');
  });

  it('重复运行同一失败场景不会累积发布', () => {
    let state = initialRunState();
    for (let i = 0; i < 3; i += 1) {
      state = finalState('version_mismatch', state);
      expect(state.pointer).toEqual(INITIAL_POINTER);
    }
    expect(state.runCount).toBe(3);
  });

  it('每次 startRun 生成新的 runId 并清空阶段', () => {
    const first = startRun(initialRunState(), 'normal');
    expect(first.runId).toBe('run-0001');
    expect(first.stages.every((stage) => stage.status === 'pending')).toBe(true);
    const second = startRun({ ...first, finished: true }, 'normal');
    expect(second.runId).toBe('run-0002');
    expect(second.runCount).toBe(2);
    expect(second.pointer).toEqual(first.pointer);
  });
});

describe('状态机纯函数性质', () => {
  it('tick 不修改传入状态（不可变更新）', () => {
    const before = startRun(initialRunState(), 'normal');
    const snapshot = JSON.stringify(before);
    tick(before);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('相同输入得到相同的下一状态', () => {
    const before = startRun(initialRunState(), 'normal');
    expect(tick(before).state).toEqual(tick(before).state);
  });

  it('已结束的状态再次 tick 保持原样', () => {
    const done = finalState('normal');
    const result = tick(done);
    expect(result.done).toBe(true);
    expect(result.state).toEqual(done);
  });

  it('每个阶段都有回执，且终态有 run 级回执', () => {
    const state = finalState('normal');
    const stages = new Set(state.receipts.map((receipt) => receipt.stage));
    for (const id of STAGE_ORDER) {
      expect(stages.has(id)).toBe(true);
    }
    expect(state.receipts.some((receipt) => receipt.stage === 'run')).toBe(true);
  });
});

describe('场景定义与文案', () => {
  it('四个场景的预期结论与实现一致', () => {
    for (const scenario of SCENARIOS) {
      const state = finalState(scenario.id);
      expect(state.verdict).toBe(scenario.expectedVerdict);
      expect(state.blockCode).toBe(scenario.expectedCode);
    }
  });

  it('verdictText 与 blockReasonText 覆盖全部取值', () => {
    expect(verdictText('SUCCESS', 'OK')).toBe('门禁结论：SUCCESS');
    expect(verdictText('BLOCKED', 'VERSION_MISMATCH')).toContain('BLOCKED');
    expect(verdictText('PENDING', 'OK')).toContain('待运行');
    expect(blockReasonText('RESEARCH_INCOMPLETE')).toContain('未发布');
    expect(blockReasonText('VERSION_MISMATCH')).toContain('未发布');
    expect(blockReasonText('DATA_VALIDATION_FAILED')).toContain('未发布');
  });
});

describe('历史快照合并', () => {
  it('去重并按发布时间倒序保留最新记录', () => {
    const merged = mergeSnapshot([], { release: 'demo-snapshot-900', dataDate: '2030-01-02', researchDate: '2030-01-02' }, 'a');
    expect(merged).toHaveLength(1);
    const again = mergeSnapshot(merged, { release: 'demo-snapshot-900', dataDate: '2030-01-02', researchDate: '2030-01-02' }, 'a');
    expect(again).toHaveLength(1);
    const next = mergeSnapshot(merged, { release: 'demo-snapshot-901', dataDate: '2030-01-03', researchDate: '2030-01-03' }, 'b');
    expect(next[0]?.release).toBe('demo-snapshot-901');
    expect(next).toHaveLength(2);
  });

  it('最多保留 6 条', () => {
    let history: ReturnType<typeof mergeSnapshot> = [];
    for (let i = 0; i < 10; i += 1) {
      history = mergeSnapshot(
        history,
        { release: 'demo-snapshot-' + i, dataDate: '2030-02-0' + ((i % 9) + 1), researchDate: '2030-02-0' + ((i % 9) + 1) },
        'note',
      );
    }
    expect(history).toHaveLength(6);
  });
});
