import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { MileageEntry } from '@shared/types';

export function useMileage(params?: Record<string, string>) {
  return useQuery({ queryKey: ['mileage', params], queryFn: () => api.getMileage(params) });
}

export function useRecentTrips() {
  return useQuery({ queryKey: ['mileage', 'recent-trips'], queryFn: api.getRecentTrips });
}

export function useCreateMileage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MileageEntry>) => api.createMileage(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mileage'] });
      qc.invalidateQueries({ queryKey: ['hours'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateMileage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MileageEntry> }) => api.updateMileage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mileage'] });
      qc.invalidateQueries({ queryKey: ['hours'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteMileage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMileage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mileage'] });
      qc.invalidateQueries({ queryKey: ['hours'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCalculateDistance() {
  return useMutation({
    mutationFn: ({ fromAddress, toAddress }: { fromAddress: string; toAddress: string }) =>
      api.calculateDistance({ fromAddress, toAddress }),
  });
}
