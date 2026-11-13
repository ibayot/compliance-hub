import { apiClient } from '@/lib/api/client';

export enum ReviewDecision {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  NEEDS_REVISION = 'needs_revision',
}

export interface Finding {
  category: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface SubmitReviewDto {
  decision: ReviewDecision;
  remarks?: string;
  findings?: Finding[];
}

export interface ManualReview {
  id: string;
  document_id: string;
  version_id: string;
  decision: ReviewDecision;
  remarks?: string;
  findings?: Finding[];
  reviewer_id: string;
  reviewer?: {
    id: number;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
  };
  reviewed_at: string;
}

export interface CompareVersionsDto {
  version_a_id: string;
  version_b_id: string;
}

export interface VersionComparison {
  id: string;
  document_id: string;
  version_a_id: string;
  version_b_id: string;
  compared_by_id: string;
  diff_output: {
    diffs: any[];
    stats: {
      additions: number;
      deletions: number;
      unchanged: number;
      changePercentage: number;
    };
    htmlDiff: string;
  };
  compared_at: string;
  version_a?: any;
  version_b?: any;
  compared_by?: any;
}

export interface EvidenceReport {
  document: any;
  version: any;
  metrics: {
    results: any[];
    aggregate: any;
  };
  review: ManualReview | null;
}

// Reviews API
export const reviewsApi = {
  submitReview: async (
    documentId: string,
    data: SubmitReviewDto,
  ): Promise<ManualReview> => {
    const response = await apiClient.post(`/documents/${documentId}/reviews`, data);
    return response.data;
  },

  getLatestReview: async (documentId: string): Promise<ManualReview | null> => {
    try {
      const response = await apiClient.get(`/documents/${documentId}/reviews/latest`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  getReviewHistory: async (documentId: string): Promise<ManualReview[]> => {
    const response = await apiClient.get(`/documents/${documentId}/reviews`);
    return response.data;
  },

  getEvidenceReport: async (documentId: string): Promise<EvidenceReport> => {
    const response = await apiClient.get(`/documents/${documentId}/reviews/evidence-report`);
    return response.data;
  },
};

// Comparisons API
export const comparisonsApi = {
  compareVersions: async (data: CompareVersionsDto): Promise<VersionComparison> => {
    const response = await apiClient.post(`/comparisons`, data);
    return response.data;
  },

  getComparison: async (comparisonId: string): Promise<VersionComparison> => {
    const response = await apiClient.get(`/comparisons/${comparisonId}`);
    return response.data;
  },

  getDocumentComparisons: async (
    documentId: string,
  ): Promise<VersionComparison[]> => {
    const response = await apiClient.get(`/comparisons/document/${documentId}`);
    return response.data;
  },
};
