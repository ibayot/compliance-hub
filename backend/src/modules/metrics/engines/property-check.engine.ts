import { Injectable } from '@nestjs/common';
import { MetricStatus } from '../entities/metric-result.entity';

export interface PropertyCheckConfig {
  mode?: 'property_match' | 'number_extraction';
  field: string; // field name to check (e.g., fileName, documentType)
  pattern?: string; // regex pattern
  expected_value?: string; // exact value
  keyword?: string;
  comparison?: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
  expected_number?: number;
  window_chars?: number;
}

export interface PropertyCheckResult {
  status: MetricStatus;
  evidence: {
    mode?: string;
    field: string;
    actual_value: string;
    expected_pattern?: string;
    expected_value?: string;
    extracted_number?: number | null;
    expected_number?: number;
    comparison?: string;
    matches: boolean;
  };
  message: string;
  score: number;
}

@Injectable()
export class PropertyCheckEngine {
  /**
   * Check if document properties match criteria
   * @param documentMetadata Document metadata object
   * @param ruleConfig Configuration specifying property and pattern/value
   * @param passCriteria Criteria for determining pass/fail
   * @returns Metric result
   */
  execute(
    documentMetadata: Record<string, any>,
    extractedText: string,
    ruleConfig: PropertyCheckConfig,
    passCriteria: { matches_pattern: boolean },
  ): PropertyCheckResult {
    const mode = ruleConfig.mode || 'property_match';
    const { field, pattern, expected_value } = ruleConfig;
    const actualValue = documentMetadata[field]?.toString() || '';

    let matches = false;
    let extractedNumber: number | null = null;

    if (mode === 'number_extraction') {
      const keyword = (ruleConfig.keyword || '').trim();
      const comparison = ruleConfig.comparison || 'gte';
      const expectedNumber = Number(ruleConfig.expected_number);
      const windowChars = Number(ruleConfig.window_chars || 120);

      if (!keyword || !Number.isFinite(expectedNumber)) {
        return {
          status: MetricStatus.ERROR,
          evidence: {
            mode,
            field,
            actual_value: actualValue,
            expected_number: Number.isFinite(expectedNumber) ? expectedNumber : undefined,
            comparison,
            extracted_number: null,
            matches: false,
          },
          message: 'Invalid number_extraction rule: keyword and expected_number are required',
          score: 0,
        };
      }

      const keywordIndex = extractedText.toLowerCase().indexOf(keyword.toLowerCase());
      if (keywordIndex >= 0) {
        const contextStart = Math.max(0, keywordIndex - Math.floor(windowChars / 2));
        const contextEnd = Math.min(extractedText.length, keywordIndex + keyword.length + Math.floor(windowChars / 2));
        const context = extractedText.slice(contextStart, contextEnd);

        const numberMatch = context.match(/-?\d+(?:\.\d+)?/);
        if (numberMatch) {
          extractedNumber = Number(numberMatch[0]);
        }
      }

      if (extractedNumber === null || !Number.isFinite(extractedNumber)) {
        matches = false;
      } else {
        switch (comparison) {
          case 'gte':
            matches = extractedNumber >= expectedNumber;
            break;
          case 'lte':
            matches = extractedNumber <= expectedNumber;
            break;
          case 'gt':
            matches = extractedNumber > expectedNumber;
            break;
          case 'lt':
            matches = extractedNumber < expectedNumber;
            break;
          case 'eq':
            matches = extractedNumber === expectedNumber;
            break;
          default:
            matches = false;
            break;
        }
      }
    } else {
      if (pattern) {
        const regex = new RegExp(pattern);
        matches = regex.test(actualValue);
      } else if (expected_value !== undefined) {
        matches = actualValue === expected_value;
      }
    }

    // Determine pass/fail
    const status =
      matches === passCriteria.matches_pattern
        ? MetricStatus.PASS
        : MetricStatus.FAIL;

    // Calculate score
    const score = matches ? 1.0 : 0.0;

    // Generate message
    let message: string;
    if (mode === 'number_extraction') {
      if (matches) {
        message = `Extracted number ${extractedNumber} near keyword "${ruleConfig.keyword}" matches ${ruleConfig.comparison} ${ruleConfig.expected_number}`;
      } else {
        if (extractedNumber === null) {
          message = `No number found near keyword "${ruleConfig.keyword}"`;
        } else {
          message = `Extracted number ${extractedNumber} near keyword "${ruleConfig.keyword}" does not match ${ruleConfig.comparison} ${ruleConfig.expected_number}`;
        }
      }
    } else {
      if (matches) {
        message = `Property "${field}" matches criteria`;
      } else {
        if (pattern) {
          message = `Property "${field}" does not match pattern "${pattern}" (value: "${actualValue}")`;
        } else {
          message = `Property "${field}" does not match expected value "${expected_value}" (value: "${actualValue}")`;
        }
      }
    }

    return {
      status,
      evidence: {
        mode,
        field,
        actual_value: actualValue,
        expected_pattern: pattern,
        expected_value,
        extracted_number: extractedNumber,
        expected_number: Number.isFinite(Number(ruleConfig.expected_number))
          ? Number(ruleConfig.expected_number)
          : undefined,
        comparison: ruleConfig.comparison,
        matches,
      },
      message,
      score,
    };
  }
}
