import type { Chat, Job, Message, Offer, User } from './types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: { user?: { id?: number; first_name?: string; username?: string; language_code?: string } };
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

const apiBase = import.meta.env.VITE_API_BASE || '/api';

export function authHeader(): string {
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) return `tma ${initData}`;
  const devId = localStorage.getItem('delolynk-dev-id') || '1001';
  localStorage.setItem('delolynk-dev-id', devId);
  return `dev ${devId}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  auth: () => request<User>('/auth/telegram', { method: 'POST', body: JSON.stringify({ dev_telegram_id: Number(localStorage.getItem('delolynk-dev-id') || 1001) }) }),
  me: () => request<User>('/me'),
  patchMe: (body: Partial<User>) => request<User>('/me', { method: 'PATCH', body: JSON.stringify(body) }),
  createDraft: (body: { category: string; description: string; city?: string; district: string; time_window: string; budget: string }) =>
    request<Job>('/jobs/draft', { method: 'POST', body: JSON.stringify(body) }),
  improveBrief: (jobId: number) => request<{ title: string; score: number; questions: string[]; structured_brief: Record<string, unknown>; missing_fields: string[] }>(`/jobs/${jobId}/brief`, { method: 'POST' }),
  publishJob: (jobId: number) => request<Job>(`/jobs/${jobId}/publish`, { method: 'POST' }),
  myJobs: () => request<Job[]>('/jobs/mine'),
  feed: () => request<Job[]>('/jobs/feed'),
  offers: (jobId: number) => request<Offer[]>(`/jobs/${jobId}/offers`),
  createOffer: (jobId: number, body: { price: string; eta: string; text: string }) => request<Offer>(`/jobs/${jobId}/offers`, { method: 'POST', body: JSON.stringify(body) }),
  selectOffer: (offerId: number) => request<Chat>(`/offers/${offerId}/select`, { method: 'POST' }),
  chats: () => request<Chat[]>('/chats'),
  messages: (chatId: number) => request<Message[]>(`/chats/${chatId}/messages`),
  sendMessage: (chatId: number, text: string) => request<Message>(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
};
