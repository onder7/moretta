import { useEffect, useRef, useState } from 'react';

// Build-time fallback (Vite). Runtime'da /api/config/public ile override edilir.
const BUILD_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface Props {
  /** Buton metni: girişte 'signin_with', kayıtta 'signup_with' */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  /** Google'dan dönen ID token ile çağrılır */
  onCredential: (idToken: string) => void;
}

/**
 * Google Identity Services (GSI) resmi giriş butonu.
 * Client ID önce backend'den (env > admin panel) çekilir, yoksa build-time değere düşer.
 * Hiçbir değer yoksa hiçbir şey render edilmez. GSI script'i index.html'de async yüklenir.
 */
export function GoogleSignInButton({ text = 'continue_with', onCredential }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // callback referansını sabit tut (yeniden init tetiklememek için)
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;

  const [clientId, setClientId] = useState<string>(BUILD_CLIENT_ID || '');

  // Runtime config — admin panelinden veya .env'den çözülen Client ID
  useEffect(() => {
    let cancelled = false;
    fetch('/api/config/public')
      .then((r) => r.json())
      .then((d) => {
        const id = d?.data?.googleClientId as string | undefined;
        if (!cancelled && id) setClientId(id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;
      const g = (window as any).google;
      if (!g?.accounts?.id || !containerRef.current) {
        // GSI script henüz yüklenmedi — kısa süre sonra tekrar dene
        window.setTimeout(tryInit, 200);
        return;
      }

      g.accounts.id.initialize({
        client_id: clientId,
        callback: (resp: { credential?: string }) => {
          if (resp?.credential) cbRef.current(resp.credential);
        },
      });

      containerRef.current.innerHTML = '';
      g.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'rectangular',
        logo_alignment: 'center',
        locale: 'tr',
        width: 320,
      });
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) return null;
  return <div ref={containerRef} className="flex justify-center [&>div]:!w-full" />;
}
