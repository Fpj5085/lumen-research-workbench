import type { StageState } from '../contracts/types';
import { STAGE_LABELS } from '../simulation/scenarios';

const STATUS_TEXT: Record<StageState['status'], string> = {
  pending: '等待',
  running: '进行中',
  ok: '完成',
  failed: '失败',
  blocked: '阻断',
  skipped: '跳过',
};

interface Props {
  readonly stages: readonly StageState[];
}

export function StageFlow({ stages }: Props) {
  return (
    <ol className="stage-list" data-testid="tasks-stage-list">
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className="stage-item"
          data-testid={`tasks-stage-${stage.id}`}
          data-stage={stage.id}
          data-status={stage.status}
        >
          <span className="stage-index" aria-hidden="true">
            {index + 1}
          </span>
          <span className="stage-body">
            <span className="stage-body__title">
              <strong>{STAGE_LABELS[stage.id]}</strong>
              <span
                className={`badge badge--${stage.status}`}
                data-testid="tasks-stage-status"
                data-status={stage.status}
              >
                {STATUS_TEXT[stage.status]}
              </span>
              {stage.count !== null ? <span className="muted small num">{stage.count.toLocaleString('en-US')} 行</span> : null}
            </span>
            <span className="stage-body__note" data-testid="tasks-stage-note">
              {stage.note}
            </span>
          </span>
          <span className="stage-item__aside muted small mono">{stage.id}</span>
        </li>
      ))}
    </ol>
  );
}
