import { api } from './api';

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  categoryName?: string;
  source?: string;
  staffId?: string;
  includeExtras?: boolean;
  includeSummary?: boolean;
}

async function downloadBlob(url: string, filters: ExportFilters, mimeType: string, extension: string) {
  const response = await api.post(url, filters, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: mimeType });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `expenses-${Date.now()}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export const exportCsv = (filters: ExportFilters) => downloadBlob('/export/csv', filters, 'text/csv', 'csv');
export const exportXlsx = (filters: ExportFilters) =>
  downloadBlob('/export/xlsx', filters, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx');
export const exportPdf = (filters: ExportFilters) => downloadBlob('/export/pdf', filters, 'application/pdf', 'pdf');
