import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import DropdownMessage from './DropdownMessage';
import DropdownNotification from './DropdownNotification';
import DropdownUser from './DropdownUser';
import DarkModeSwitcher from './DarkModeSwitcher';

interface SearchResult {
  products: { id: string; name: string; images: { url: string }[]; variants: { sku: string; price: number | string }[] }[];
  orders: { id: string; status: string; total: number | string; createdAt: string; user: { email: string; profile?: { firstName?: string; lastName?: string } | null } }[];
  customers: { id: string; email: string; profile?: { firstName?: string; lastName?: string } | null }[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor', PROCESSING: 'İşleniyor', SHIPPED: 'Kargoda',
  DELIVERED: 'Teslim', CANCELLED: 'İptal', REFUNDED: 'İade',
};

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback((q: string) => {
    if (q.length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }
    setSearching(true);
    api
      .get<{ success: boolean; data: SearchResult }>(`/admin/search?q=${encodeURIComponent(q)}`)
      .then((r) => {
        setResults(r.data);
        setShowResults(true);
      })
      .catch(() => {})
      .finally(() => setSearching(false));
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasResults =
    results &&
    (results.products.length > 0 || results.orders.length > 0 || results.customers.length > 0);

  const handleNavigate = (path: string) => {
    setShowResults(false);
    setQuery('');
    navigate(path);
  };

  const customerDisplayName = (u: { email: string; profile?: { firstName?: string; lastName?: string } | null }) => {
    if (u.profile?.firstName) return `${u.profile.firstName} ${u.profile.lastName ?? ''}`.trim();
    return u.email;
  };

  return (
    <header className="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-3.5 shadow-2 md:px-6 2xl:px-11">

        {/* Left: Hamburger + Logo (mobile) */}
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="z-99999 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden"
          >
            <span className="relative block h-5.5 w-5.5 cursor-pointer">
              <span className="du-block absolute right-0 h-full w-full">
                <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-[0] duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && '!w-full delay-300'}`} />
                <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-150 duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && 'delay-400 !w-full'}`} />
                <span className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-200 duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && '!w-full delay-500'}`} />
              </span>
              <span className="absolute right-0 h-full w-full rotate-45">
                <span className={`absolute left-2.5 top-0 block h-full w-0.5 rounded-sm bg-black delay-300 duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && '!h-0 !delay-[0]'}`} />
                <span className={`delay-400 absolute left-0 top-2.5 block h-0.5 w-full rounded-sm bg-black duration-200 ease-in-out dark:bg-white ${!props.sidebarOpen && '!h-0 !delay-200'}`} />
              </span>
            </span>
          </button>

          <Link className="block flex-shrink-0 lg:hidden" to="/">
            <span className="text-lg font-bold text-white">MB</span>
          </Link>
        </div>

        {/* Center: Search */}
        <div ref={searchRef} className="relative hidden sm:block flex-1 max-w-md">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {searching ? (
                <svg className="animate-spin text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="fill-body dark:fill-bodydark" width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M9.16666 3.33332C5.945 3.33332 3.33332 5.945 3.33332 9.16666C3.33332 12.3883 5.945 15 9.16666 15C12.3883 15 15 12.3883 15 9.16666C15 5.945 12.3883 3.33332 9.16666 3.33332ZM1.66666 9.16666C1.66666 5.02452 5.02452 1.66666 9.16666 1.66666C13.3088 1.66666 16.6667 5.02452 16.6667 9.16666C16.6667 13.3088 13.3088 16.6667 9.16666 16.6667C5.02452 16.6667 1.66666 13.3088 1.66666 9.16666Z" fill="" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.2857 13.2857C13.6112 12.9603 14.1388 12.9603 14.4642 13.2857L18.0892 16.9107C18.4147 17.2362 18.4147 17.7638 18.0892 18.0892C17.7638 18.4147 17.2362 18.4147 16.9107 18.0892L13.2857 14.4642C12.9603 14.1388 12.9603 13.6112 13.2857 13.2857Z" fill="" />
                </svg>
              )}
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results && hasResults) setShowResults(true); }}
              placeholder="Ürün, sipariş veya müşteri ara..."
              className="w-full rounded-md border border-stroke bg-transparent py-2 pl-9 pr-4 text-sm text-black focus:border-primary focus:outline-none dark:border-strokedark dark:text-white dark:focus:border-primary"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults(null); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && query.length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 max-h-96 overflow-y-auto rounded-md border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark z-50">
              {!hasResults ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  "{query}" için sonuç bulunamadı
                </div>
              ) : (
                <div>
                  {/* Products */}
                  {results.products.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-meta-4">
                        Ürünler
                      </div>
                      {results.products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleNavigate(`/products/${p.id}`)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-meta-4 text-left"
                        >
                          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-stroke dark:border-strokedark bg-gray-100">
                            {p.images[0] ? (
                              <img src={p.images[0].url} className="h-full w-full object-cover" alt="" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-300">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">
                              {p.variants[0]?.sku ?? ''}
                              {p.variants[0]?.price && (
                                <> · ₺{Number(p.variants[0].price).toLocaleString('tr-TR')}</>
                              )}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Orders */}
                  {results.orders.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-meta-4">
                        Siparişler
                      </div>
                      {results.orders.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => handleNavigate(`/orders/${o.id}`)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-meta-4 text-left"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 2v6l2-2 2 2V2h4v6l2-2 2 2V2h2v20H4V2h2zm0 9v9h12v-9H6z"/>
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-black dark:text-white">
                                #{o.id.slice(-8).toUpperCase()}
                              </p>
                              <span className="text-xs text-gray-400">
                                ₺{Number(o.total).toLocaleString('tr-TR')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 truncate">
                              {customerDisplayName(o.user)} · {STATUS_LABELS[o.status] ?? o.status}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Customers */}
                  {results.customers.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-meta-4">
                        Müşteriler
                      </div>
                      {results.customers.map((c) => {
                        const name = customerDisplayName(c);
                        const ini = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <button
                            key={c.id}
                            onClick={() => handleNavigate(`/customers`)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-meta-4 text-left"
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-meta-3/15 text-meta-3 text-xs font-bold">
                              {ini}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-black dark:text-white truncate">{name}</p>
                              {c.profile?.firstName && (
                                <p className="text-xs text-gray-400 truncate">{c.email}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Icons + User */}
        <div className="flex items-center gap-3 2xsm:gap-5">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            <DarkModeSwitcher />
            <li><DropdownNotification /></li>
            <li><DropdownMessage /></li>
          </ul>
          <DropdownUser />
        </div>
      </div>
    </header>
  );
};

export default Header;
