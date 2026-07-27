import { api } from './api';
import type { CategoryBreakdownItem, DashboardSummary, TrendPoint } from '@/types';

export async function getSummary() {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary');
  return data;
}

export async function getCategoryBreakdown(month?: number, year?: number, allTime?: boolean) {
  const { data } = await api.get<{ data: CategoryBreakdownItem[] }>('/dashboard/category-breakdown', {
    params: { month, year, allTime: allTime ? 1 : undefined },
  });
  return data.data;
}

export async function getTrend(period?: string) {
  const { data } = await api.get<{ trend: TrendPoint[] }>('/dashboard/trend', {
    params: { period },
  });
  return data.trend;
}

