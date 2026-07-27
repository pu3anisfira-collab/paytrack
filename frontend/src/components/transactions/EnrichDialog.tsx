import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { DynamicFieldsForm, extrasToValues, valuesToExtras } from './DynamicFieldsForm';
import { flattenCategories } from '@/utils/categoryTree';
import { getCategoryFields } from '@/services/categoryService';
import { enrichTransaction } from '@/services/transactionService';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Category, Transaction } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  transaction: Transaction | null;
}

export function EnrichDialog({ open, onClose, onSaved, categories, transaction }: Props) {
  const flatCategories = flattenCategories(categories);
  const [categoryId, setCategoryId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [fields, setFields] = useState<Category['fields']>([]);
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !transaction) return;
    setCategoryId(transaction.categoryId || '');
    setRemarks(transaction.remarks || '');
    setExtraValues(extrasToValues(transaction.extras || []));
    setReceipt(null);
    setError('');
  }, [open, transaction]);

  useEffect(() => {
    if (!categoryId) {
      setFields([]);
      return;
    }
    getCategoryFields(categoryId).then(setFields).catch(() => setFields([]));
  }, [categoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;
    setError('');
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('categoryId', categoryId);
      if (remarks) formData.append('remarks', remarks);
      formData.append('extras', JSON.stringify(valuesToExtras(fields, extraValues)));
      if (receipt) formData.append('receipt', receipt);
      await enrichTransaction(transaction.id, formData);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save this transaction.');
    } finally {
      setSaving(false);
    }
  }

  if (!transaction) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Enrich Imported Transaction">
      <div className="mb-4 rounded-md bg-muted/50 p-3 text-sm">
        <p className="font-medium text-foreground">{transaction.description}</p>
        <p className="text-muted-foreground">
          {formatDate(transaction.date)} · {formatCurrency(transaction.amount)} · {transaction.paymentMode}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Category <span className="text-red-500">*</span>
          </label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Select a category…</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <DynamicFieldsForm
          fields={fields}
          values={extraValues}
          onChange={(key, value) => setExtraValues((prev) => ({ ...prev, [key]: value }))}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">Remarks</label>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Receipt (image or PDF)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setReceipt(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-paytrack-blue/10 file:px-3 file:py-2 file:text-paytrack-blue font-medium"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !categoryId}>
            {saving ? 'Saving…' : 'Mark as Complete'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
