import { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, FileType, Filter, CheckCircle2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getCategories } from '@/services/categoryService';
import { exportCsv, exportPdf, exportXlsx } from '@/services/exportService';
import { flattenCategories } from '@/utils/categoryTree';
import type { Category } from '@/types';

export function ExportPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [source, setSource] = useState('');
  const [includeExtras, setIncludeExtras] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const flatCategories = flattenCategories(categories);
  const categoryName = flatCategories.find((c) => c.id === categoryId)?.name;

  function filters() {
    return {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      categoryId: categoryId || undefined,
      categoryName,
      source: source || undefined,
      includeExtras,
      includeSummary,
    };
  }

  async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      if (format === 'csv') await exportCsv(filters());
      if (format === 'xlsx') await exportXlsx(filters());
      if (format === 'pdf') await exportPdf(filters());
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="w-full space-y-6">

      {/* ── HEADER BANNER ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 rounded-2xl border border-[#D8E0EA] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2F6BFF]/10 text-[#2F6BFF]">
            <Download size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0F234F]">Export Transaction Records</h2>
            <p className="text-xs text-[#5F6C7B]">
              Generate and download customized expense reports, mileage summaries, and transaction logs.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── FILTER CONFIGURATION CARD (Spans 2 columns on lg+) ───────────── */}
        <Card className="lg:col-span-2 border border-[#D8E0EA] bg-white shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#D8E0EA]/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-[#0F234F]">
              <Filter size={18} className="text-[#2F6BFF]" />
              Filter & Scope Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">

            {/* Date Range */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">
                Date Range
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[#5F6C7B]">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border-[#D8E0EA] focus:border-[#2F6BFF]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#5F6C7B]">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border-[#D8E0EA] focus:border-[#2F6BFF]"
                  />
                </div>
              </div>
            </div>

            {/* Category & Source Dropdowns */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">
                  Category Filter
                </label>
                <Select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="border-[#D8E0EA] focus:border-[#2F6BFF]"
                >
                  <option value="">All Categories (Full Report)</option>
                  {flatCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0F234F]">
                  Source Filter
                </label>
                <Select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="border-[#D8E0EA] focus:border-[#2F6BFF]"
                >
                  <option value="">All Sources</option>
                  <option value="tng_import">TNG eWallet Import</option>
                  <option value="staff_manual">Staff Manual Claims</option>
                  <option value="manager_manual">Manager Manual Entry</option>
                </Select>
              </div>
            </div>

            {/* Included Options Checkboxes */}
            <div className="rounded-xl border border-[#D8E0EA]/80 bg-[#F5F7FB] p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F234F]">
                Export Details & Attachments
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[#0F234F]">
                  <input
                    type="checkbox"
                    checked={includeExtras}
                    onChange={(e) => setIncludeExtras(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D8E0EA] text-[#2F6BFF] focus:ring-[#2F6BFF]"
                  />
                  <span className="font-medium">Include extra fields (mileage, staff name, plate)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none text-sm text-[#0F234F]">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D8E0EA] text-[#2F6BFF] focus:ring-[#2F6BFF]"
                  />
                  <span className="font-medium">Include category breakdown summary</span>
                </label>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── EXPORT FORMAT SELECTION CARDS (Spans 1 column on lg+) ───────── */}
        <div className="flex flex-col gap-4 lg:col-span-1">

          {/* 1. CSV Format Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#15C7B8]/15 text-[#0E8A80]">
                <FileType size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F234F]">CSV Format</h3>
                <p className="mt-0.5 text-xs text-[#5F6C7B]">
                  Raw comma-separated data. Ideal for importing into third-party software or databases.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full font-bold border-[#15C7B8] text-[#0E8A80] hover:bg-[#15C7B8]/10 h-11"
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'csv' ? 'Exporting CSV…' : 'Download CSV'}
            </Button>
          </div>

          {/* 2. Excel (XLSX) Format Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#D8E0EA] bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00D4A3]/15 text-[#008A6A]">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F234F]">Excel Workbook (XLSX)</h3>
                <p className="mt-0.5 text-xs text-[#5F6C7B]">
                  Formatted spreadsheet with automated category summary formulas and auto-width columns.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full font-bold border-[#00D4A3] text-[#008A6A] hover:bg-[#00D4A3]/10 h-11"
              onClick={() => handleExport('xlsx')}
              disabled={exporting !== null}
            >
              {exporting === 'xlsx' ? 'Exporting Excel…' : 'Download Excel (.xlsx)'}
            </Button>
          </div>

          {/* 3. Official PDF Report Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#2F6BFF]/30 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2F6BFF]/15 text-[#2F6BFF]">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F234F]">Printable PDF Report</h3>
                <p className="mt-0.5 text-xs text-[#5F6C7B]">
                  Formal printable PDF document with station header, transaction table, and approval section.
                </p>
              </div>
            </div>
            <Button
              className="w-full bg-[#2F6BFF] text-white font-bold hover:bg-[#1E52D8] shadow-md shadow-[#2F6BFF]/25 h-11"
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
            >
              {exporting === 'pdf' ? 'Generating PDF…' : 'Download PDF Report'}
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
}
