import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { FavoritePlace } from '@shared/types';

export function usePlaces() {
  return useQuery({ queryKey: ['places'], queryFn: api.getPlaces });
}

export function useCreatePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FavoritePlace>) => api.createPlace(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['places'] }),
  });
}

export function useUpdatePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FavoritePlace> }) => api.updatePlace(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['places'] }),
  });
}

export function useDeletePlace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePlace(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['places'] });
      qc.invalidateQueries({ queryKey: ['mileage'] });
    },
  });
}
