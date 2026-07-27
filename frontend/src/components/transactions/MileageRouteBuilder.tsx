import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, MapPin, Navigation, Save, RotateCcw, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouteSegment {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  notes?: string;
  isSaved: boolean;
}

export interface MileageRouteProps {
  segments: RouteSegment[];
  onSegmentsChange: (segments: RouteSegment[]) => void;
  rate?: number;
  onTotalChange?: (total: number) => void;
  disabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stopLabel(idx: number): string {
  return String.fromCharCode(65 + idx);
}

/** Returns plain hex colors — avoids Tailwind dynamic class purging issues */
function getStopHex(idx: number, total: number): { bg: string; shadow: string } {
  if (idx === 0) return { bg: '#00A64F', shadow: 'rgba(0,166,79,0.35)' };
  if (idx === total - 1) return { bg: '#F57C00', shadow: 'rgba(245,124,0,0.35)' };
  return { bg: '#0050B3', shadow: 'rgba(0,80,179,0.35)' };
}

function newId() {
  return `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Stop Dot ─────────────────────────────────────────────────────────────────

function StopDot({
  label, idx, total, location, active, canDelete, onDelete, onClick,
}: {
  label: string;
  idx: number;
  total: number;
  location: string;
  active: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onClick: () => void;
}) {
  const { bg, shadow } = getStopHex(idx, total);

  return (
    <div className="group flex flex-col items-center gap-1.5">
      {/* Circle wrapper — relative so delete button can be positioned */}
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-md transition-all duration-200',
            active ? 'scale-110 shadow-lg' : 'hover:scale-105',
          )}
          style={{
            backgroundColor: bg,
            boxShadow: active
              ? `0 0 0 5px ${shadow}, 0 6px 14px ${shadow}`
              : `0 3px 8px ${shadow}`,
          }}
        >
          {label}
          {/* Ping animation — inline style avoids Tailwind JIT purge issue */}
          {active && (
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-25"
              style={{ backgroundColor: bg }}
            />
          )}
        </button>

        {/* Delete (×) button — appears on hover when deletion is allowed */}
        {canDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title={`Remove stop ${label}`}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white opacity-0 shadow-md transition-all duration-150 hover:bg-red-600 hover:scale-110 group-hover:opacity-100"
          >
            <span className="text-[9px] font-black leading-none">×</span>
          </button>
        )}
      </div>

      {/* Location label */}
      <span className="max-w-[76px] truncate text-center text-[10px] font-medium leading-tight text-text-secondary">
        {location || '…'}
      </span>
    </div>
  );
}

// ─── Connector Line ───────────────────────────────────────────────────────────

function ConnectorLine({ distanceKm, isSaved }: { distanceKm: number; isSaved: boolean }) {
  return (
    <div className="mx-1 flex min-w-[48px] flex-1 flex-col items-center justify-center gap-0.5 self-start pt-4">
      <div
        className="h-1 w-full rounded-full transition-all duration-300"
        style={{
          background: isSaved
            ? 'linear-gradient(to right, #00A64F88, #0050B388)'
            : '#e5e7eb',
        }}
      />
      {distanceKm > 0 && (
        <span className="text-[9px] font-semibold text-text-secondary">{distanceKm} km</span>
      )}
    </div>
  );
}

// ─── Segment Card ─────────────────────────────────────────────────────────────

interface SegmentCardProps {
  segment: RouteSegment;
  segIdx: number;
  totalSegments: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (updated: Partial<RouteSegment>) => void;
  onSave: () => void;
  onRemove: () => void;
  disabled: boolean;
}

function SegmentCard({
  segment, segIdx, totalSegments, expanded, onToggle,
  onChange, onSave, onRemove, disabled,
}: SegmentCardProps) {
  const [error, setError] = useState('');
  // Local string for the distance field — keeps the raw typed value (e.g. "0.6")
  // so the leading zero is never swallowed by falsy-coercion on the number.
  const [distStr, setDistStr] = useState(
    segment.distanceKm > 0 ? String(segment.distanceKm) : '',
  );

  // Sync distStr when the segment is reset externally (e.g. form reopen)
  useEffect(() => {
    setDistStr(segment.distanceKm > 0 ? String(segment.distanceKm) : '');
  }, [segment.id]); // only re-sync when the segment itself changes (not every keystroke)
  const fromLabel = stopLabel(segIdx);
  const toLabel = stopLabel(segIdx + 1);
  const { bg: startBg } = getStopHex(segIdx, totalSegments + 1);
  const { bg: endBg } = getStopHex(segIdx + 1, totalSegments + 1);

  function handleSave() {
    if (!segment.from.trim()) { setError('Please enter the starting location.'); return; }
    if (!segment.to.trim()) { setError('Please enter the destination.'); return; }
    if (!segment.distanceKm || segment.distanceKm <= 0) { setError('Please enter a valid distance.'); return; }
    setError('');
    onSave();
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border transition-all duration-300',
        expanded ? 'border-paytrack-blue/40 shadow-md' : segment.isSaved ? 'border-paytrack-emerald/40 bg-paytrack-emerald/5' : 'border-gray-medium',
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-light"
      >
        {/* Stop labels */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: startBg }}
          >
            {fromLabel}
          </span>
          <ArrowRight size={12} className="text-gray-dark" />
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: endBg }}
          >
            {toLabel}
          </span>
        </div>

        {/* Description */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">
            {segment.from || `Stop ${fromLabel}`} → {segment.to || `Stop ${toLabel}`}
          </p>
        </div>

        {/* Badges */}
        <div className="flex shrink-0 items-center gap-2">
          {segment.distanceKm > 0 && <Badge tone="blue">{segment.distanceKm} km</Badge>}
          {segment.isSaved ? (
            <span className="flex items-center gap-1 rounded-full bg-paytrack-emerald/15 px-2 py-0.5 text-xs font-semibold text-[#008A6A]">
              <CheckCircle2 size={11} /> Saved
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
              <AlertTriangle size={11} /> Unsaved
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-dark" /> : <ChevronDown size={16} className="text-gray-dark" />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="space-y-3 border-t border-gray-medium/40 bg-white px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <MapPin size={11} className="text-paytrack-blue" /> From ({fromLabel})
              </label>
              <Input
                value={segment.from}
                onChange={(e) => onChange({ from: e.target.value, isSaved: false })}
                placeholder="e.g. Petronas Pekan Kapar"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <Navigation size={11} className="text-[#F57C00]" /> To ({toLabel})
              </label>
              <Input
                value={segment.to}
                onChange={(e) => onChange({ to: e.target.value, isSaved: false })}
                placeholder="e.g. Taman Klang Jaya"
                disabled={disabled}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">Distance</label>
            <div className="relative w-40">
              <Input
                type="text"
                inputMode="decimal"
                value={distStr}
                onChange={(e) => {
                  const raw = e.target.value;
                  // Allow empty, digits, one dot, and leading zero before dot
                  if (!/^\d*\.?\d*$/.test(raw)) return;
                  setDistStr(raw);
                  const parsed = parseFloat(raw);
                  onChange({
                    distanceKm: isNaN(parsed) ? 0 : parsed,
                    isSaved: false,
                  });
                }}
                placeholder="0.0"
                disabled={disabled}
                className="pr-10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-secondary">km</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Notes <span className="normal-case font-normal text-text-light">(optional)</span>
            </label>
            <Textarea
              value={segment.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value, isSaved: false })}
              placeholder="e.g. Paid by TNG"
              disabled={disabled}
              className="min-h-[56px] resize-none"
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertTriangle size={12} /> {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={disabled}>
                <Save size={13} /> Save
              </Button>
              {segment.isSaved && (
                <Button size="sm" variant="ghost" onClick={() => { onChange({ isSaved: false }); setError(''); }} disabled={disabled}>
                  <RotateCcw size={13} /> Edit
                </Button>
              )}
            </div>
            {totalSegments > 1 && (
              <Button size="sm" variant="danger" onClick={onRemove} disabled={disabled}>
                <Trash2 size={13} /> Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MileageRouteBuilder({
  segments,
  onSegmentsChange,
  rate = 0.60,
  onTotalChange,
  disabled = false,
}: MileageRouteProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    () => segments.find((s) => !s.isSaved)?.id ?? null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  // All unique stops
  const stops: string[] = [];
  segments.forEach((seg, i) => {
    if (i === 0) stops.push(seg.from || '');
    stops.push(seg.to || '');
  });

  const totalDistance = segments.reduce((sum, s) => sum + (s.isSaved ? s.distanceKm : 0), 0);
  const savedCount = segments.filter((s) => s.isSaved).length;
  const completionPct = segments.length === 0 ? 0 : Math.round((savedCount / segments.length) * 100);

  useEffect(() => { onTotalChange?.(totalDistance); }, [totalDistance, onTotalChange]);

  const handleAddStop = useCallback(() => {
    const last = segments[segments.length - 1];
    const newSeg: RouteSegment = {
      id: newId(), from: last?.to ?? '', to: '', distanceKm: 0, notes: '', isSaved: false,
    };
    onSegmentsChange([...segments, newSeg]);
    setExpandedId(newSeg.id);
    setTimeout(() => scrollRef.current?.scrollTo({ left: 9999, behavior: 'smooth' }), 100);
  }, [segments, onSegmentsChange]);

  const handleChange = useCallback(
    (id: string, changes: Partial<RouteSegment>) =>
      onSegmentsChange(segments.map((s) => (s.id === id ? { ...s, ...changes } : s))),
    [segments, onSegmentsChange],
  );

  const handleSave = useCallback(
    (id: string) => {
      onSegmentsChange(segments.map((s) => (s.id === id ? { ...s, isSaved: true } : s)));
      setExpandedId(null);
    },
    [segments, onSegmentsChange],
  );

  const handleRemove = useCallback(
    (id: string) => {
      if (segments.length <= 1) return;
      const idx = segments.findIndex((s) => s.id === id);
      const updated = segments.filter((s) => s.id !== id);
      if (idx > 0 && updated[idx - 1] && updated[idx]) {
        updated[idx] = { ...updated[idx], from: updated[idx - 1].to, isSaved: false };
      }
      onSegmentsChange(updated);
      setExpandedId(null);
    },
    [segments, onSegmentsChange],
  );

  /**
   * Remove a stop by its index in the stops array.
   * - First stop  → remove segment[0], keep rest
   * - Last stop   → remove the last segment
   * - Middle stop → remove the segment before it and re-chain
   */
  const handleRemoveStop = useCallback(
    (stopIdx: number) => {
      if (segments.length <= 1) return; // need at least 1 segment (2 stops)
      let updated: RouteSegment[];
      if (stopIdx === 0) {
        // Remove first stop → drop segment[0]
        updated = segments.slice(1);
      } else if (stopIdx === stops.length - 1) {
        // Remove last stop → drop last segment
        updated = segments.slice(0, -1);
      } else {
        // Remove middle stop → drop segment[stopIdx-1], re-chain segment[stopIdx]
        updated = segments.filter((_, i) => i !== stopIdx - 1);
        if (updated[stopIdx - 1] && updated[stopIdx - 1]) {
          updated[stopIdx - 1] = {
            ...updated[stopIdx - 1],
            from: segments[stopIdx - 1].from,
            isSaved: false,
          };
        }
      }
      onSegmentsChange(updated);
      setExpandedId(null);
    },
    [segments, stops, onSegmentsChange],
  );

  return (
    <div className="space-y-3">

      {/* ── Route Track ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Route Map</span>
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
            completionPct === 100 ? 'bg-green-50 text-green-700' : 'border border-amber-200 bg-amber-50 text-amber-700',
          )}>
            {savedCount}/{segments.length} segments saved
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completionPct}%`,
              background: 'linear-gradient(to right, #00A64F, #0050B3)',
            }}
          />
        </div>

        {/* Scrollable stops track
            ‣ overflow-x-auto on outer
            ‣ py-5 px-4 on inner so box-shadow / ring is never clipped
        */}
        <div ref={scrollRef} className="overflow-x-auto">
          <div className="mx-auto flex min-w-fit items-start justify-center gap-0 px-4 py-5">
            {stops.map((loc, idx) => (
              <div key={idx} className="flex items-center">
                <StopDot
                  label={stopLabel(idx)}
                  idx={idx}
                  total={stops.length}
                  location={loc}
                  active={
                    expandedId != null &&
                    (segments[idx - 1]?.id === expandedId || segments[idx]?.id === expandedId)
                  }
                  canDelete={segments.length > 1 && !disabled}
                  onDelete={() => handleRemoveStop(idx)}
                  onClick={() => {
                    const seg = segments[idx] ?? segments[idx - 1];
                    if (seg) setExpandedId((p) => (p === seg.id ? null : seg.id));
                  }}
                />
                {idx < stops.length - 1 && (
                  <ConnectorLine
                    distanceKm={segments[idx]?.distanceKm ?? 0}
                    isSaved={segments[idx]?.isSaved ?? false}
                  />
                )}
              </div>
            ))}

            {/* Add Stop button */}
            {!disabled && (
              <div className="ml-3 flex items-start self-start pt-0.5">
                <button
                  type="button"
                  onClick={handleAddStop}
                  title="Add Stop"
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-blue-300 bg-blue-50 text-blue-500 transition-all hover:scale-110 hover:border-blue-500 hover:bg-blue-100"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 border-t border-gray-100 pt-3">
          {[
            { color: '#00A64F', label: 'Start' },
            { color: '#0050B3', label: 'Waypoint' },
            { color: '#F57C00', label: 'End' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Segment Accordion ── */}
      <div className="space-y-2">
        {segments.map((seg, idx) => (
          <SegmentCard
            key={seg.id}
            segment={seg}
            segIdx={idx}
            totalSegments={segments.length}
            expanded={expandedId === seg.id}
            onToggle={() => setExpandedId((p) => (p === seg.id ? null : seg.id))}
            onChange={(changes) => handleChange(seg.id, changes)}
            onSave={() => handleSave(seg.id)}
            onRemove={() => handleRemove(seg.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
