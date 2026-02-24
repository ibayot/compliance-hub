import { SectionCheckEngine } from './section-check.engine';
import { MetricStatus } from '../entities/metric-result.entity';

describe('SectionCheckEngine', () => {
  const engine = new SectionCheckEngine();

  it('passes when all required sections are present', () => {
    const text = 'Introduction\nMethodology\nFindings';
    const result = engine.execute(
      text,
      { required_sections: ['Introduction', 'Methodology'] },
      { all_present: true },
    );

    expect(result.status).toBe(MetricStatus.PASS);
    expect(result.evidence.missing_sections).toHaveLength(0);
  });

  it('fails when a required section is missing', () => {
    const text = 'Introduction\nFindings';
    const result = engine.execute(
      text,
      { required_sections: ['Introduction', 'Methodology'] },
      { all_present: true },
    );

    expect(result.status).toBe(MetricStatus.FAIL);
    expect(result.evidence.missing_sections).toContain('Methodology');
  });
});
