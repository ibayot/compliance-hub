import { Injectable } from '@nestjs/common';
import { MetricStatus } from '../entities/metric-result.entity';

export interface SectionCheckConfig {
  required_sections: string[];
}

export interface SectionCheckResult {
  status: MetricStatus;
  evidence: {
    found_sections: string[];
    missing_sections: string[];
  };
  message: string;
  score: number;
}

@Injectable()
export class SectionCheckEngine {
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if document contains required sections
   * @param extractedText Full text extracted from document
   * @param ruleConfig Configuration specifying required sections
   * @param passCriteria Criteria for determining pass/fail
   * @returns Metric result
   */
  execute(
    extractedText: string,
    ruleConfig: SectionCheckConfig,
    passCriteria: { all_present: boolean },
  ): SectionCheckResult {
    const requiredSections = Array.isArray(ruleConfig?.required_sections)
      ? ruleConfig.required_sections.filter(
          (section) => typeof section === 'string' && section.trim().length > 0,
        )
      : [];

    if (requiredSections.length === 0) {
      return {
        status: MetricStatus.ERROR,
        evidence: {
          found_sections: [],
          missing_sections: [],
        },
        message: 'Invalid section_check rule: required_sections must contain at least one section',
        score: 0,
      };
    }

    const foundSections: string[] = [];
    const missingSections: string[] = [];

    // Check for each required section
    for (const section of requiredSections) {
      const escapedSection = this.escapeRegex(section.trim());
      const regex = new RegExp(`(^|\\n)\\s*${escapedSection}(\\s*[:\\-]|\\s*$)`, 'im');
      if (regex.test(extractedText)) {
        foundSections.push(section);
      } else {
        missingSections.push(section);
      }
    }

    // Determine pass/fail
    const allPresent = missingSections.length === 0;
    const status = allPresent === passCriteria.all_present ? MetricStatus.PASS : MetricStatus.FAIL;

    // Calculate score
    const score = foundSections.length / requiredSections.length;

    // Generate message
    let message: string;
    if (allPresent) {
      message = `All required sections are present (${foundSections.length}/${requiredSections.length})`;
    } else {
      message = `Missing sections: ${missingSections.join(', ')} (${foundSections.length}/${requiredSections.length} present)`;
    }

    return {
      status,
      evidence: {
        found_sections: foundSections,
        missing_sections: missingSections,
      },
      message,
      score,
    };
  }
}
