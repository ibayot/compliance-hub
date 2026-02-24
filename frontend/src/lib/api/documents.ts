import { apiClient } from './client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface Document {
  id: string;
  title: string;
  document_type: string;
  period: string;
  year: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  current_version: number;
  extracted_text?: string;
  unit_id: string;
  unit?: {
    id: string;
    name: string;
    code: string;
  };
  uploaded_by: string;
  uploader?: {
    id: string;
    username: string;
    email: string;
  };
  versions?: DocumentVersion[];
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  checksum: string;
  preview_path?: string;
  change_notes?: string;
  uploaded_by: string;
  uploader?: {
    id: string;
    username: string;
    email: string;
  };
  created_at: string;
}

export interface UploadDocumentRequest {
  title: string;
  document_type: string;
  period: string;
  year: string;
  unit_id: string;
  file: File;
}

export interface ListDocumentsParams {
  unit_id?: string;
  document_type?: string;
  period?: string;
  year?: string;
  status?: 'pending' | 'processing' | 'ready' | 'failed';
  page?: number;
  limit?: number;
}

export interface ListDocumentsResponse {
  data: Document[];
  total: number;
  page: number;
  limit: number;
}

export const documentsApi = {
  /**
   * Upload a new document
   */
  uploadDocument: async (data: UploadDocumentRequest): Promise<Document> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('document_type', data.document_type);
    formData.append('period', data.period);
    formData.append('year', data.year);
    formData.append('unit_id', data.unit_id);
    formData.append('file', data.file);

    const response = await apiClient.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * List documents with filters
   */
  listDocuments: async (
    params?: ListDocumentsParams,
  ): Promise<ListDocumentsResponse> => {
    const response = await apiClient.get('/documents', { params });
    return response.data;
  },

  /**
   * Get document by ID
   */
  getDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  /**
   * Get version history
   */
  getVersionHistory: async (documentId: string): Promise<DocumentVersion[]> => {
    const response = await apiClient.get(`/documents/${documentId}/versions`);
    return response.data;
  },

  /**
   * Create a new version
   */
  createVersion: async (
    documentId: string,
    file: File,
    changeNotes?: string,
  ): Promise<DocumentVersion> => {
    const formData = new FormData();
    formData.append('file', file);
    if (changeNotes) {
      formData.append('change_notes', changeNotes);
    }

    const response = await apiClient.post(
      `/documents/${documentId}/versions`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data;
  },

  /**
   * Get download URL for a version
   */
  getDownloadUrl: (documentId: string, versionId: string): string => {
    return `${API_URL}/documents/${documentId}/versions/${versionId}/download`;
  },

  /**
   * Get preview URL for a version
   */
  getPreviewUrl: (documentId: string, versionId: string): string => {
    return `${API_URL}/documents/${documentId}/versions/${versionId}/preview`;
  },

  /**
   * Get preview as authenticated blob URL for inline viewers
   */
  getPreviewBlobUrl: async (documentId: string, versionId: string): Promise<string> => {
    const response = await apiClient.get(
      `/documents/${documentId}/versions/${versionId}/preview`,
      { responseType: 'blob' },
    );
    return URL.createObjectURL(response.data);
  },

  /**
   * Delete a document
   */
  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
};
