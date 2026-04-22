import { apiClient } from './client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface Document {
  id: string;
  title: string;
  document_type: string;
  period: string;
  year: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  compliance_status?: 'pending' | 'compliant' | 'non_compliant' | 'needs_revision';
  latest_review_remarks?: string | null;
  is_linked?: boolean;
  linked_count?: number;
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
    role?: 'super_admin' | 'compliance_officer' | string;
  };
  versions?: DocumentVersion[];
  issuances?: Array<{ id: string; issuance_number: string; title: string }>;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentReference {
  id: string;
  source_document_id: string;
  target_document_id: string;
  relationship_type: string;
  created_at: string;
  source_document?: Document;
  target_document?: Document;
}

export interface DocumentReferenceResponse {
  outgoing: DocumentReference[];
  incoming: DocumentReference[];
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
  unit_id?: string;
  reportorial_doc_type_id?: number;
  file: File;
}

export interface UploadGoogleDocRequest {
  title: string;
  document_type: string;
  period: string;
  year: string;
  unit_id?: string;
  reportorial_doc_type_id?: number;
  google_doc_url: string;
  file_name?: string;
}

export interface UploadOption {
  assignment_id: string;
  unit_id: number;
  unit_name?: string;
  document_type: string;
  report_name?: string;
  submission_frequency: 'monthly' | 'quarterly' | 'annual' | 'custom';
  expected_file_name?: string;
}

export interface DocumentAssignment {
  id: string;
  user_id: number;
  unit_id: number;
  document_type: string;
  report_name?: string;
  filename_prefix?: string;
  submission_frequency: 'monthly' | 'quarterly' | 'annual' | 'custom';
  submission_month?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  unit?: {
    id: number;
    name: string;
  };
}

export interface ListDocumentsParams {
  title?: string;
  unit_id?: string;
  document_type?: string;
  period?: string;
  year?: string;
  status?: 'pending' | 'processing' | 'ready' | 'failed';
  page?: number;
  limit?: number;
  /** Focal only: return soft-deleted (archived) documents */
  archived?: boolean;
}

export interface ListDocumentsResponse {
  data: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface RepositoryBucket {
  key: string;
  label: string;
  count: number;
  documents: Document[];
}

export interface RepositoryYear {
  year: string;
  buckets: RepositoryBucket[];
}

export interface RepositoryResponse {
  years: RepositoryYear[];
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
    if (data.unit_id) {
      formData.append('unit_id', data.unit_id);
    }
    if (data.reportorial_doc_type_id != null) {
      formData.append('reportorial_doc_type_id', String(data.reportorial_doc_type_id));
    }
    formData.append('file', data.file);

    const response = await apiClient.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  uploadGoogleDoc: async (data: UploadGoogleDocRequest): Promise<Document> => {
    const response = await apiClient.post('/documents/google-doc', data);
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

  downloadVersionBlob: async (
    documentId: string,
    versionId: string,
  ): Promise<{ blob: Blob; fileName: string }> => {
    const response = await apiClient.get(
      `/documents/${documentId}/versions/${versionId}/download`,
      { responseType: 'blob' },
    );

    const disposition =
      response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'] || '';
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    const fileName = match?.[1] || `document-${versionId}`;

    return { blob: response.data, fileName };
  },

  /**
   * Get preview URL for a version
   */
  getPreviewUrl: (documentId: string, versionId: string): string => {
    return `${API_URL}/documents/${documentId}/versions/${versionId}/preview`;
  },

  /**
   * Get preview as authenticated blob URL for inline viewers.
   * Returns the blob URL and the content MIME type so viewers can render correctly.
   */
  getPreviewBlobUrl: async (
    documentId: string,
    versionId: string,
  ): Promise<{ blobUrl: string; mimeType: string }> => {
    const response = await apiClient.get(
      `/documents/${documentId}/versions/${versionId}/preview`,
      { responseType: 'blob' },
    );
    const mimeType: string =
      (response.headers['content-type'] as string | undefined)?.split(';')[0]?.trim() ||
      'application/pdf';
    return { blobUrl: URL.createObjectURL(response.data as Blob), mimeType };
  },

  /**
   * Delete a document
   */
  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  returnDocument: async (id: string, remarks: string): Promise<void> => {
    await apiClient.post(`/documents/${id}/return`, { remarks });
  },

  archiveDocument: async (id: string): Promise<void> => {
    await apiClient.post(`/documents/${id}/archive`);
  },

  reprocessDocument: async (id: string): Promise<void> => {
    await apiClient.post(`/documents/${id}/reprocess`);
  },

  getDocumentReferences: async (documentId: string): Promise<DocumentReferenceResponse> => {
    const response = await apiClient.get(`/documents/${documentId}/references`);
    return response.data;
  },

  linkDocumentReference: async (
    documentId: string,
    targetDocumentId: string,
    relationshipType?: string,
  ): Promise<DocumentReference> => {
    const response = await apiClient.post(`/documents/${documentId}/references`, {
      target_document_id: targetDocumentId,
      relationship_type: relationshipType,
    });
    return response.data;
  },

  unlinkDocumentReference: async (
    documentId: string,
    targetDocumentId: string,
  ): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}/references/${targetDocumentId}`);
  },

  listDocumentTypes: async (): Promise<string[]> => {
    const response = await apiClient.get('/documents/types');
    return response.data;
  },

  getUploadOptions: async (period: string, year: string): Promise<UploadOption[]> => {
    const response = await apiClient.get('/documents/upload-options', {
      params: { period, year },
    });
    return response.data;
  },

  listAssignments: async (params?: {
    user_id?: number;
    unit_id?: number;
    active_only?: boolean;
  }): Promise<DocumentAssignment[]> => {
    const response = await apiClient.get('/documents/assignments', { params });
    return response.data;
  },

  createAssignment: async (payload: {
    user_id: number;
    unit_id: number;
    document_type: string;
    report_name?: string;
    filename_prefix?: string;
    submission_frequency?: 'monthly' | 'quarterly' | 'annual' | 'custom';
    submission_month?: number;
    is_active?: boolean;
  }): Promise<DocumentAssignment> => {
    const response = await apiClient.post('/documents/assignments', payload);
    return response.data;
  },

  updateAssignment: async (
    id: string,
    payload: Partial<{
      unit_id: number;
      document_type: string;
      report_name?: string;
      filename_prefix?: string;
      submission_frequency?: 'monthly' | 'quarterly' | 'annual' | 'custom';
      submission_month?: number;
      is_active?: boolean;
    }>,
  ): Promise<DocumentAssignment> => {
    const response = await apiClient.patch(`/documents/assignments/${id}`, payload);
    return response.data;
  },

  deleteAssignment: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/assignments/${id}`);
  },

  /**
   * Get all documents grouped by year and period bucket (repository view)
   */
  getRepository: async (): Promise<RepositoryResponse> => {
    const response = await apiClient.get('/documents/repository');
    return response.data;
  },
};
