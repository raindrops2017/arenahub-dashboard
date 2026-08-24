import api from "./apiClient";
import { Advertisement, PaginatedResult } from "../../types";

export interface QueryAdvertisementParams {
  page?: number;
  limit?: number;
  status?: string;
  position?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const advertisementApi = {
  /**
   * Retrieves paginated list of advertisements for admin dashboard management.
   */
  findAll: async (params?: QueryAdvertisementParams): Promise<PaginatedResult<Advertisement> | Advertisement[]> => {
    const res = await api.get<any>("/advertisements", params);
    return res?.data || res;
  },

  /**
   * Retrieves active advertisements for specific positions.
   */
  getDashboardAds: async (position?: string): Promise<Advertisement[]> => {
    const res = await api.get<any>("/advertisements/dashboard", position ? { position } : undefined);
    return Array.isArray(res) ? res : res?.data || [];
  },

  /**
   * Retrieves a single advertisement record by ID.
   */
  findOne: async (id: string): Promise<Advertisement> => {
    const res = await api.get<any>(`/advertisements/${id}`);
    return res?.data || res;
  },

  /**
   * Creates a new advertisement with image upload (FormData).
   */
  create: async (formData: FormData): Promise<Advertisement> => {
    const res = await api.post<any>("/advertisements", formData);
    return res?.data || res;
  },

  /**
   * Updates an existing advertisement details or replaces image.
   */
  update: async (id: string, payload: FormData | any): Promise<Advertisement> => {
    const res = await api.patch<any>(`/advertisements/${id}`, payload);
    return res?.data || res;
  },

  /**
   * Updates the status of an advertisement.
   */
  updateStatus: async (id: string, status: string): Promise<Advertisement> => {
    const res = await api.patch<any>(`/advertisements/${id}/status`, { status });
    return res?.data || res;
  },

  /**
   * Updates the priority order of an advertisement.
   */
  updatePriority: async (id: string, priority: number): Promise<Advertisement> => {
    const res = await api.patch<any>(`/advertisements/${id}/priority`, { priority });
    return res?.data || res;
  },

  /**
   * Deletes an advertisement.
   */
  remove: async (id: string): Promise<any> => {
    return api.delete<any>(`/advertisements/${id}`);
  },
};

export default advertisementApi;
