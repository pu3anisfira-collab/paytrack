import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend,
} from 'recharts';
import {
  TrendingUp, PieChart as PieIcon, BarChart3, LineChart,
  DollarSign, CalendarDays, Award, Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { getCategoryBreakdown, getSummary, getTrend } from '@/services/dashboardService';
import { formatCurrency } from '@/utils/format';
import type { CategoryBreakdownItem, DashboardSummary, TrendPoint } from '@/types';

// ── PayTrack Palette ───────────────────────────────────────────────────────
const PAYTRACK_COLORS = [
  '#2F6BFF', // Primary Blue
  '#15C7B8', // Teal
  '#00D4A3', // Emerald
  '#6C3BFF', // Purple
  '#FFA51F', // Orange
  '#0F234F', // Navy
  '#5F6C7B', // Dark Gray
];

// ── Custom Tooltip for Recharts ───────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="rounded-xl border border-[#D8E0EA] bg-white p-3 shadow-xl">
      <p className="text-xs font-semibold text-[#5F6C7B]">{label || data.name}</p>
      <p className="text-sm font-extrabold text-[#2F6BFF]">
        {formatCurrency(data.value)}
      </p>
    </div>
  );
}

export function ReportsPage() {
  const [monthly, setMonthly] = useState<CategoryBreakdownItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [categoryScope, setCategoryScope] = useState<'month' | 'allTime'>('allTime');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [m, s, t] = await Promise.all([
        getCategoryBreakdown(undefined, undefined, true), // Default to All Time so Pie chart is rich with data
        getSummary(),
        getTrend(),
      ]);
      setMonthly(m);
      setSummary(s);
      setTrend(t);
      setLoading(false);
    }
    load();
  }, []);

  const handleScopeChange = async (scope: 'month' | 'allTime') => {
    setCategoryScope(scope);
    setCategoryLoading(true);
    try {
      const data = await getCategoryBreakdown(
        undefined,
        undefined,
        scope === 'allTime'
      );
      setMonthly(data);
    } catch (err) {
      console.error('Failed to load category breakdown', err);
    } finally {
      setCategoryLoading(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // ── Metrics Calculation ──────────────────────────────────────────────────
  const monthlyTotal = monthly.reduce((sum, m) => sum + Number(m.total), 0);
  const totalYtd = trend.reduce((sum, t) => sum + Number(t.total), 0);
  const avgMonthly = trend.length > 0 ? totalYtd / trend.length : 0;
  const peakMonth = trend.reduce(
    (max, t) => (t.total > max.total ? t : max),
    { label: 'N/A', total: 0 }
  );

  // Cumulative trend for Area Chart
  let cumulative = 0;
  const cumulativeTrend = trend.map((t) => {
    cumulative += Number(t.total);
    return {
      label: t.label,
      monthly: Number(t.total),
      cumulative: Number(cumulative),
    };
  });

  return (
    <div className="w-full space-y-6">

      {/* ── KPI STAT CARDS ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm border-t-4 border-t-[#2F6BFF]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F6C7B]">YTD Total Spend</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F6BFF]/10 text-[#2F6BFF]">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-[#0F234F]">{formatCurrency(totalYtd)}</p>
            <p className="mt-1 text-xs text-[#5F6C7B]">Accumulated 12-month spending</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm border-t-4 border-t-[#15C7B8]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F6C7B]">Current Month</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#15C7B8]/10 text-[#15C7B8]">
              <CalendarDays size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-[#0F234F]">{formatCurrency(summary.monthSpend)}</p>
            <p className="mt-1 text-xs text-[#5F6C7B]">Expenses for this calendar month</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm border-t-4 border-t-[#6C3BFF]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F6C7B]">Average / Month</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6C3BFF]/10 text-[#6C3BFF]">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-[#0F234F]">{formatCurrency(avgMonthly)}</p>
            <p className="mt-1 text-xs text-[#5F6C7B]">Monthly mean expense average</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm border-t-4 border-t-[#FFA51F]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F6C7B]">Peak Month</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFA51F]/10 text-[#FFA51F]">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-[#0F234F]">{peakMonth.label}</p>
            <p className="mt-1 text-xs text-[#5F6C7B] font-medium text-[#FFA51F]">
              Highest: {formatCurrency(peakMonth.total)}
            </p>
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 1: DONUT CHART & BAR CHART ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* 1. Category Distribution Donut Chart */}
        <Card className="border border-[#D8E0EA] bg-white shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-[#D8E0EA]/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-[#0F234F]">
              <PieIcon size={18} className="text-[#2F6BFF]" />
              Category Expense Breakdown
            </CardTitle>
            <div className="flex items-center gap-1 rounded-xl bg-gray-100/80 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleScopeChange('month')}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  categoryScope === 'month'
                    ? 'bg-white text-[#2F6BFF] font-bold shadow-sm'
                    : 'text-[#5F6C7B] hover:text-[#0F234F]'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('allTime')}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  categoryScope === 'allTime'
                    ? 'bg-white text-[#2F6BFF] font-bold shadow-sm'
                    : 'text-[#5F6C7B] hover:text-[#0F234F]'
                }`}
              >
                All Time
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {categoryLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner />
              </div>
            ) : monthly.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-[#5F6C7B]">
                No categorized spending recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthly}
                        dataKey="total"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {monthly.map((entry, idx) => (
                          <Cell
                            key={entry.categoryId}
                            fill={PAYTRACK_COLORS[idx % PAYTRACK_COLORS.length]}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend List */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {monthly.map((item, idx) => {
                    const pct = monthlyTotal > 0 ? ((item.total / monthlyTotal) * 100).toFixed(1) : '0';
                    const color = PAYTRACK_COLORS[idx % PAYTRACK_COLORS.length];
                    return (
                      <div key={item.categoryId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span className="truncate font-medium text-[#0F234F]">{item.categoryName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          <span className="font-semibold text-[#5F6C7B]">{pct}%</span>
                          <span className="font-bold text-[#0F234F]">{formatCurrency(item.total)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Monthly Trend Bar Chart */}
        <Card className="border border-[#D8E0EA] bg-white shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#D8E0EA]/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-[#0F234F]">
              <BarChart3 size={18} className="text-[#15C7B8]" />
              Monthly Comparison (12 Months)
            </CardTitle>
            <span className="text-xs font-semibold text-[#5F6C7B]">Year-to-Date</span>
          </CardHeader>
          <CardContent className="pt-6">
            {trend.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-[#5F6C7B]">
                No trend data recorded.
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                      tick={{ fill: '#5F6C7B' }}
                    />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={38}>
                      {trend.map((_, idx) => (
                        <Cell key={idx} fill={PAYTRACK_COLORS[idx % PAYTRACK_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── CHARTS ROW 2: CUMULATIVE EXPENSE AREA CHART ────────────────────── */}
      <Card className="border border-[#D8E0EA] bg-white shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#D8E0EA]/60 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-[#0F234F]">
            <LineChart size={18} className="text-[#6C3BFF]" />
            Cumulative Spending Progression
          </CardTitle>
          <span className="text-xs font-semibold text-[#5F6C7B]">Total Growth Trajectory</span>
        </CardHeader>
        <CardContent className="pt-6">
          {cumulativeTrend.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-[#5F6C7B]">
              No data available.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#15C7B8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#5F6C7B' }} />
                  <YAxis
                    tickFormatter={(v) => `RM${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fill: '#5F6C7B' }}
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative Total"
                    stroke="#2F6BFF"
                    strokeWidth={3}
                    fill="url(#cumGrad)"
                    dot={{ r: 4, fill: '#2F6BFF', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#2F6BFF', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DETAILED CATEGORY BREAKDOWN TABLE ──────────────────────────────── */}
      <Card className="border border-[#D8E0EA] bg-white shadow-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#D8E0EA]/60 pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-[#0F234F]">
            <Layers size={18} className="text-[#FFA51F]" />
            Monthly Category Summary Table
          </CardTitle>
          <span className="text-xs font-bold text-[#2F6BFF]">Total: {formatCurrency(monthlyTotal)}</span>
        </CardHeader>
        <CardContent className="pt-4">
          {monthly.length === 0 ? (
            <p className="py-4 text-sm text-[#5F6C7B]">No category records found for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#D8E0EA] text-xs font-bold uppercase tracking-wider text-[#5F6C7B]">
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4 text-right">Total Claimed</th>
                    <th className="py-3 px-4 text-right">Share (%)</th>
                    <th className="py-3 px-4">Share Bar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E0EA]/60">
                  {monthly.map((m, idx) => {
                    const pct = monthlyTotal > 0 ? (m.total / monthlyTotal) * 100 : 0;
                    const color = PAYTRACK_COLORS[idx % PAYTRACK_COLORS.length];
                    return (
                      <tr key={m.categoryId} className="hover:bg-[#F5F7FB] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#0F234F]">{m.categoryName}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#0F234F]">{formatCurrency(m.total)}</td>
                        <td className="py-3 px-4 text-right font-medium text-[#5F6C7B]">{pct.toFixed(1)}%</td>
                        <td className="py-3 px-4 w-48">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
