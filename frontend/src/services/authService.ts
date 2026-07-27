import { api } from './api';
import type { User } from '@/types';

export async function login(identifier: string, password: string) {
  const { data } = await api.post<{ token: string; user: User }>('/auth/login', { identifier, password });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<{ user: User }>('/auth/me');
  return data.user;
}
