// Ortam-bağımsız API kökü: prod'da build arg ile '/api', dev'de localhost.
// Login/MFA gibi interceptor (401→refresh→redirect) istemeyen yerler de bunu kullanır.
export const API_BASE: string = import.meta.env.DEV ? 'http://localhost:5010/api' : '/api';

export function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

export function setToken(token: string) {
  localStorage.setItem('admin_token', token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('admin_refresh_token');
}

export function setRefreshToken(token: string) {
  localStorage.setItem('admin_refresh_token', token);
}

export function clearToken() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_refresh_token');
  localStorage.removeItem('admin_user');
}

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function flushQueue(token: string | null, err?: unknown) {
  pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(err)));
  pendingQueue = [];
}

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('no_refresh_token');

  const res = await fetch(`${API_BASE}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? 'refresh_failed');

  const newToken: string = json.data?.accessToken;
  setToken(newToken);
  return newToken;
}

async function uploadRequest<T>(path: string, file: File, retry = true): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401 && retry) {
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        pendingQueue.push({
          resolve: async () => {
            try { resolve(await uploadRequest<T>(path, file, false)); } catch (e) { reject(e); }
          },
          reject,
        });
      });
    }
    isRefreshing = true;
    try {
      const newToken = await doRefresh();
      flushQueue(newToken);
      return uploadRequest<T>(path, file, false);
    } catch (err) {
      flushQueue(null, err);
      clearToken();
      window.location.href = `${import.meta.env.BASE_URL}auth/signin`;
      throw new Error('Oturum süresi doldu, lütfen tekrar giriş yapın');
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
  return json;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401 && retry) {
    // Token süresi dolmuş — yenilemeyi dene
    if (isRefreshing) {
      // Diğer istek zaten yeniliyor, kuyruğa gir
      return new Promise<T>((resolve, reject) => {
        pendingQueue.push({
          resolve: async (newToken) => {
            try {
              resolve(await request<T>(path, init, false));
            } catch (e) {
              reject(e);
            }
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await doRefresh();
      flushQueue(newToken);
      return request<T>(path, init, false);
    } catch (err) {
      flushQueue(null, err);
      clearToken();
      window.location.href = `${import.meta.env.BASE_URL}auth/signin`;
      throw new Error('Oturum süresi doldu, lütfen tekrar giriş yapın');
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
  }
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => uploadRequest<T>(path, file),
};
