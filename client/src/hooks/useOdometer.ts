import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOdometerReadings, createOdometerReading } from '@/lib/api';

export function useOdometerReadings() {
  return useQuery({
    queryKey: ['odometer'],
    queryFn: getOdometerReadings,
  });
}

export function useCreateOdometerReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOdometerReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odometer'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
