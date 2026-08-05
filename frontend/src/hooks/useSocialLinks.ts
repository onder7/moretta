import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface SocialLinks {
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
  tiktok?: string;
}

export function useSocialLinks() {
  return useQuery({
    queryKey: ['social-links'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: SocialLinks }>('/social-links')
        .then((r) => r.data?.data ?? ({} as SocialLinks)),
    staleTime: 1000 * 60 * 10,
  });
}
