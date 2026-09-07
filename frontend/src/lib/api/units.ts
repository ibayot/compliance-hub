import { apiClient } from './client';

export interface Unit {
  id: number;
  name: string;
  description?: string;
  active?: boolean;
  hasReportorialRequirements?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateUnitRequest {
  name: string;
  description?: string;
  hasReportorialRequirements?: boolean;
}

export interface UpdateUnitRequest {
  name?: string;
  description?: string;
  hasReportorialRequirements?: boolean;
}

export interface ListUnitsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListUnitsResponse {
  data: Unit[];
  total: number;
  page: number;
  limit: number;
}

export const unitsApi = {
  /**
   * List units
   */
  listUnits: async (params?: ListUnitsParams): Promise<ListUnitsResponse> => {
    const response = await apiClient.get('/units', { params });
    const responseData = response.data as Unit[] | ListUnitsResponse;

    if (!Array.isArray(responseData)) {
      return responseData;
    }

    const data = responseData;

    return {
      data,
      total: data.length,
      page: params?.page || 1,
      limit: params?.limit || data.length,
    };
  },

  listAll: async (): Promise<Unit[]> => {
    const response = await apiClient.get('/units');
    return response.data;
  },

  /**
   * Get unit by ID
   */
  getUnit: async (id: number): Promise<Unit> => {
    const response = await apiClient.get(`/units/${id}`);
    return response.data;
  },

  /**
   * Create a new unit
   */
  createUnit: async (data: CreateUnitRequest): Promise<Unit> => {
    const response = await apiClient.post('/units', data);
    return response.data;
  },

  /**
   * Update a unit
   */
  updateUnit: async (id: number, data: UpdateUnitRequest): Promise<Unit> => {
    const response = await apiClient.patch(`/units/${id}`, data);
    return response.data;
  },

  /**
   * Delete a unit
   */
  deleteUnit: async (id: number): Promise<void> => {
    await apiClient.delete(`/units/${id}`);
  },
};
