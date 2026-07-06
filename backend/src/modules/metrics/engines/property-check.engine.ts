import { Injectable } from '@nestjs/common';
import { MetricStatus } from '../entities/metric-result.entity';

export interface PropertyCheckConfig {
  mode?: 'property_match' | 'number_extraction';
  field: string; // field name to check (e.g., fileName, documentType)
  pattern?: string; // regex pattern
  expected_value?: string; // exact value
  keyword?: string;
  keywords?: string[];
  comparison?: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
  comparisons?: Array<'gte' | 'lte' | 'eq' | 'gt' | 'lt'>;
  expected_number?: number;
  expected_numbers?: number[];
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
    checks?: Array<{
      keyword: string;
      extracted?: number | null;
      expected?: number;
      comparison?: string;
      matches: boolean;
    }>;
    matches: boolean;
  };
  message: string;
  score: number;
}

@Injectable()
export class PropertyCheckEngine {
  private toOperatorSymbol(operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt'): string {
    switch (operator) {
      case 'gte':
        return '>=';
      case 'lte':
        return '<=';
      case 'gt':
        return '>';
      case 'lt':
        return '<';
      case 'eq':
        return '=';
      default:
        return operator;
    }
  }

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
    let numberComparison: 'gte' | 'lte' | 'eq' | 'gt' | 'lt' = 'gte';
    let keywordExtraction: Array<{
      keyword: string;
      extracted: number | null;
      expected?: number;
      comparison: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
      matches: boolean;
    }> = [];

    if (mode === 'number_extraction') {
      const configuredKeywords = Array.isArray(ruleConfig.keywords)
        ? ruleConfig.keywords.map((item) => String(item).trim()).filter(Boolean)
        : [];
      const keyword = (ruleConfig.keyword || '').trim();
      const keywords =
        configuredKeywords.length > 0 ? configuredKeywords : keyword ? [keyword] : [];
      const comparison = ruleConfig.comparison || 'gte';
      numberComparison = comparison;
      const comparisons = Array.isArray(ruleConfig.comparisons)
        ? ruleConfig.comparisons
            .map((item) => String(item).trim() as 'gte' | 'lte' | 'eq' | 'gt' | 'lt')
            .filter((item) => ['gte', 'lte', 'eq', 'gt', 'lt'].includes(item))
        : [];
      const expectedNumber = Number(ruleConfig.expected_number);
      const expectedNumbers = Array.isArray(ruleConfig.expected_numbers)
        ? ruleConfig.expected_numbers.map((item) => Number(item))
        : [];
      const windowChars = Number(ruleConfig.window_chars || 120);

      if (keywords.length === 0) {
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
          message: 'Invalid number_extraction rule: at least one keyword is required',
          score: 0,
        };
      }

      keywordExtraction = keywords.map((keywordValue, index) => {
        const keywordIndex = extractedText.toLowerCase().indexOf(keywordValue.toLowerCase());
        let extracted: number | null = null;

        if (keywordIndex >= 0) {
          const contextStart = Math.max(0, keywordIndex - Math.floor(windowChars / 2));
          const contextEnd = Math.min(
            extractedText.length,
            keywordIndex + keywordValue.length + Math.floor(windowChars / 2),
          );
          const context = extractedText.slice(contextStart, contextEnd);

          const escapedKeyword = keywordValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const keywordValueMatch = new RegExp(
            `${escapedKeyword}[^\\d-]{0,24}(-?\\d[\\d,]*(?:\\.\\d+)?)`,
            'i',
          ).exec(context);

          if (keywordValueMatch?.[1]) {
            extracted = Number(keywordValueMatch[1].replace(/,/g, ''));
          } else {
            const numericMatches = Array.from(context.matchAll(/-?\d[\d,]*(?:\.\d+)?/g));
            if (numericMatches.length > 0) {
              const keywordPosInContext = keywordIndex - contextStart;
              let bestValue: number | null = null;
              let minDistance = Number.POSITIVE_INFINITY;

              for (const match of numericMatches) {
                const raw = String(match[0] || '').replace(/,/g, '');
                const parsed = Number(raw);
                if (!Number.isFinite(parsed)) continue;
                const distance = Math.abs((match.index ?? 0) - keywordPosInContext);
                if (distance < minDistance) {
                  minDistance = distance;
                  bestValue = parsed;
                }
              }

              extracted = bestValue;
            }
          }
        }

        const expectedForKeyword = Number.isFinite(expectedNumbers[index])
          ? expectedNumbers[index]
          : expectedNumber;
        const comparisonForKeyword = comparisons[index] || comparison;

        let keywordMatches = false;
        if (
          extracted !== null &&
          Number.isFinite(extracted) &&
          Number.isFinite(expectedForKeyword)
        ) {
          switch (comparisonForKeyword) {
            case 'gte':
              keywordMatches = extracted >= expectedForKeyword;
              break;
            case 'lte':
              keywordMatches = extracted <= expectedForKeyword;
              break;
            case 'gt':
              keywordMatches = extracted > expectedForKeyword;
              break;
            case 'lt':
              keywordMatches = extracted < expectedForKeyword;
              break;
            case 'eq':
              keywordMatches = extracted === expectedForKeyword;
              break;
            default:
              keywordMatches = false;
              break;
          }
        }

        return {
          keyword: keywordValue,
          extracted,
          expected: Number.isFinite(expectedForKeyword) ? expectedForKeyword : undefined,
          comparison: comparisonForKeyword,
          matches: keywordMatches,
        };
      });

      extractedNumber = keywordExtraction[0]?.extracted ?? null;
      matches = keywordExtraction.length > 0 && keywordExtraction.every((item) => item.matches);
    } else {
      if (pattern) {
        const regex = new RegExp(pattern);
        matches = regex.test(actualValue);
      } else if (expected_value !== undefined) {
        matches = actualValue === expected_value;
      }
    }

    // Determine pass/fail
    const status = matches === passCriteria.matches_pattern ? MetricStatus.PASS : MetricStatus.FAIL;

    // Calculate score
    const score = matches ? 1.0 : 0.0;

    // Generate message
    let message: string;
    if (mode === 'number_extraction') {
      if (matches) {
        message = 'All configured extracted numbers satisfied their comparisons.';
      } else {
        const missingKeywords = keywordExtraction
          .filter((item) => item.extracted === null)
          .map((item) => item.keyword);
        const failedChecks = keywordExtraction.filter(
          (item) => !item.matches && item.extracted !== null,
        );
        const failedSummary = failedChecks
          .map((item) => {
            const operatorLabel = this.toOperatorSymbol(item.comparison);
            return `${item.keyword}: ${item.extracted} did not satisfy ${operatorLabel} ${item.expected ?? 'n/a'}`;
          })
          .join('; ');

        if (failedSummary) {
          message = failedSummary;
        } else if (missingKeywords.length > 0) {
          message = `Missing numeric values for keyword(s): ${missingKeywords.join(', ')}`;
        } else {
          message = `One or more extracted numbers did not satisfy comparison "${numberComparison}".`;
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
        comparison: numberComparison,
        checks:
          mode === 'number_extraction'
            ? keywordExtraction.map((item) => ({
                keyword: item.keyword,
                extracted: item.extracted,
                expected: item.expected,
                comparison: item.comparison,
                matches: item.matches,
              }))
            : undefined,
        matches,
      },
      message,
      score,
    };
  }
}
