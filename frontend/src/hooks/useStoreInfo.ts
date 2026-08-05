import { useQuery } from '@tanstack/react-query';

// Mağaza kimliği tek kaynaktan: /api/company-info (kurulumda girilen general_ ayarları).
// Marka adı kodda sabit yazılmaz; her yerde bu hook kullanılır.

export interface StoreInfo {
  name: string;
  legalName: string;
  slogan: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  taxOffice: string;
  taxNumber: string;
  logoUrl: string;
}

const FALLBACK: StoreInfo = {
  name: 'Mağaza',
  legalName: 'Mağaza',
  slogan: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  taxOffice: '',
  taxNumber: '',
  logoUrl: '',
};

async function fetchStoreInfo(): Promise<StoreInfo> {
  const res = await fetch('/api/company-info');
  if (!res.ok) return FALLBACK;
  const json = await res.json();
  const d = json?.data ?? {};
  return {
    name: d.name || FALLBACK.name,
    legalName: d.legalName || d.name || FALLBACK.name,
    slogan: d.slogan || '',
    email: d.email || '',
    phone: d.phone || '',
    address: d.address || '',
    city: d.city || '',
    taxOffice: d.taxOffice || '',
    taxNumber: d.taxNumber || '',
    logoUrl: d.logoUrl || '',
  };
}

export function useStoreInfo(): StoreInfo {
  const { data } = useQuery({
    queryKey: ['store-info'],
    queryFn: fetchStoreInfo,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
  return data ?? FALLBACK;
}
