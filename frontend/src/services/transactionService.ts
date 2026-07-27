import { api } from './api';
import type { PaginationMeta, Transaction } from '@/types';

export interface TransactionFilters {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  source?: string;
  status?: string;
  staffId?: string;
  search?: string;
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const { data } = await api.get<{ transactions: Transaction[]; pagination: PaginationMeta }>('/transactions', {
    params: filters,
  });
  return data;
}

export async function getTransaction(id: string) {
  const { data } = await api.get<{ transaction: Transaction }>(`/transactions/${id}`);
  return data.transaction;
}

export async function createTransaction(formData: FormData) {
  const { data } = await api.post<{ transaction: Transaction }>('/transactions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.transaction;
}

export async function updateTransaction(id: string, formData: FormData) {
  const { data } = await api.put<{ transaction: Transaction }>(`/transactions/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.transaction;
}

export async function deleteTransaction(id: string) {
  const { data } = await api.delete(`/transactions/${id}`);
  return data;
}

export async function enrichTransaction(id: string, formData: FormData) {
  const { data } = await api.post<{ transaction: Transaction }>(`/transactions/${id}/enrich`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.transaction;
}
