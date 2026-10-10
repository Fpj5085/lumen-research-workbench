import type { StageStatus } from '../contracts/types';

const TEXT: Record<StageStatus, string> = {
  pending: '等待',
  running: '进行中',
  ok: '完成',
  failed: '失败',
  blocked: '阻断',
  skipped: '跳过',
};

export function StatusBadge({ status }: { readonly status: StageStatus }) {
  return (
    <span className={`badge badge--${status}`} data-status={status}>
      {TEXT[status]}
    </span>
  );
}
