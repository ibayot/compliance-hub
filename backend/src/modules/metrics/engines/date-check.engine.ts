import { Injectable } from '@nestjs/common';
import { MetricStatus } from '../entities/metric-result.entity';

export interface DateCheckConfig {
  max_days_late: number;
  submission_frequency?: 'monthly' | 'quarterly' | 'annual' | 'custom';
  submission_month?: number;
  deadline_day?: number;
  deadline_month_offset?: number;
  deadline_date?: string;
}

export interface DateCheckResult {
  status: MetricStatus;
  evidence: {
    submitted_date: string;
    deadline: string;
    days_late: number;
    within_deadline: boolean;
  };
  message: string;
  score: number;
}

@Injectable()
export class DateCheckEngine {
  /**
   * Check if document submission is within deadline
   * @param submittedDate Date when document was submitted
   * @param deadline Expected deadline date
   * @param ruleConfig Configuration specifying max allowed delay
   * @param passCriteria Criteria for determining pass/fail
   * @returns Metric result
   */
  execute(
    submittedDate: Date,
    deadline: Date,
    ruleConfig: DateCheckConfig,
    passCriteria: { within_deadline: boolean },
  ): DateCheckResult {
    const maxDaysLateRaw = Number(ruleConfig?.max_days_late);
    const maxDaysLate = Number.isFinite(maxDaysLateRaw) ? Math.max(0, maxDaysLateRaw) : 0;

    // Calculate days late (negative if early)
    const diffMs = submittedDate.getTime() - deadline.getTime();
    const daysLate = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Check if within allowed delay
    const withinDeadline = daysLate <= maxDaysLate;

    // Determine pass/fail
    const status =
      withinDeadline === passCriteria.within_deadline ? MetricStatus.PASS : MetricStatus.FAIL;

    // Calculate score (1.0 if on time, decreasing with delay)
    let score: number;
    if (daysLate <= 0) {
      score = 1.0;
    } else if (daysLate <= maxDaysLate) {
      score = maxDaysLate > 0 ? 1.0 - daysLate / (maxDaysLate * 2) : 0;
    } else {
      score = 0.0;
    }

    // Generate message
    let message: string;
    const submittedLabel = submittedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    const deadlineLabel = deadline.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    if (daysLate <= 0) {
      message = `Submitted on time (${Math.abs(daysLate)} days early). Submitted: ${submittedLabel}, deadline: ${deadlineLabel}.`;
    } else if (daysLate <= maxDaysLate) {
      message = `Submitted ${daysLate} days late (within acceptable ${maxDaysLate} days delay). Submitted: ${submittedLabel}, deadline: ${deadlineLabel}.`;
    } else {
      message = `Submitted ${daysLate} days late (exceeds ${maxDaysLate} days allowed delay). Submitted: ${submittedLabel}, deadline: ${deadlineLabel}.`;
    }

    return {
      status,
      evidence: {
        submitted_date: submittedDate.toISOString(),
        deadline: deadline.toISOString(),
        days_late: daysLate,
        within_deadline: withinDeadline,
      },
      message,
      score,
    };
  }
}
