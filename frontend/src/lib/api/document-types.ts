import { apiClient } from './client';

export type SubmissionFrequency = 'monthly' | 'quarterly' | 'annual';

export interface ReportorialDocType {
  id: number;
  unit_id: number;
  base_name: string;
  display_name: string;
  description?: string;
  submission_frequency: SubmissionFrequency;
  active: boolean;
  unit?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface CreateReportorialDocTypePayload {
  unit_id: number;
  base_name: string;
  display_name: string;
  description?: string;
  submission_frequency: SubmissionFrequency;
}

export interface UpdateReportorialDocTypePayload {
  base_name?: string;
  display_name?: string;
  description?: string;
  submission_frequency?: SubmissionFrequency;
  active?: boolean;
}

/** Compute period suffix client-side for preview (mirrors backend logic) */
export function computePeriodSuffix(frequency: SubmissionFrequency, ref: Date = new Date()): string {
  const year = ref.getFullYear();
  const month = ref.getMonth() + 1; // 1-based

  if (frequency === 'monthly') {
    return `${year}${String(month).padStart(2, '0')}`;
  }

  if (frequency === 'quarterly') {
    const quarter = Math.ceil(month / 3);
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return `${year}${String(startMonth).padStart(2, '0')}-${String(endMonth).padStart(2, '0')}`;
  }

  // annual
  return String(year);
}

/**
 * Compute period suffix from explicit integer inputs (for late submissions / period picker).
 * @param frequency  – monthly | quarterly | annual
 * @param opts.year    – full 4-digit year
 * @param opts.month   – 1-based month number (used for monthly)
 * @param opts.quarter – 1-based quarter number (used for quarterly)
 */
export function computePeriodSuffixExplicit(
  frequency: SubmissionFrequency,
  opts: { year: number; month?: number; quarter?: number },
): string {
  const { year, month = 1, quarter = 1 } = opts;

  if (frequency === 'monthly') {
    return `${year}${String(month).padStart(2, '0')}`;
  }

  if (frequency === 'quarterly') {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return `${year}${String(startMonth).padStart(2, '0')}-${String(endMonth).padStart(2, '0')}`;
  }

  // annual
  return String(year);
}

export function computeExpectedFilename(docType: ReportorialDocType, ref: Date = new Date()): string {
  const suffix = computePeriodSuffix(docType.submission_frequency, ref);
  return `${docType.base_name}_${suffix}`;
}

/**
 * Compute expected filename from explicit period picker values (for late submissions).
 */
export function computeExpectedFilenameExplicit(
  docType: ReportorialDocType,
  opts: { year: number; month?: number; quarter?: number },
): string {
  const suffix = computePeriodSuffixExplicit(docType.submission_frequency, opts);
  return `${docType.base_name}_${suffix}`;
}

export const docTypesApi = {
  fetchAll: async (): Promise<ReportorialDocType[]> => {
    const res = await apiClient.get('/document-types');
    return res.data;
  },

  byUnit: async (unitId: number): Promise<ReportorialDocType[]> => {
    const res = await apiClient.get('/document-types', { params: { unitId } });
    return res.data;
  },

  getOne: async (id: number): Promise<ReportorialDocType> => {
    const res = await apiClient.get(`/document-types/${id}`);
    return res.data;
  },

  create: async (payload: CreateReportorialDocTypePayload): Promise<ReportorialDocType> => {
    const res = await apiClient.post('/document-types', payload);
    return res.data;
  },

  update: async (id: number, payload: UpdateReportorialDocTypePayload): Promise<ReportorialDocType> => {
    const res = await apiClient.patch(`/document-types/${id}`, payload);
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/document-types/${id}`);
  },
};
