import api from "./apiClient";
import { Venue, SportsType } from "../../types";

export interface GetVenuesQuery {
  sportsType?: string;
}

export function formatHour(hour: number): string {
  const h = hour % 24;
  const ampm = h >= 12 && h < 24 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayHour).padStart(2, "0")}:00 ${ampm}`;
}

export function resolveVenueImageUrl(url?: string): string {
  if (!url) {
    return "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80";
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/+$/, "");
  return `${API_ORIGIN}/${url.replace(/^\/+/, "")}`;
}

export function normalizeVenue(raw: any): Venue {
  if (!raw) return raw;
  const id = raw._id || raw.id || "";
  const venueName = raw.venueName || raw.name || "Untitled Venue";
  const sportsType = Array.isArray(raw.sportsType)
    ? raw.sportsType
    : Array.isArray(raw.sportsTypes)
    ? raw.sportsTypes
    : ["5-A-SIDE"];
  const address = raw.address || "";
  const locationAlt = Number(raw.locationAlt ?? raw.coordinates?.lat ?? 30.0444);
  const locationLang = Number(raw.locationLang ?? raw.coordinates?.lng ?? 31.2357);
  const rawImages = Array.isArray(raw.images) ? raw.images : Array.isArray(raw.imageUrls) ? raw.imageUrls : [];
  const images = rawImages.map((img: string) => resolveVenueImageUrl(img));
  const startWorkingHours = Number(raw.startWorkingHours ?? 8);
  const endWorkingHours = Number(raw.endWorkingHours ?? 24);
  const defaultHourPrice = Number(raw.defaultHourPrice ?? raw.defaultHourlyPrice ?? raw.pricing?.defaultPricePerHour ?? 250);
  const isActive = raw.isActive !== false && raw.status !== "Inactive";

  // Amenities normalized
  const amenities = raw.amenities || {};

  return {
    ...raw,
    _id: id,
    id: id,
    venueName: venueName,
    name: venueName,
    sportsType: sportsType,
    sportsTypes: sportsType as SportsType[],
    address: address,
    locationAlt: locationAlt,
    locationLang: locationLang,
    coordinates: { lat: locationAlt, lng: locationLang },
    images: images,
    imageUrls: images,
    imageGallery: images,
    amenities: amenities,
    startWorkingHours: startWorkingHours,
    endWorkingHours: endWorkingHours,
    WorkingHours: endWorkingHours - startWorkingHours,
    workingHours: {
      openTime: formatHour(startWorkingHours),
      closeTime: formatHour(endWorkingHours),
      daysOpen: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    defaultHourPrice: defaultHourPrice,
    defaultHourlyPrice: defaultHourPrice,
    pricing: {
      defaultPricePerHour: defaultHourPrice,
      currency: "EGP",
      customHourlyRates: raw.customHourPrices || raw.pricing?.customHourlyRates || [],
    },
    customHourPrices: raw.customHourPrices || [],
    customHourlyPrices: raw.customHourPrices || [],
    isActive: isActive,
    status: isActive ? "Active" : "Inactive",
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const venueApi = {
  getAllVenues: async (query?: GetVenuesQuery): Promise<Venue[]> => {
    const list = await api.get<any[]>("/venue", query);
    if (!Array.isArray(list)) return [];
    return list.map(normalizeVenue);
  },

  getVenueById: async (id: string): Promise<Venue> => {
    const data = await api.get<any>(`/venue/${id}`);
    return normalizeVenue(data);
  },

  createVenue: async (formData: FormData | Record<string, any>): Promise<Venue> => {
    const data = await api.post<any>("/venue", formData);
    return normalizeVenue(data);
  },

  updateVenue: async (id: string, formData: FormData | Record<string, any>): Promise<Venue> => {
    const data = await api.patch<any>(`/venue/${id}`, formData);
    return normalizeVenue(data);
  },

  deleteVenue: async (id: string): Promise<Venue> => {
    const data = await api.delete<any>(`/venue/${id}`);
    return normalizeVenue(data);
  },
};

export default venueApi;
