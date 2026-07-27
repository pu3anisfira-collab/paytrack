import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, CalendarDays, CalendarRange, Layers,
  Upload, PlusCircle, Download, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getSummary, getCategoryBreakdown, getTrend } from '@/services/dashboardService';
import type { CategoryBreakdownItem, DashboardSummary, TrendPoint } from '@/types';
import { formatCurrency } from '@/utils/format';

// ── Stat card accent colours ───────────────────────────────────────────────
const CARDS = [
  {
    key: 'totalSpend',
    label: 'Total Spend',
    sub: 'All time recorded',
    icon: Wallet,
    border: '#2F6BFF',
    iconBg: '#EFF6FF',
    iconColor: '#2F6BFF',
  },
  {
    key: 'monthSpend',
    label: 'This Month',
    sub: 'Current calendar month',
    icon: CalendarDays,
    border: '#15C7B8',
    iconBg: '#E6FAF8',
    iconColor: '#15C7B8',
  },
  {
    key: 'weekSpend',
    label: 'This Week',
    sub: 'Last 7 days',
    icon: CalendarRange,
    border: '#6C3BFF',
    iconBg: '#FAF5FF',
    iconColor: '#6C3BFF',
  },
  {
    key: 'categoriesUsed',
    label: 'Categories',
    sub: 'Active categories used',
    icon: Layers,
    border: '#FFA51F',
    iconBg: '#FFF7ED',
    iconColor: '#FFA51F',
  },
] as const;

// ── Category bar colours ───────────────────────────────────────────────────
const BAR_COLORS = ['#2F6BFF', '#15C7B8', '#00D4A3', '#6C3BFF', '#FFA51F', '#0F234F', '#5F6C7B'];

// ── Custom area chart tooltip ──────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-text-secondary">{label}</p>
      <p className="text-sm font-extrabold text-paytrack-blue">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  Icon: React.ElementType;
  border: string;
  iconBg: string;
  iconColor: string;
}
function StatCard({ label, value, sub, Icon, border, iconBg, iconColor }: StatCardProps) {
  return (
    <div
      className="relative flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderTop: `3px solid ${border}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">{label}</p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>

      <div>
        <p className="text-2xl font-extrabold tracking-tight text-text-primary">{value}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'days' | 'weeks' | 'months' | 'years'>('months');
  const [trendLoading, setTrendLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, b, t] = await Promise.all([getSummary(), getCategoryBreakdown(), getTrend(trendPeriod)]);
      setSummary(s);
      setBreakdown(b.slice(0, 7)); // top 7 categories
      setTrend(t);
      setLoading(false);
    }
    load();
  }, []);

  const handlePeriodChange = async (period: 'days' | 'weeks' | 'months' | 'years') => {
    setTrendPeriod(period);
    setTrendLoading(true);
    try {
      const data = await getTrend(period);
      setTrend(data);
    } catch (err) {
      console.error('Failed to load trend', err);
    } finally {
      setTrendLoading(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const summaryValues: Record<string, string> = {
    totalSpend: formatCurrency(summary.totalSpend),
    monthSpend: formatCurrency(summary.monthSpend),
    weekSpend: formatCurrency(summary.weekSpend),
    categoriesUsed: String(summary.categoriesUsed),
  };

  // For category progress bars
  const maxCategory = Math.max(...breakdown.map((b) => b.total), 1);

  const periodLabels: Record<string, string> = {
    days: 'Last 30 Days',
    weeks: 'Last 12 Weeks',
    months: 'Last 12 Months',
    years: 'Last 5 Years',
  };

  return (
    <div className="space-y-6">

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CARDS.map((c) => (
          <StatCard
            key={c.key}
            label={c.label}
            value={summaryValues[c.key]}
            sub={c.sub}
            Icon={c.icon}
            border={c.border}
            iconBg={c.iconBg}
            iconColor={c.iconColor}
          />
        ))}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate('/import')}>
          <Upload size={14} /> Import TNG
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/transactions?new=1')}>
          <PlusCircle size={14} /> Add Expense
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/export')}>
          <Download size={14} /> Export
        </Button>
      </div>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

        {/* Trend chart — takes 3/5 width on xl */}
        <div className="xl:col-span-3 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">Spending Trend</h3>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50">
                  <TrendingUp size={13} className="text-paytrack-blue" />
                </div>
              </div>
              <p className="text-xs text-text-secondary">{periodLabels[trendPeriod]}</p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 rounded-xl bg-gray-100/80 p-1 text-xs font-medium">
              {(['days', 'weeks', 'months', 'years'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    trendPeriod === p
                      ? 'bg-white text-paytrack-blue font-bold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {trendLoading ? (
            <div className="flex h-56 items-center justify-center">
              <Spinner />
            </div>
          ) : trend.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-text-secondary">
              No trend data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#5F6C7B' }}
                />
                <YAxis
                  tickFormatter={(v) => `RM${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tick={{ fill: '#5F6C7B' }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2F6BFF"
                  strokeWidth={2.5}
                  fill="url(#blueGrad)"
                  dot={{ r: 3, fill: '#2F6BFF', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#2F6BFF', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category breakdown — takes 2/5 width on xl */}
        <div className="xl:col-span-2 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Top Categories</h3>
            <p className="text-xs text-text-secondary">Spending distribution this month</p>
          </div>

          {breakdown.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-text-secondary">
              No categorized spending yet.
            </div>
          ) : (
            <div className="space-y-3.5">
              {breakdown.map((item, idx) => {
                const pct = Math.round((item.total / maxCategory) * 100);
                const color = BAR_COLORS[idx % BAR_COLORS.length];
                return (
                  <div key={item.categoryId}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="max-w-[60%] truncate text-xs font-medium text-text-primary">
                        {item.categoryName}
                      </span>
                      <span className="text-xs font-semibold text-text-secondary">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
