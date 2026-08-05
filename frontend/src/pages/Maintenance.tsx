import { useEffect, useState } from 'react';
import { Wrench, Globe, Mail } from 'lucide-react';

interface MaintenanceProps {
  message?: string;
}

export default function Maintenance({ message }: MaintenanceProps) {
  const currentYear = new Date().getFullYear();
  const displayMessage = message || 'Sistemimizde güncelleme ve iyileştirme çalışmaları yapılmaktadır. En kısa sürede yeniden hizmetinizde olacağız. Anlayışınız için teşekkür ederiz.';

  // Bu sayfa provider'ların dışında render edildiği için mağaza bilgisini kendisi çeker
  const [store, setStore] = useState<{ name: string; email: string }>({ name: 'Mağaza', email: '' });
  useEffect(() => {
    fetch('/api/company-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.data) setStore({ name: j.data.name || 'Mağaza', email: j.data.email || '' }); })
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-espresso-900 px-6 py-12 text-cream-100 selection:bg-primary selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-espresso-800/50 via-espresso-900 to-espresso-900" />
      <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/5 blur-[100px]" />

      {/* Main Content Card */}
      <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        {/* Animated Icon Container */}
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-espresso-800 border border-espresso-700 shadow-2xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/10 to-indigo-500/10 opacity-50" />
          <Wrench className="h-10 w-10 text-primary animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>

        {/* Company Logo or Name */}
        <span className="mb-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {store.name}
        </span>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Şu Anda Bakımdayız
        </h1>

        {/* Decorative Divider */}
        <div className="my-6 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-indigo-500" />

        {/* Custom Admin Announcement Message */}
        <p className="mb-10 text-lg leading-relaxed text-cream-300">
          {displayMessage}
        </p>

        {/* Contact/Social Links */}
        <div className="flex items-center justify-center gap-4 border-t border-espresso-800 pt-8 w-full">
          {store.email && (
            <a
              href={`mailto:${store.email}`}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-espresso-800 border border-espresso-700 hover:border-primary hover:text-primary transition-all duration-300"
              title="E-posta Gönder"
            >
              <Mail className="h-4 w-4" />
            </a>
          )}
          <a
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-espresso-800 border border-espresso-700 hover:border-primary hover:text-primary transition-all duration-300"
            title="Web Sitesi"
          >
            <Globe className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="absolute bottom-8 text-center text-xs text-espresso-500">
        <p>© {currentYear} {store.name}. Tüm hakları saklıdır.</p>
      </div>
    </div>
  );
}
