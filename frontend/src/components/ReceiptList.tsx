import type { Receipt } from '../contracts/types';

const LEVEL_TEXT: Record<Receipt['level'], string> = {
  info: '信息',
  ok: '成功',
  warn: '警告',
  error: '错误',
};

export function ReceiptList({ receipts }: { readonly receipts: readonly Receipt[] }) {
  return (
    <ul className="receipt-list" data-testid="tasks-receipt-list" aria-label="模拟回执">
      {receipts.map((receipt, index) => (
        <li
          key={`${receipt.at}-${index}`}
          className="receipt-item"
          data-testid="tasks-receipt-item"
          data-level={receipt.level}
          data-stage={receipt.stage}
        >
          <span className="receipt-item__time mono">{receipt.at}</span>
          <span>
            <strong className="mono small">[{LEVEL_TEXT[receipt.level]}]</strong> {receipt.message}
          </span>
        </li>
      ))}
    </ul>
  );
}
