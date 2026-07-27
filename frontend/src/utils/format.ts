export function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(num || 0);
}

export function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function sourceLabel(source: string) {
  const map: Record<string, string> = {
    tng_import: 'TNG Import',
    staff_manual: 'Staff Manual',
    manager_manual: 'Manager Manual',
  };
  return map[source] || source;
}
