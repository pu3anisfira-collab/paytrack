import type { Category } from '@/types';

/** Flattens the parent/child category tree into a single list, preserving order. */
export function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  function walk(list: Category[]) {
    list.forEach((cat) => {
      result.push(cat);
      if (cat.children?.length) walk(cat.children);
    });
  }
  walk(categories);
  return result;
}
