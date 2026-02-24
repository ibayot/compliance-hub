import { Injectable } from '@nestjs/common';
import { MetricStatus } from '../entities/metric-result.entity';

export interface KeywordCheckConfig {
  keywords: string[];
  min_count?: number;
  case_sensitive?: boolean;
  use_word_boundary?: boolean;
}

export interface KeywordMatch {
  keyword: string;
  count: number;
  snippets: string[];
}

export interface KeywordCheckResult {
  status: MetricStatus;
  evidence: {
    matches: KeywordMatch[];
    total_matches: number;
  };
  message: string;
  score: number;
}

@Injectable()
export class KeywordCheckEngine {
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if document contains required keywords
   * @param extractedText Full text extracted from document
   * @param ruleConfig Configuration specifying keywords and criteria
   * @param passCriteria Criteria for determining pass/fail
   * @returns Metric result
   */
  execute(
    extractedText: string,
    ruleConfig: KeywordCheckConfig,
    passCriteria: { min_matches: number },
  ): KeywordCheckResult {
    const keywords = Array.isArray(ruleConfig?.keywords)
      ? ruleConfig.keywords.filter((keyword) => typeof keyword === 'string' && keyword.trim().length > 0)
      : [];

    if (keywords.length === 0) {
      return {
        status: MetricStatus.ERROR,
        evidence: {
          matches: [],
          total_matches: 0,
        },
        message: 'Invalid keyword_check rule: keywords must contain at least one keyword',
        score: 0,
      };
    }

    const caseSensitive = ruleConfig?.case_sensitive ?? false;
    const useWordBoundary = ruleConfig?.use_word_boundary ?? false;
    const minMatches =
      Number.isFinite(passCriteria?.min_matches)
        ? Number(passCriteria.min_matches)
        : Number.isFinite(ruleConfig?.min_count)
          ? Number(ruleConfig.min_count)
          : 1;

    const matches: KeywordMatch[] = [];
    let totalMatches = 0;

    // Search for each keyword
    for (const keyword of keywords) {
      const flags = caseSensitive ? 'g' : 'gi';
      const escapedKeyword = this.escapeRegex(keyword.trim());
      const keywordPattern = useWordBoundary
        ? `\\b${escapedKeyword}\\b`
        : escapedKeyword;
      const regex = new RegExp(keywordPattern, flags);
      const keywordMatches = extractedText.match(regex);
      const count = keywordMatches ? keywordMatches.length : 0;
      totalMatches += count;

      // Extract snippets (surrounding text)
      const snippets: string[] = [];
      if (count > 0) {
        const snippetRegex = new RegExp(
          `.{0,50}${keywordPattern}.{0,50}`,
          flags,
        );
        const snippetMatches = extractedText.match(snippetRegex);
        if (snippetMatches) {
          snippets.push(...snippetMatches.slice(0, 3)); // Limit to 3 snippets per keyword
        }
      }

      matches.push({
        keyword,
        count,
        snippets,
      });
    }

    // Determine pass/fail
    const meetsMinimum = totalMatches >= minMatches;
    const status = meetsMinimum ? MetricStatus.PASS : MetricStatus.FAIL;

    // Calculate score
    const score = Math.min(totalMatches / Math.max(minMatches, 1), 1.0);

    // Generate message
    let message: string;
    if (meetsMinimum) {
      message = `Found ${totalMatches} keyword matches (required: ${minMatches})`;
    } else {
      message = `Only ${totalMatches} keyword matches found (required: ${minMatches})`;
    }

    return {
      status,
      evidence: {
        matches,
        total_matches: totalMatches,
      },
      message,
      score,
    };
  }
}
