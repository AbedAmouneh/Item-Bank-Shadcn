import { apiRequest } from './client';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body?: string;
  entity_type?: string;
  entity_id?: number;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<Notification[]> {
  const envelope = await apiRequest<Envelope<Notification[]>>('/notifications');
  return envelope.data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const envelope = await apiRequest<Envelope<{ count: number }>>('/notifications/unread-count');
  return envelope.data;
}

export async function markAsRead(id: number): Promise<void> {
  await apiRequest<unknown>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllAsRead(): Promise<void> {
  await apiRequest<unknown>('/notifications/read-all', { method: 'PATCH' });
}
