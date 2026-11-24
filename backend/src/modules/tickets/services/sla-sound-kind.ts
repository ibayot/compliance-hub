export type SlaSoundKind = 'nearing_sla' | 'overdue_sla';

/** 40%, 30%, 20%, 10%, then overdue and each five working minutes past due. */
export function slaSoundStep(remainingSeconds: number, budgetSeconds: number, overdueSeconds: number): number {
  if (remainingSeconds <= 0) return 5 + Math.floor(Math.max(0, overdueSeconds) / 300);
  if (budgetSeconds <= 0) return 0;
  return Math.max(0, 5 - Math.ceil(remainingSeconds * 10 / budgetSeconds));
}
