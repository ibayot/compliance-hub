import { apiClient } from './client';

export type ReviewDecision = 'compliant' | 'non_compliant' | 'needs_revision';

export interface ManualReview {
  id: string;
  document_id: string;
  version_id: string;
  decision: ReviewDecision;
  remarks?: string;
  findings?: Array<{
    category: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
  reviewer_id: number;
  reviewed_at: string;
  reviewer?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface SubmitReviewDto {
  decision: ReviewDecision;
  remarks?: string;
  findings?: Array<{
    category: string;
    description: string;
    severity?: 'low' | 'medium' | 'high';
  }>;
}

export const reviewsApi = {
  submitReview: async (documentId: string, data: SubmitReviewDto): Promise<ManualReview> => {
    const response = await apiClient.post(`/documents/${documentId}/reviews`, data);
    return response.data;
  },

  getLatestReview: async (documentId: string): Promise<ManualReview | null> => {
    try {
      const response = await apiClient.get(`/documents/${documentId}/reviews/latest`);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  getReviewHistory: async (documentId: string): Promise<ManualReview[]> => {
    const response = await apiClient.get(`/documents/${documentId}/reviews`);
    return response.data;
  },
};
