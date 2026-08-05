import { useState, useEffect } from 'react';
import { API_BASE } from './api';

// Mağaza adını public /company-info ucundan çeker (kurulumda girilen değer).
// Modül seviyesinde cache'lenir; her bileşende tekrar istek atılmaz.
let cached: string | null = null;

export function useStoreName(): string {
  const [name, setName] = useState<string>(cached ?? 'Yönetim Paneli');

  useEffect(() => {
    if (cached) return;
    fetch(`${API_BASE}/company-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const n = j?.data?.name;
        if (n) { cached = n; setName(n); }
      })
      .catch(() => {});
  }, []);

  return name;
}
