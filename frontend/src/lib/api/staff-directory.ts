import { apiClient } from './client';

export interface DirectoryUnit { id: number; name: string; staffCount: number }
export interface DirectoryStaff {
  key: string;
  name: string;
  position: string | null;
  hasAccount: boolean;
  units: Array<{ id: number; name: string }>;
}
export interface StaffDirectoryResult {
  data: DirectoryStaff[];
  units: DirectoryUnit[];
  page: number;
  limit: number;
  total: number;
}
export const staffDirectoryApi = {
  list: async (params: { page?: number; limit?: number; search?: string; unitId?: number }): Promise<StaffDirectoryResult> => {
    const response = await apiClient.get<StaffDirectoryResult>('/users/unit-directory', { params });
    return response.data;
  },
};
