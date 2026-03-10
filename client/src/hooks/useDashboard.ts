import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/lib/api';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60_000, // refresh every minute
  });
}
