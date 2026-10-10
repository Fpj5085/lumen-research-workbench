import type { BlockCode, ScenarioId, StageId, StageState } from '../contracts/types';
import { D1_DATA_DATE, SERIES_END_DATE } from './generator';

export interface ScenarioDefinition {
  readonly id: ScenarioId;
  readonly label: string;
  readonly summary: string;
  /** 本次运行的数据日期 */
  readonly dataDate: string;
  /** 本次运行的研究日期；null 表示研究未完成 */
  readonly researchDate: string | null;
  readonly validateOk: boolean;
  /** 研究是否完成（用于区分「未完成」与「完成但版本不符」） */
  readonly researchComplete: boolean;
  /** 研究声明的输入数据日期；null 表示未完成 */
  readonly researchInputDate: string | null;
  readonly expectedVerdict: 'SUCCESS' | 'BLOCKED';
  readonly expectedCode: BlockCode;
  /** 发布成功时产生的版本号 */
  readonly releaseOnSuccess: string | null;
}

export const D2_DATA_DATE = SERIES_END_DATE;

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'normal',
    label: '正常完成',
    summary: '数据推进到新日期，研究完成且输入版本一致，门禁放行并发布新版本。',
    dataDate: D2_DATA_DATE,
    researchDate: D2_DATA_DATE,
    validateOk: true,
    researchComplete: true,
    researchInputDate: D2_DATA_DATE,
    expectedVerdict: 'SUCCESS',
    expectedCode: 'OK',
    releaseOnSuccess: 'demo-snapshot-003',
  },
  {
    id: 'research_failed',
    label: '研究未完成',
    summary: '数据已更新到新日期，但研究任务未完成；门禁阻断，不发布新版本。',
    dataDate: D2_DATA_DATE,
    researchDate: null,
    validateOk: true,
    researchComplete: false,
    researchInputDate: null,
    expectedVerdict: 'BLOCKED',
    expectedCode: 'RESEARCH_INCOMPLETE',
    releaseOnSuccess: null,
  },
  {
    id: 'version_mismatch',
    label: '研究版本不匹配',
    summary: '研究声明已完成，但其输入版本对应旧数据；门禁阻断，旧结果不会被贴上最新日期。',
    dataDate: D2_DATA_DATE,
    researchDate: D2_DATA_DATE,
    validateOk: true,
    researchComplete: true,
    researchInputDate: D1_DATA_DATE,
    expectedVerdict: 'BLOCKED',
    expectedCode: 'VERSION_MISMATCH',
    releaseOnSuccess: null,
  },
  {
    id: 'data_failed',
    label: '数据校验失败',
    summary: '数据校验阶段失败，下游研究、门禁与发布全部跳过。',
    dataDate: D2_DATA_DATE,
    researchDate: null,
    validateOk: false,
    researchComplete: false,
    researchInputDate: null,
    expectedVerdict: 'BLOCKED',
    expectedCode: 'DATA_VALIDATION_FAILED',
    releaseOnSuccess: null,
  },
] as const;

export const STAGE_ORDER: readonly StageId[] = [
  'ingest',
  'validate',
  'compute',
  'gate',
  'candidate',
  'publish',
] as const;

export const STAGE_LABELS: Record<StageId, string> = {
  ingest: '数据生成',
  validate: '数据校验',
  compute: '研究任务',
  gate: '一致性门禁',
  candidate: '候选快照',
  publish: '发布',
};

export function scenarioById(id: ScenarioId): ScenarioDefinition {
  const found = SCENARIOS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`unknown scenario: ${id}`);
  }
  return found;
}

export function initialStages(): StageState[] {
  return STAGE_ORDER.map((id) => ({ id, status: 'pending', note: '等待运行', count: null }));
}
