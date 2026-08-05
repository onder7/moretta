import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface ContactMsg {
  id: string;
  name: string;
  email: string;
  subject?: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
  user?: {
    email: string;
    profile?: { firstName?: string; lastName?: string; avatarUrl?: string | null } | null;
  } | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa önce`;
  return `${Math.floor(hours / 24)}g önce`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-meta-3/20 text-meta-3',
  'bg-meta-6/20 text-meta-6',
  'bg-meta-8/20 text-meta-8',
  'bg-meta-5/20 text-meta-5',
];

const DropdownMessage = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(() => {
    api
      .get<{ success: boolean; data: { messages: ContactMsg[]; unreadCount: number } }>('/admin/messages')
      .then((r) => {
        setMessages(r.data.messages);
        setUnreadCount(r.data.unreadCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 90000);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = (msg: ContactMsg) => {
    if (!msg.isRead) {
      api.put(`/admin/messages/${msg.id}/read`, {}).catch(() => {});
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
      >
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 z-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-meta-1 px-0.5 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
            <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75" />
          </span>
        )}
        <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M10.9688 1.57495H7.03135C3.43135 1.57495 0.506348 4.41558 0.506348 7.90308C0.506348 11.3906 2.75635 13.8375 8.26885 16.3125C8.40947 16.3687 8.52197 16.3968 8.6626 16.3968C8.85947 16.3968 9.02822 16.3406 9.19697 16.2281C9.47822 16.0593 9.64697 15.75 9.64697 15.4125V14.2031H10.9688C14.5688 14.2031 17.522 11.3625 17.522 7.87495C17.522 4.38745 14.5688 1.57495 10.9688 1.57495ZM10.9688 12.9937H9.3376C8.80322 12.9937 8.35322 13.4437 8.35322 13.9781V15.0187C3.6001 12.825 1.74385 10.8 1.74385 7.9312C1.74385 5.14683 4.10635 2.8687 7.03135 2.8687H10.9688C13.8657 2.8687 16.2563 5.14683 16.2563 7.9312C16.2563 10.7156 13.8657 12.9937 10.9688 12.9937Z" fill="" />
          <path d="M5.42812 7.28442C5.0625 7.28442 4.78125 7.56567 4.78125 7.9313C4.78125 8.29692 5.0625 8.57817 5.42812 8.57817C5.79375 8.57817 6.075 8.29692 6.075 7.9313C6.075 7.56567 5.79375 7.28442 5.42812 7.28442Z" fill="" />
          <path d="M9.00015 7.28442C8.63452 7.28442 8.35327 7.56567 8.35327 7.9313C8.35327 8.29692 8.63452 8.57817 9.00015 8.57817C9.33765 8.57817 9.64702 8.29692 9.64702 7.9313C9.64702 7.56567 9.33765 7.28442 9.00015 7.28442Z" fill="" />
          <path d="M12.5719 7.28442C12.2063 7.28442 11.925 7.56567 11.925 7.9313C11.925 8.29692 12.2063 8.57817 12.5719 8.57817C12.9375 8.57817 13.2188 8.29692 13.2188 7.9313C13.2188 7.56567 12.9094 7.28442 12.5719 7.28442Z" fill="" />
        </svg>
      </button>

      {open && (
        <div className="absolute -right-12 sm:right-0 mt-2.5 w-80 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark z-50">
          <div className="flex items-center justify-between px-4.5 py-3 border-b border-stroke dark:border-strokedark">
            <h5 className="text-sm font-semibold text-black dark:text-white">Müşteri Mesajları</h5>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {unreadCount} okunmamış
              </span>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-stroke dark:divide-strokedark">
            {messages.length === 0 ? (
              <li className="px-4.5 py-8 text-center">
                <svg className="mx-auto mb-2 text-gray-300" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                </svg>
                <p className="text-sm text-gray-400">Henüz mesaj yok</p>
              </li>
            ) : (
              messages.map((m, i) => {
                const colorCls = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const avatarUrl = m.user?.profile?.avatarUrl;
                return (
                  <li key={m.id}>
                    <Link
                      to={`/settings?tab=messages&messageId=${m.id}`}
                      onClick={() => {
                        handleMarkRead(m);
                        setOpen(false);
                      }}
                      className={`w-full flex items-start gap-3 px-4.5 py-3 text-left transition hover:bg-gray-2 dark:hover:bg-meta-4 ${
                        !m.isRead ? 'bg-primary/3' : ''
                      }`}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} className="h-10 w-10 flex-shrink-0 rounded-full object-cover" alt="" />
                      ) : (
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${colorCls}`}>
                          {initials(m.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-sm truncate ${!m.isRead ? 'font-semibold text-black dark:text-white' : 'font-medium text-black dark:text-white'}`}>
                            {m.name}
                          </span>
                          <span className="flex-shrink-0 text-[10px] text-gray-400">{timeAgo(m.createdAt)}</span>
                        </div>
                        {m.subject && (
                          <p className="text-xs text-gray-500 truncate">{m.subject}</p>
                        )}
                        <p className="mt-0.5 text-xs text-gray-400 truncate">{m.body}</p>
                      </div>
                      {!m.isRead && (
                        <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                      )}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-stroke dark:border-strokedark">
            <Link
              to="/settings?tab=messages"
              onClick={() => setOpen(false)}
              className="block px-4.5 py-3 text-center text-sm text-primary hover:bg-gray-2 dark:hover:bg-meta-4 font-medium"
            >
              Tüm Mesajları Gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownMessage;
