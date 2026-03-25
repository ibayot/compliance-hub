export function formatDocumentPeriod(year?: string | number, period?: string | number): string {
  const yearValue = String(year ?? '').trim();
  const periodValue = String(period ?? '').trim();

  if (!yearValue && !periodValue) return '—';
  if (!periodValue) return yearValue || '—';

  const compactMonth = /^(\d{4})(\d{2})$/.exec(periodValue);
  if (compactMonth) {
    return `${compactMonth[1]}-${compactMonth[2]}`;
  }

  const compactRange = /^(\d{4})(\d{2})-(\d{2})$/.exec(periodValue);
  if (compactRange) {
    return `${compactRange[1]}-${compactRange[2]}-${compactRange[3]}`;
  }

  if (yearValue && (periodValue.startsWith(`${yearValue}-`) || periodValue.startsWith(`${yearValue}Q`) || periodValue === yearValue)) {
    return periodValue;
  }

  if (yearValue && periodValue.startsWith(yearValue)) {
    return periodValue;
  }

  return yearValue ? `${yearValue}-${periodValue}` : periodValue;
}
