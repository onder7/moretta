import { api } from '@/services/api';

export async function initAnalytics(): Promise<void> {
  try {
    const res = await api.get<{ success: boolean; data: { analyticsCode?: string } }>('/config/public');
    const code = res.data?.data?.analyticsCode;
    if (code && code.trim()) {
      const fragment = document.createRange().createContextualFragment(code);
      document.head.appendChild(fragment);
      console.log('Analytics loaded.');
    }
  } catch (err) {
    console.error('Failed to load analytics config:', err);
  }
}
