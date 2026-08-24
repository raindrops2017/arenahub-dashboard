import api from "./apiClient";
import { Amenities } from "../../types";

export interface CreateAmenitiesPayload {
  venueId: string;
  Parking?: boolean;
  Cafeteria?: boolean;
  Shower?: boolean;
  ChangingRoom?: boolean;
  Toilets?: boolean;
  WiFi?: boolean;
  Lockers?: boolean;
  FloodLights?: boolean;
  DrinkingWater?: boolean;
  FirstAid?: boolean;
  PrayerArea?: boolean;
  EquipmentRental?: boolean;
}

export const amenitiesApi = {
  create: async (payload: CreateAmenitiesPayload): Promise<Amenities> => {
    const res = await api.post<any>("/amenities", payload);
    return res?.data || res;
  },

  findAll: async (): Promise<Amenities[]> => {
    const res = await api.get<any[]>("/amenities");
    return Array.isArray(res) ? res : [];
  },

  findByVenueId: async (venueId: string): Promise<Amenities> => {
    const res = await api.get<any>(`/amenities/venue/${venueId}`);
    return res?.data || res;
  },

  findOne: async (id: string): Promise<Amenities> => {
    const res = await api.get<any>(`/amenities/${id}`);
    return res?.data || res;
  },

  update: async (id: string, payload: Partial<CreateAmenitiesPayload>): Promise<Amenities> => {
    const res = await api.patch<any>(`/amenities/${id}`, payload);
    return res?.data || res;
  },

  remove: async (id: string): Promise<any> => {
    return api.delete<any>(`/amenities/${id}`);
  },
};

export default amenitiesApi;
