import { useQuery } from '@tanstack/react-query';

export function useTaxConfig() {
  const { data } = useQuery<{ taxRate: number } | null>({
    queryKey: ['tax-config'],
    queryFn: async () => {
      const res = await fetch('/api/tax-config');
      return res.ok ? (await res.json()).data : null;
    },
    staleTime: 1000 * 60 * 60,
  });
  return { taxRate: data?.taxRate ?? 20 };
}
