import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { HoursEntry } from '@shared/types';

export function useHours(params?: Record<string, string>) {
  return useQuery({ queryKey: ['hours', params], queryFn: () => api.getHours(params) });
}

export function useCreateHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<HoursEntry>) => api.createHours(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hours'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HoursEntry> }) => api.updateHours(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hours'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteHours(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hours'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
