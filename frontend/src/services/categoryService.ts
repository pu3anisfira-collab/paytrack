import { api } from './api';
import type { Category, CategoryField } from '@/types';

export async function getCategories(includeInactive = false) {
  const { data } = await api.get<{ categories: Category[] }>('/categories', { params: { includeInactive } });
  return data.categories;
}

export async function getCategoryFields(categoryId: string) {
  const { data } = await api.get<{ fields: CategoryField[] }>(`/categories/${categoryId}/fields`);
  return data.fields;
}

export async function createCategory(payload: Partial<Category>) {
  const { data } = await api.post<{ category: Category }>('/categories', payload);
  return data.category;
}

export async function updateCategory(id: string, payload: Partial<Category>) {
  const { data } = await api.put<{ category: Category }>(`/categories/${id}`, payload);
  return data.category;
}

export async function deleteCategory(id: string) {
  const { data } = await api.delete(`/categories/${id}`);
  return data;
}

export async function addCategoryField(categoryId: string, payload: Partial<CategoryField>) {
  const { data } = await api.post<{ field: CategoryField }>(`/categories/${categoryId}/fields`, payload);
  return data.field;
}

export async function deleteCategoryField(categoryId: string, fieldId: string) {
  const { data } = await api.delete(`/categories/${categoryId}/fields/${fieldId}`);
  return data;
}
