import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOdometerReading } from '@/lib/api';

export function useCreateOdometerReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOdometerReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
