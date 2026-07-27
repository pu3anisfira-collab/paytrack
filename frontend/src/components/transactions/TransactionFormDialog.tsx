import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { PaymentModeSelect } from '@/components/ui/PaymentModeSelect';
import { DynamicFieldsForm, extrasToValues, valuesToExtras } from './DynamicFieldsForm';
import { MileageRouteBuilder, RouteSegment } from './MileageRouteBuilder';
import { VehicleClassHelper } from './VehicleClassHelper';
import {
  VEHICLE_CLASSES,
  getVehicleClassById,
  calculateMileageClaim,
} from '@/config/vehicleClasses';
import { flattenCategories } from '@/utils/categoryTree';
import { formatCurrency } from '@/utils/format';
import { getCategoryFields } from '@/services/categoryService';
import { createTransaction, updateTransaction } from '@/services/transactionService';
import type { Category, Transaction } from '@/types';

/**
 * A category is treated as a mileage category if it has a 'license_plate' field.
 * This means the Categories page is the single source of truth — managers can
 * add/remove that field to control whether the route builder appears.
 */
function hasMileageFields(fields: Category['fields']): boolean {
  return fields.some((f) => f.fieldKey === 'license_plate');
}

function defaultSegments(): RouteSegment[] {
  return [{ id: `seg-${Date.now()}`, from: '', to: '', distanceKm: 0, notes: '', isSaved: false }];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  transaction?: Transaction | null;
}

export function TransactionFormDialog({ open, onClose, onSaved, categories, transaction }: Props) {
  const flatCategories = flattenCategories(categories);
  const isEdit = Boolean(transaction);

  // ── Standard fields ──
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [fields, setFields] = useState<Category['fields']>([]);
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Mileage-specific fields ──
  const [staffName, setStaffName] = useState('');
  const [vehicleClassId, setVehicleClassId] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [objectives, setObjectives] = useState('');
  const [segments, setSegments] = useState<RouteSegment[]>(defaultSegments);
  const [totalKm, setTotalKm] = useState(0);

  // Detect mileage category by field keys
  const selectedCategory = flatCategories.find((c) => c.id === categoryId);
  const categoryFields = selectedCategory?.fields?.length ? selectedCategory.fields : fields;
  const isMileage = hasMileageFields(categoryFields);

  const selectedVehicleClass = getVehicleClassById(vehicleClassId);

  // Auto-calculate amount for mileage whenever totalKm or vehicleClassId changes
  useEffect(() => {
    if (isMileage) {
      const cls = getVehicleClassById(vehicleClassId);
      const claim = calculateMileageClaim(totalKm, cls.rateRm);
      setAmount(claim > 0 ? claim.toFixed(2) : '0.00');
    }
  }, [isMileage, totalKm, vehicleClassId]);

  // Reset on open
  useEffect(() => {
    if (!open) return;

    if (transaction) {
      setDate(transaction.date.slice(0, 10));
      setDescription(transaction.description);
      setPaymentMode(transaction.paymentMode);
      setAmount(String(transaction.amount));
      setCategoryId(transaction.categoryId || '');
      setRemarks(transaction.remarks || '');
      setExtraValues(extrasToValues(transaction.extras || []));

      // ── Restore mileage-specific fields from extras ──────────────────────────
      const extras = transaction.extras ?? [];
      const extrasMap = Object.fromEntries(extras.map((e) => [e.fieldKey, e.fieldValue]));

      setStaffName(extrasMap['staff_name'] ?? '');
      setVehicleBrand(extrasMap['car_brand'] ?? '');
      setLicensePlate(extrasMap['license_plate'] ?? '');
      setObjectives(extrasMap['objectives'] ?? '');

      const storedClass = extrasMap['vehicle_class'];
      if (storedClass && VEHICLE_CLASSES.some((c) => c.id === storedClass)) {
        setVehicleClassId(storedClass as any);
      } else {
        const storedVehicle = extrasMap['vehicle_type'];
        setVehicleClassId(storedVehicle === 'motorcycle' ? 'D' : 'A');
      }

      // Route segments
      const rawSegments = extrasMap['mileage_segments'];
      if (rawSegments) {
        try {
          const parsed: RouteSegment[] = JSON.parse(rawSegments);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSegments(parsed);
            const km = parsed.reduce((sum, s) => sum + (s.isSaved ? s.distanceKm : 0), 0);
            setTotalKm(km);
          } else {
            setSegments(defaultSegments());
            setTotalKm(0);
          }
        } catch {
          setSegments(defaultSegments());
          setTotalKm(0);
        }
      } else {
        setSegments(defaultSegments());
        setTotalKm(0);
      }
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setDescription('');
      setPaymentMode('Cash');
      setAmount('');
      setCategoryId('');
      setRemarks('');
      setExtraValues({});
      setStaffName('');
      setVehicleClassId('A');
      setVehicleBrand('');
      setLicensePlate('');
      setObjectives('');
      setSegments(defaultSegments());
      setTotalKm(0);
    }

    setReceipt(null);
    setError('');
  }, [open, transaction]);

  // Load dynamic category fields
  useEffect(() => {
    if (!categoryId) { setFields([]); return; }
    getCategoryFields(categoryId).then(setFields).catch(() => setFields([]));
  }, [categoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (isMileage) {
      if (!staffName.trim()) { setError('Please enter staff name.'); return; }
      if (!licensePlate.trim()) { setError('Please enter license plate.'); return; }
      if (!segments.some((s) => s.isSaved)) { setError('Please save at least one route segment.'); return; }
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('date', date);
      formData.append('paymentMode', paymentMode);
      formData.append('amount', amount);
      if (categoryId) formData.append('categoryId', categoryId);
      if (remarks) formData.append('remarks', remarks);

      if (isMileage) {
        const savedSegs = segments.filter((s) => s.isSaved);
        const routeSummary = savedSegs.map((s) => `${s.from} → ${s.to}`).join(', ');
        formData.append('description', description || `Mileage: ${routeSummary}`);

        const currentClass = getVehicleClassById(vehicleClassId);
        const mileageExtras = [
          { fieldName: 'Staff Name', fieldKey: 'staff_name', value: staffName },
          { fieldName: 'Vehicle Class', fieldKey: 'vehicle_class', value: currentClass.id },
          { fieldName: 'Rate (RM/km)', fieldKey: 'rate_per_km', value: String(currentClass.rateRm) },
          { fieldName: 'Vehicle Type', fieldKey: 'vehicle_type', value: currentClass.category },
          { fieldName: 'Vehicle Brand', fieldKey: 'car_brand', value: vehicleBrand },
          { fieldName: 'License Plate', fieldKey: 'license_plate', value: licensePlate },
          { fieldName: 'Objectives', fieldKey: 'objectives', value: objectives },
          { fieldName: 'Total Distance (km)', fieldKey: 'total_distance_km', value: String(totalKm.toFixed(1)) },
          { fieldName: 'Route Segments', fieldKey: 'mileage_segments', value: JSON.stringify(savedSegs) },
        ];
        formData.append('extras', JSON.stringify(mileageExtras));
      } else {
        formData.append('description', description);
        formData.append('extras', JSON.stringify(valuesToExtras(fields, extraValues)));
      }

      if (receipt) formData.append('receipt', receipt);

      if (isEdit && transaction) {
        await updateTransaction(transaction.id, formData);
      } else {
        await createTransaction(formData);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save the transaction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Edit Transaction' : 'New Transaction'}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Category selection */}
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select category...</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Date & Payment Mode */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Payment Mode</label>
            <PaymentModeSelect value={paymentMode} onChange={setPaymentMode} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            MILEAGE CLAIM SECTION — shown only for mileage cats
            ═══════════════════════════════════════════════════ */}
        {isMileage ? (
          <div className="space-y-4 rounded-2xl border border-[#2F6BFF]/30 bg-[#2F6BFF]/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-[#0F234F]">
                🚗 Vehicle Information & Rates
              </p>
              <span className="rounded-full bg-[#2F6BFF]/15 px-2.5 py-0.5 text-xs font-extrabold text-[#1E52D8]">
                RM {selectedVehicleClass.rateRm.toFixed(2)}/km
              </span>
            </div>

            {/* 1. Staff Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F234F]">
                Staff Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="e.g. Ahmad bin Razali"
                required
              />
            </div>

            {/* 2. Vehicle Class Dropdown */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F234F]">
                Vehicle Class <span className="text-red-500">*</span>
              </label>
              <Select
                value={vehicleClassId}
                onChange={(e) => setVehicleClassId(e.target.value as any)}
                className="w-full font-semibold border-[#D8E0EA] focus:border-[#2F6BFF]"
              >
                {VEHICLE_CLASSES.map((vc) => (
                  <option key={vc.id} value={vc.id}>
                    {vc.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* 3. Helper Info Box */}
            <VehicleClassHelper selectedClass={selectedVehicleClass} />

            {/* 4. Vehicle Brand + License Plate */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F234F]">Vehicle Brand / Model</label>
                <Input
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  placeholder="e.g. Perodua Myvi 1.5"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#0F234F]">
                  License Plate <span className="text-red-500">*</span>
                </label>
                <Input
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="e.g. WYY 8842"
                  required
                />
              </div>
            </div>

            {/* 5. Objectives */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F234F]">Purpose / Objectives</label>
              <Textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="e.g. Site visit to station branch and client meeting"
                className="min-h-[60px] resize-none"
              />
            </div>

            {/* 6. Route Details */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#0F234F]">
                Route Details <span className="text-red-500">*</span>
              </label>
              <MileageRouteBuilder
                segments={segments}
                onSegmentsChange={(segs) => {
                  setSegments(segs);
                  const km = segs.reduce((sum, s) => sum + (s.isSaved ? s.distanceKm : 0), 0);
                  setTotalKm(km);
                }}
              />
            </div>

            {/* 7. Route & Claim Summary Box */}
            <div className="rounded-xl border border-[#D8E0EA] bg-white p-4 shadow-sm space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F234F] border-b border-[#D8E0EA] pb-1.5">
                ─── Route & Claim Summary ───
              </p>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div>
                  <p className="text-[11px] font-medium text-[#5F6C7B]">Total Distance</p>
                  <p className="text-base font-extrabold text-[#0F234F]">{totalKm.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#5F6C7B]">Rate Applied</p>
                  <p className="text-base font-extrabold text-[#15C7B8]">RM {selectedVehicleClass.rateRm.toFixed(2)}/km</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#5F6C7B]">Total Claim</p>
                  <p className="text-base font-extrabold text-[#2F6BFF]">{formatCurrency(calculateMileageClaim(totalKm, selectedVehicleClass.rateRm))}</p>
                </div>
              </div>
            </div>

            {/* Optional description override */}
            <div>
              <label className="mb-1 block text-sm font-medium text-[#0F234F]">
                Description <span className="text-xs font-normal text-[#5F6C7B]">(optional — auto-generated if blank)</span>
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Mileage claim — Shah Alam to KL"
              />
            </div>
          </div>
        ) : (
          /* ── Standard non-mileage fields ── */
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Toilet cleaning supplies"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Amount (RM)</label>
              <Input
                type="number" step="0.01" min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <DynamicFieldsForm
              fields={fields}
              values={extraValues}
              onChange={(key, value) => setExtraValues((prev) => ({ ...prev, [key]: value }))}
            />
          </>
        )}

        {/* Remarks */}
        <div>
          <label className="mb-1 block text-sm font-medium">Remarks</label>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes" />
        </div>

        {/* Receipt */}
        <div>
          <label className="mb-1 block text-sm font-medium">Receipt (image or PDF)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setReceipt(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-[#2F6BFF]/10 file:px-3 file:py-2 file:text-[#2F6BFF] font-medium"
          />
          {transaction?.receiptPath && !receipt && (
            <p className="mt-1 text-xs text-text-secondary">A receipt is already attached. Uploading a new one will replace it.</p>
          )}
        </div>

        {error && <p className="text-sm text-accent-red">{error}</p>}

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-[#2F6BFF] text-white hover:bg-[#1E52D8]">
            {saving ? 'Saving…' : isEdit ? 'Update Claim' : '💾 Save Claim'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
