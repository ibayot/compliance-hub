import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
    lastName: string;
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
    token: string,
  ): Promise<ManualReview> => {
    const response = await axios.post(`${API_URL}/documents/${documentId}/reviews`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getLatestReview: async (documentId: string, token: string): Promise<ManualReview | null> => {
    try {
      const response = await axios.get(`${API_URL}/documents/${documentId}/reviews/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  getReviewHistory: async (documentId: string, token: string): Promise<ManualReview[]> => {
    const response = await axios.get(`${API_URL}/documents/${documentId}/reviews`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getEvidenceReport: async (documentId: string, token: string): Promise<EvidenceReport> => {
    const response = await axios.get(`${API_URL}/documents/${documentId}/reviews/evidence-report`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

// Comparisons API
export const comparisonsApi = {
  compareVersions: async (data: CompareVersionsDto, token: string): Promise<VersionComparison> => {
    const response = await axios.post(`${API_URL}/comparisons`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getComparison: async (comparisonId: string, token: string): Promise<VersionComparison> => {
    const response = await axios.get(`${API_URL}/comparisons/${comparisonId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getDocumentComparisons: async (
    documentId: string,
    token: string,
  ): Promise<VersionComparison[]> => {
    const response = await axios.get(`${API_URL}/comparisons/document/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
