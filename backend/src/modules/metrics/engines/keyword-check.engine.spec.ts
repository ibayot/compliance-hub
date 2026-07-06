import { KeywordCheckEngine } from './keyword-check.engine';
import { MetricStatus } from '../entities/metric-result.entity';

describe('KeywordCheckEngine', () => {
  const engine = new KeywordCheckEngine();

  it('passes when minimum matches are met', () => {
    const text = 'Compliance report includes compliance evidence and report summary';
    const result = engine.execute(text, { keywords: ['compliance', 'report'] }, { min_matches: 2 });

    expect(result.status).toBe(MetricStatus.PASS);
    expect(result.evidence.total_matches).toBeGreaterThanOrEqual(2);
  });

  it('fails when minimum matches are not met', () => {
    const text = 'Only one token here';
    const result = engine.execute(text, { keywords: ['compliance', 'report'] }, { min_matches: 2 });

    expect(result.status).toBe(MetricStatus.FAIL);
    expect(result.evidence.total_matches).toBeLessThan(2);
  });
});
