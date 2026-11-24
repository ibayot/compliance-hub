export type SlaSoundKind = 'nearing_sla' | 'overdue_sla';

/** Send only the current milestone, even if a scan missed a previous one. */
export function slaPercentageMilestone(isOverdue: boolean, seconds: number, budgetSeconds: number): 75 | 100 | 150 | null {
  if (!Number.isFinite(budgetSeconds) || budgetSeconds <= 0) return null;
  if (isOverdue) return seconds >= budgetSeconds / 2 ? 150 : 100;
  return seconds <= budgetSeconds / 4 ? 75 : null;
}

/** 40%, 30%, 20%, 10%, then overdue and each five working minutes past due. */
export function slaSoundStep(remainingSeconds: number, budgetSeconds: number, overdueSeconds: number): number {
  if (remainingSeconds <= 0) return 5 + Math.floor(Math.max(0, overdueSeconds) / 300);
  if (budgetSeconds <= 0) return 0;
  return Math.max(0, 5 - Math.ceil(remainingSeconds * 10 / budgetSeconds));
}
