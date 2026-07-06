import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as diff_match_patch from 'diff-match-patch';
import { VersionComparison } from '../entities/version-comparison.entity';
import { DocumentVersion } from '../../documents/entities/document-version.entity';

export interface CompareVersionsDto {
  version_a_id: string;
  version_b_id: string;
  compared_by_id: number;
}

@Injectable()
export class ComparisonService {
  private readonly logger = new Logger(ComparisonService.name);
  private readonly dmp = new diff_match_patch.diff_match_patch();

  constructor(
    @InjectRepository(VersionComparison)
    private comparisonRepo: Repository<VersionComparison>,
    @InjectRepository(DocumentVersion)
    private versionRepo: Repository<DocumentVersion>,
  ) {}

  /**
   * Compare two document versions and generate diff
   */
  async compareVersions(dto: CompareVersionsDto): Promise<VersionComparison> {
    // Get both versions
    const versionA = await this.versionRepo.findOne({
      where: { id: dto.version_a_id },
    });
    const versionB = await this.versionRepo.findOne({
      where: { id: dto.version_b_id },
    });

    if (!versionA || !versionB) {
      throw new NotFoundException('One or both versions not found');
    }

    // Ensure they are from the same document
    if (versionA.document_id !== versionB.document_id) {
      throw new NotFoundException('Versions must be from the same document');
    }

    // Get extracted text
    const textA = versionA.extracted_text || '';
    const textB = versionB.extracted_text || '';

    // Compute diff using diff-match-patch
    const diffs = this.dmp.diff_main(textA, textB);
    this.dmp.diff_cleanupSemantic(diffs);

    // Calculate statistics
    const stats = this.calculateDiffStats(diffs);

    // Generate HTML diff for visualization
    const htmlDiff = this.dmp.diff_prettyHtml(diffs);

    // Create comparison record
    const comparison = this.comparisonRepo.create({
      document_id: versionA.document_id,
      version_a_id: dto.version_a_id,
      version_b_id: dto.version_b_id,
      compared_by_id: dto.compared_by_id,
      diff_output: {
        diffs,
        stats,
        htmlDiff,
      },
    });

    await this.comparisonRepo.save(comparison);

    this.logger.log(
      `Compared versions ${versionA.version_number} and ${versionB.version_number} of document ${versionA.document_id}`,
    );

    return comparison;
  }

  /**
   * Get comparison by ID
   */
  async getComparison(comparisonId: string): Promise<VersionComparison> {
    const comparison = await this.comparisonRepo.findOne({
      where: { id: comparisonId },
      relations: ['version_a', 'version_b', 'document'],
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    return comparison;
  }

  /**
   * Get all comparisons for a document
   */
  async getDocumentComparisons(documentId: string): Promise<VersionComparison[]> {
    return this.comparisonRepo.find({
      where: { document_id: documentId },
      relations: ['version_a', 'version_b'],
      order: { compared_at: 'DESC' },
    });
  }

  /**
   * Calculate diff statistics
   */
  private calculateDiffStats(diffs: any[]): {
    additions: number;
    deletions: number;
    unchanged: number;
    changePercentage: number;
  } {
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (const [operation, text] of diffs) {
      const length = text.length;
      if (operation === 1) {
        // DIFF_INSERT
        additions += length;
      } else if (operation === -1) {
        // DIFF_DELETE
        deletions += length;
      } else {
        // DIFF_EQUAL
        unchanged += length;
      }
    }

    const total = additions + deletions + unchanged;
    const changePercentage = total > 0 ? ((additions + deletions) / total) * 100 : 0;

    return {
      additions,
      deletions,
      unchanged,
      changePercentage: Math.round(changePercentage * 100) / 100,
    };
  }
}
