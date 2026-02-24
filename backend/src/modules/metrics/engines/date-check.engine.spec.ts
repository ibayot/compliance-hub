import { DateCheckEngine } from './date-check.engine';
import { MetricStatus } from '../entities/metric-result.entity';

describe('DateCheckEngine', () => {
  const engine = new DateCheckEngine();

  it('passes when submission is within allowed delay', () => {
    const deadline = new Date('2026-01-10T00:00:00Z');
    const submitted = new Date('2026-01-11T00:00:00Z');

    const result = engine.execute(
      submitted,
      deadline,
      { max_days_late: 2 },
      { within_deadline: true },
    );

    expect(result.status).toBe(MetricStatus.PASS);
    expect(result.evidence.days_late).toBe(1);
  });

  it('fails when submission exceeds allowed delay', () => {
    const deadline = new Date('2026-01-10T00:00:00Z');
    const submitted = new Date('2026-01-15T00:00:00Z');

    const result = engine.execute(
      submitted,
      deadline,
      { max_days_late: 2 },
      { within_deadline: true },
    );

    expect(result.status).toBe(MetricStatus.FAIL);
    expect(result.evidence.days_late).toBeGreaterThan(2);
  });
});
