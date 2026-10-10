// 合成交易日历：只跳过周末，不引入任何真实节假日表（避免与真实市场日期混淆）。

const MS_PER_DAY = 86_400_000;

function toUtcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(Date.UTC(y as number, (m as number) - 1, d as number));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 以 endDate（含）为最后一根，向前取 count 个工作日，返回升序日期数组 */
export function businessDays(endDate: string, count: number): string[] {
  const days: string[] = [];
  const cursor = toUtcDate(endDate);
  while (days.length < count) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(toIso(cursor));
    }
    cursor.setTime(cursor.getTime() - MS_PER_DAY);
  }
  return days.reverse();
}

export function isOnOrBefore(date: string, limit: string): boolean {
  return date <= limit;
}

export function shiftDays(iso: string, days: number): string {
  const date = toUtcDate(iso);
  date.setTime(date.getTime() + days * MS_PER_DAY);
  return toIso(date);
}

export function formatCn(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}
