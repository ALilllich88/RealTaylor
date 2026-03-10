import axios from 'axios';
import { getToken, clearToken } from './auth';
import type {
  FavoritePlace, MileageEntry, HoursEntry, DashboardData,
  CalculateDistanceRequest, CalculateDistanceResponse,
} from '@shared/types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (pin: string) =>
  api.post<{ token: string }>('/auth/login', { pin }).then((r) => r.data);

// Places
export const getPlaces = () => api.get<FavoritePlace[]>('/places').then((r) => r.data);
export const createPlace = (data: Partial<FavoritePlace>) =>
  api.post<FavoritePlace>('/places', data).then((r) => r.data);
export const updatePlace = (id: string, data: Partial<FavoritePlace>) =>
  api.put<FavoritePlace>(`/places/${id}`, data).then((r) => r.data);
export const deletePlace = (id: string) =>
  api.delete<{ success: boolean; linkedTripsRemoved: number }>(`/places/${id}`).then((r) => r.data);
export const getPlaceUsage = (id: string) =>
  api.get<{ tripCount: number }>(`/places/${id}/usage`).then((r) => r.data);

// Mileage
export const getMileage = (params?: Record<string, string>) =>
  api.get<MileageEntry[]>('/mileage', { params }).then((r) => r.data);
export const createMileage = (data: Partial<MileageEntry>) =>
  api.post<MileageEntry>('/mileage', data).then((r) => r.data);
export const updateMileage = (id: string, data: Partial<MileageEntry>) =>
  api.put<MileageEntry>(`/mileage/${id}`, data).then((r) => r.data);
export const deleteMileage = (id: string) =>
  api.delete<{ success: boolean; autoHoursDeleted: boolean }>(`/mileage/${id}`).then((r) => r.data);
export const calculateDistance = (data: CalculateDistanceRequest) =>
  api.post<CalculateDistanceResponse>('/mileage/calculate-distance', data).then((r) => r.data);
export const getRecentTrips = () =>
  api.get<MileageEntry[]>('/mileage/recent-trips').then((r) => r.data);
export const suggestAddresses = (input: string) =>
  api.get<{ suggestions: string[] }>('/mileage/address-suggest', { params: { input } }).then((r) => r.data.suggestions);

// Hours
export const getHours = (params?: Record<string, string>) =>
  api.get<HoursEntry[]>('/hours', { params }).then((r) => r.data);
export const createHours = (data: Partial<HoursEntry>) =>
  api.post<HoursEntry>('/hours', data).then((r) => r.data);
export const updateHours = (id: string, data: Partial<HoursEntry>) =>
  api.put<HoursEntry>(`/hours/${id}`, data).then((r) => r.data);
export const deleteHours = (id: string) =>
  api.delete<{ success: boolean }>(`/hours/${id}`).then((r) => r.data);

// Dashboard
export const getDashboard = () => api.get<DashboardData>('/dashboard').then((r) => r.data);

// Reports — returns a download URL
export function reportUrl(type: 'hours' | 'mileage' | 'annual-summary', params: Record<string, string>): string {
  const token = getToken();
  const qs = new URLSearchParams({ ...params, format: params.format || 'pdf' }).toString();
  // For binary downloads we build the URL and use a hidden link
  return `/api/reports/${type}?${qs}&token=${token}`;
}

export async function downloadReport(
  type: 'hours' | 'mileage' | 'annual-summary',
  params: Record<string, string>,
  filename: string
): Promise<void> {
  const response = await api.get(`/reports/${type}`, {
    params,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default api;
