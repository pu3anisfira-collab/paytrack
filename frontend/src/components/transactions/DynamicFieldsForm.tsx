import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import type { CategoryField, TransactionExtra } from '@/types';

interface Props {
  fields: CategoryField[];
  values: Record<string, string>;
  onChange: (fieldKey: string, value: string) => void;
}

export function DynamicFieldsForm({ fields, values, onChange }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category Details</p>
      {fields.map((field) => (
        <div key={field.id}>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {field.fieldName}
            {field.isRequired && <span className="text-red-500"> *</span>}
          </label>
          {field.fieldType === 'textarea' ? (
            <Textarea
              required={field.isRequired}
              placeholder={field.placeholder || undefined}
              value={values[field.fieldKey] || ''}
              onChange={(e) => onChange(field.fieldKey, e.target.value)}
            />
          ) : field.fieldType === 'select' ? (
            <Select
              required={field.isRequired}
              value={values[field.fieldKey] || ''}
              onChange={(e) => onChange(field.fieldKey, e.target.value)}
            >
              <option value="">Select…</option>
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
              required={field.isRequired}
              placeholder={field.placeholder || undefined}
              value={values[field.fieldKey] || ''}
              onChange={(e) => onChange(field.fieldKey, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function extrasToValues(extras: TransactionExtra[]): Record<string, string> {
  const map: Record<string, string> = {};
  extras.forEach((e) => {
    map[e.fieldKey] = e.fieldValue;
  });
  return map;
}

export function valuesToExtras(fields: CategoryField[], values: Record<string, string>): TransactionExtra[] {
  return fields
    .filter((f) => values[f.fieldKey] !== undefined && values[f.fieldKey] !== '')
    .map((f) => ({ fieldKey: f.fieldKey, fieldValue: values[f.fieldKey], fieldType: f.fieldType }));
}
