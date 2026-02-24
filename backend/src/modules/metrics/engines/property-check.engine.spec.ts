import { PropertyCheckEngine } from './property-check.engine';
import { MetricStatus } from '../entities/metric-result.entity';

describe('PropertyCheckEngine', () => {
  const engine = new PropertyCheckEngine();

  it('passes number extraction when extracted number matches comparison', () => {
    const metadata = { title: 'Sample' };
    const text = 'total incidents: 5 during this period';

    const result = engine.execute(
      metadata,
      text,
      {
        mode: 'number_extraction',
        field: 'extracted_text',
        keyword: 'total incidents',
        comparison: 'gte',
        expected_number: 3,
      },
      { matches_pattern: true },
    );

    expect(result.status).toBe(MetricStatus.PASS);
    expect(result.evidence.extracted_number).toBe(5);
  });

  it('fails property_match when expected value does not match', () => {
    const metadata = { documentType: 'Report' };
    const text = '';

    const result = engine.execute(
      metadata,
      text,
      {
        field: 'documentType',
        expected_value: 'Policy',
      },
      { matches_pattern: true },
    );

    expect(result.status).toBe(MetricStatus.FAIL);
  });
});
