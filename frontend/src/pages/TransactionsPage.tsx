import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, FileText, Search, ClipboardEdit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { EnrichDialog } from '@/components/transactions/EnrichDialog';
import { getTransactions, deleteTransaction } from '@/services/transactionService';
import { getCategories } from '@/services/categoryService';
import { fileUrl } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { flattenCategories } from '@/utils/categoryTree';
import { formatCurrency, formatDate, sourceLabel } from '@/utils/format';
import type { Category, Transaction } from '@/types';

type BadgeTone = 'emerald' | 'blue' | 'teal' | 'orange' | 'purple' | 'navy' | 'gray' | 'red' | 'amber';

function getCategoryBadgeTone(name: string): BadgeTone {
  const lower = name.toLowerCase();
  if (lower.includes('mileage') || lower.includes('fuel') || lower.includes('travel')) return 'emerald';
  if (lower.includes('training') || lower.includes('course') || lower.includes('learning')) return 'blue';
  if (lower.includes('office') || lower.includes('supplies') || lower.includes('stationery') || lower.includes('mesra')) return 'orange';
  if (lower.includes('staff') || lower.includes('event') || lower.includes('team') || lower.includes('wages') || lower.includes('salary')) return 'purple';
  if (lower.includes('utilities') || lower.includes('utility') || lower.includes('electric') || lower.includes('water') || lower.includes('internet')) return 'teal';
  if (lower.includes('bonus') || lower.includes('incentive') || lower.includes('award') || lower.includes('hse')) return 'navy';
  return 'gray';
}


export function TransactionsPage() {
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'manager';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [source, setSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [enriching, setEnriching] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { transactions, pagination } = await getTransactions({
      page,
      pageSize: 15,
      search: search || undefined,
      categoryId: categoryId || undefined,
      source: source || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    setTransactions(transactions);
    setTotalPages(pagination.totalPages);
    setLoading(false);
  }, [page, search, categoryId, source, dateFrom, dateTo]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setFormOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    await deleteTransaction(id);
    load();
  }

  const flatCategories = flattenCategories(categories);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search description or staff…"
            className="pl-9 w-full"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} /> Add Expense
        </Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">Category</label>
            <Select className="w-full min-w-0" value={categoryId} onChange={(e) => { setPage(1); setCategoryId(e.target.value); }}>
              <option value="">All categories</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">Source</label>
            <Select className="w-full min-w-0" value={source} onChange={(e) => { setPage(1); setSource(e.target.value); }}>
              <option value="">All sources</option>
              <option value="tng_import">TNG Import</option>
              <option value="staff_manual">Staff Manual</option>
              <option value="manager_manual">Manager Manual</option>
            </Select>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">From Date</label>
            <Input type="date" className="w-full min-w-0" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">To Date</label>
            <Input type="date" className="w-full min-w-0" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState title="No transactions found" description="Try adjusting your filters, or add a new expense." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(t.date)}</td>
                    <td className="max-w-[220px] truncate px-4 py-3">{t.description}</td>
                    <td className="px-4 py-3">
                      {t.category
                        ? <Badge tone={getCategoryBadgeTone(t.category.name)}>{t.category.name}</Badge>
                        : <span className="text-text-light text-xs">Uncategorized</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={t.source === 'tng_import' ? 'blue' : 'teal'}>{sourceLabel(t.source)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={t.status === 'draft' ? 'amber' : t.status === 'completed' ? 'emerald' : 'gray'}>{t.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {t.receiptPath && (
                          <a href={fileUrl(t.receiptPath)} target="_blank" rel="noreferrer" title="View receipt">
                            <Button variant="ghost" size="icon">
                              <FileText size={16} />
                            </Button>
                          </a>
                        )}
                        {t.status === 'draft' && (
                          <Button variant="ghost" size="icon" title="Enrich" onClick={() => setEnriching(t)}>
                            <ClipboardEdit size={16} />
                          </Button>
                        )}
                        {isManager && (
                          <>
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(t); setFormOpen(true); }}>
                              <Pencil size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(t.id)}>
                            <Trash2 size={16} className="text-accent-red" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <TransactionFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        categories={categories}
        transaction={editing}
      />
      <EnrichDialog
        open={Boolean(enriching)}
        onClose={() => setEnriching(null)}
        onSaved={load}
        categories={categories}
        transaction={enriching}
      />
    </div>
  );
}
