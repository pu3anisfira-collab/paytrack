import { api } from './api';
import type { ImportBatch, PaginationMeta } from '@/types';

export async function uploadTngFile(file: File, password?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (password) {
    formData.append('password', password);
  }
  const { data } = await api.post<{
    batch: ImportBatch;
    preview: Array<{ date: string; description: string; amount: number; paymentMode: string }>;
    parsedCount: number;
    errorCount: number;
  }>('/import/tng', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

export async function processImportBatch(batchId: string, password?: string) {
  const { data } = await api.post<{ batch: ImportBatch; createdCount: number }>(
    `/import/tng/${batchId}/process`,
    { password }
  );
  return data;
}

export async function getImportBatch(batchId: string) {
  const { data } = await api.get<{ batch: ImportBatch }>(`/import/tng/${batchId}`);
  return data.batch;
}

export async function getImportHistory(page = 1, pageSize = 20) {
  const { data } = await api.get<{ batches: ImportBatch[]; pagination: PaginationMeta }>('/import/tng/history', {
    params: { page, pageSize },
  });
  return data;
}
