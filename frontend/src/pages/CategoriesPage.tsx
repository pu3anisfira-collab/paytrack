import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  addCategoryField,
  deleteCategoryField,
} from '@/services/categoryService';
import { flattenCategories } from '@/utils/categoryTree';
import type { Category, FieldType } from '@/types';

function CategoryFormDialog({
  open,
  onClose,
  onSaved,
  category,
  allCategories,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  category: Category | null;
  allCategories: Category[];
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name || '');
    setParentId(category?.parentId || '');
  }, [open, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, parentId: parentId || null };
      if (category) await updateCategory(category.id, payload);
      else await createCategory(payload);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={category ? 'Edit Category' : 'New Category'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Parent Category (optional)</label>
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">None (top-level)</option>
            {flattenCategories(allCategories)
              .filter((c) => c.id !== category?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function FieldsDialog({ open, onClose, category, onChanged }: { open: boolean; onClose: () => void; category: Category | null; onChanged: () => void }) {
  const [fieldName, setFieldName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFieldName('');
      setFieldKey('');
      setFieldType('text');
      setIsRequired(false);
    }
  }, [open]);

  if (!category) return null;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addCategoryField(category!.id, { fieldName, fieldKey, fieldType, isRequired });
      setFieldName('');
      setFieldKey('');
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteField(fieldId: string) {
    await deleteCategoryField(category!.id, fieldId);
    onChanged();
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Fields for "${category.name}"`}>
      <div className="mb-4 space-y-2">
        {category.fields.length === 0 && <p className="text-sm text-muted-foreground">No custom fields yet.</p>}
        {category.fields.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{f.fieldName}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {f.fieldType}
                {f.isRequired ? ' · required' : ''}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteField(f.id)}>
              <Trash2 size={14} className="text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="space-y-3 border-t border-border pt-4">
        <p className="text-sm font-medium">Add a field</p>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Field name (e.g. Staff Name)" value={fieldName} onChange={(e) => setFieldName(e.target.value)} required />
          <Input
            placeholder="Field key (e.g. staff_name)"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value.replace(/\s+/g, '_'))}
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={fieldType} onChange={(e) => setFieldType(e.target.value as FieldType)} className="max-w-[160px]">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="textarea">Textarea</option>
            <option value="select">Select</option>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
            Required
          </label>
        </div>
        <Button type="submit" disabled={saving} size="sm">
          <Plus size={14} /> Add Field
        </Button>
      </form>
    </Dialog>
  );
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [fieldsFor, setFieldsFor] = useState<Category | null>(null);

  async function load() {
    const cats = await getCategories(true);
    setCategories(cats);
    if (fieldsFor) {
      const updated = flattenCategories(cats).find((c) => c.id === fieldsFor.id);
      if (updated) setFieldsFor(updated);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? If it is in use, it will be deactivated instead.')) return;
    await deleteCategory(id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{flattenCategories(categories).length} categories total</p>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={16} /> New Category
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {cat.children.length > 0 && (
                    <button onClick={() => setExpanded((p) => ({ ...p, [cat.id]: !p[cat.id] }))}>
                      {expanded[cat.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                  <span className="font-medium text-foreground">{cat.name}</span>
                  {!cat.isActive && <Badge tone="gray">Inactive</Badge>}
                  {cat.fields.length > 0 && <Badge tone="blue">{cat.fields.length} fields</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" title="Manage fields" onClick={() => setFieldsFor(cat)}>
                    <Settings2 size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(cat); setFormOpen(true); }}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(cat.id)}>
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </div>
              {expanded[cat.id] &&
                cat.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 pl-10">
                    <span className="text-sm text-foreground">{child.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setFieldsFor(child)}>
                        <Settings2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(child); setFormOpen(true); }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(child.id)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <CategoryFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} category={editing} allCategories={categories} />
      <FieldsDialog open={Boolean(fieldsFor)} onClose={() => setFieldsFor(null)} category={fieldsFor} onChanged={load} />
    </div>
  );
}
