const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

function formatCurrency(value) {
  return `RM ${Number(value || 0).toFixed(2)}`;
}

// ── Human-readable label mapper for extra field keys ───────────────────────
const FIELD_LABEL_MAP = {
  staff_name: 'Staff Name',
  vehicle_type: 'Vehicle Type',
  car_brand: 'Vehicle Brand',
  license_plate: 'License Plate',
  objectives: 'Objectives',
  total_distance_km: 'Total Distance (km)',
  mileage_segments: 'Route Segments',
};

function formatFieldValue(key, value) {
  if (!value) return '';
  if (key === 'mileage_segments') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((s) => s.isSaved || s.from || s.to)
          .map((s) => `${s.from || '?'} → ${s.to || '?'}${s.distanceKm ? ` (${s.distanceKm}km)` : ''}`)
          .join('; ');
      }
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function buildRows(transactions, includeExtras) {
  return transactions.map((t) => {
    const base = {
      Date: t.date ? new Date(t.date).toISOString().slice(0, 10) : '',
      Description: t.description || '',
      Category: t.category?.name || 'Uncategorized',
      PaymentMode: t.paymentMode || '',
      Amount: Number(t.amount || 0),
      Source: t.source || '',
      Staff: t.user?.fullName || '',
      Remarks: t.remarks || '',
    };

    if (includeExtras && t.extras?.length) {
      base.ExtraFields = t.extras
        .map((e) => {
          const label = FIELD_LABEL_MAP[e.fieldKey] || e.fieldKey;
          const val = formatFieldValue(e.fieldKey, e.fieldValue);
          return `${label}: ${val}`;
        })
        .filter(Boolean)
        .join(' | ');
    } else if (includeExtras) {
      base.ExtraFields = '';
    }

    return base;
  });
}

function buildSummary(transactions) {
  const byCategory = new Map();
  let total = 0;
  transactions.forEach((t) => {
    const name = t.category?.name || 'Uncategorized';
    byCategory.set(name, (byCategory.get(name) || 0) + Number(t.amount || 0));
    total += Number(t.amount || 0);
  });
  return {
    byCategory: Array.from(byCategory.entries()).map(([category, amount]) => ({ category, amount })),
    total,
  };
}

// ── CSV EXPORT ─────────────────────────────────────────────────────────────
function toCsv(transactions, { includeExtras = false, includeSummary = false } = {}) {
  const rows = buildRows(transactions, includeExtras);
  const defaultHeaders = ['Date', 'Description', 'Category', 'PaymentMode', 'Amount', 'Source', 'Staff', 'Remarks'];
  if (includeExtras) defaultHeaders.push('ExtraFields');

  const headers = rows.length ? Object.keys(rows[0]) : defaultHeaders;
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];

  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(',')));

  if (includeSummary) {
    const summary = buildSummary(transactions);
    lines.push('');
    lines.push('Summary Totals by Category');
    lines.push('Category,Amount (RM)');
    summary.byCategory.forEach((s) => lines.push(`${escape(s.category)},${s.amount.toFixed(2)}`));
    lines.push(`${escape('TOTAL')},${summary.total.toFixed(2)}`);
  }

  return lines.join('\n');
}

// ── EXCEL (XLSX) EXPORT ───────────────────────────────────────────────────
async function toXlsx(transactions, { includeExtras = false, includeSummary = false } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PayTrack - Claim & Expenses Tracking System';

  const dataSheet = workbook.addWorksheet('Transactions');
  const rows = buildRows(transactions, includeExtras);
  const defaultHeaders = ['Date', 'Description', 'Category', 'PaymentMode', 'Amount', 'Source', 'Staff', 'Remarks'];
  if (includeExtras) defaultHeaders.push('ExtraFields');

  const headers = rows.length ? Object.keys(rows[0]) : defaultHeaders;

  dataSheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: h === 'Description' || h === 'ExtraFields' ? 40 : 18,
  }));

  // Style Header Row in PayTrack Navy (#0F234F) with white bold text
  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F234F' } };
  headerRow.height = 24;

  rows.forEach((row) => {
    const r = dataSheet.addRow(row);
    r.height = 20;
  });

  dataSheet.getColumn('Amount').numFmt = '#,##0.00';

  if (includeSummary) {
    const summary = buildSummary(transactions);
    const summarySheet = workbook.addWorksheet('Category Summary');
    summarySheet.columns = [
      { header: 'Category', key: 'category', width: 32 },
      { header: 'Amount (RM)', key: 'amount', width: 20 },
    ];

    const sumHeader = summarySheet.getRow(1);
    sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F234F' } };
    sumHeader.height = 24;

    summary.byCategory.forEach((s) => {
      const r = summarySheet.addRow(s);
      r.height = 20;
    });

    const totalRow = summarySheet.addRow({ category: 'TOTAL', amount: summary.total });
    totalRow.font = { bold: true };
    totalRow.height = 22;
    summarySheet.getColumn('amount').numFmt = '#,##0.00';
  }

  return workbook.xlsx.writeBuffer();
}

// ── PDF EXPORT (with Logo & PayTrack Styling) ──────────────────────────────
function toPdf(transactions, { includeExtras = false, includeSummary = false, filters = {} } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Locate logo images (fallback safely if missing)
    const logoPath = path.join(__dirname, '../assets/logo.png');
    const logoNamePath = path.join(__dirname, '../assets/logo name.png');

    // ── HEADER WITH LOGO ─────────────────────────────────────────────────
    let currentY = 35;
    const hasLogo = fs.existsSync(logoPath);
    const hasLogoName = fs.existsSync(logoNamePath);

    if (hasLogo && hasLogoName) {
      doc.image(logoPath, 40, currentY, { width: 36, height: 36 });
      doc.image(logoNamePath, 84, currentY + 6, { height: 24 });
      currentY += 45;
    } else if (hasLogo) {
      doc.image(logoPath, 40, currentY, { width: 36, height: 36 });
      doc.fontSize(20).fillColor('#0F234F').text('PayTrack', 84, currentY + 6);
      currentY += 45;
    } else {
      doc.fontSize(22).fillColor('#0F234F').text('PayTrack', 40, currentY);
      doc.fontSize(10).fillColor('#5F6C7B').text('Claim & Expenses Tracking System', 40, currentY + 24);
      currentY += 45;
    }

    // Report Sub-title
    doc.fontSize(16).fillColor('#0F234F').text('OFFICIAL EXPENSE CLAIM REPORT', 40, currentY, { underline: false });
    doc.fontSize(9).fillColor('#5F6C7B').text('Track Every Ringgit, Trust Every Claim', 40, currentY + 20);
    currentY += 38;

    // Filter Summary Box
    doc.rect(40, currentY, 515, 38).fillAndStroke('#F5F7FB', '#D8E0EA');
    doc.fontSize(9).fillColor('#0F234F');
    doc.text(`Generated: ${new Date().toLocaleString('en-MY')}`, 50, currentY + 6);
    doc.text(`Total Records: ${transactions.length}`, 320, currentY + 6);

    const filterText = [
      filters.dateFrom || filters.dateTo ? `Date Range: ${filters.dateFrom || 'Any'} to ${filters.dateTo || 'Any'}` : null,
      filters.category ? `Category: ${filters.category}` : null,
      filters.source ? `Source: ${filters.source}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    doc.fontSize(8).fillColor('#5F6C7B').text(filterText || 'Scope: All Transactions', 50, currentY + 20);
    currentY += 50;

    // ── TRANSACTION TABLE ────────────────────────────────────────────────
    const rows = buildRows(transactions, includeExtras);
    const colWidths = includeExtras
      ? [50, 110, 80, 55, 60, 55, 105] // Total 515
      : [55, 150, 95, 65, 75, 75];     // Total 515

    const headers = includeExtras
      ? ['Date', 'Description', 'Category', 'Mode', 'Amount', 'Source', 'Extra Details']
      : ['Date', 'Description', 'Category', 'Mode', 'Amount', 'Source'];

    function drawHeader(yPos) {
      doc.rect(40, yPos, 515, 20).fill('#0F234F');
      doc.fontSize(9).fillColor('#FFFFFF');
      let x = 40;
      headers.forEach((h, i) => {
        const align = h === 'Amount' ? 'right' : 'left';
        doc.text(h, x + 4, yPos + 5, { width: colWidths[i] - 8, align });
        x += colWidths[i];
      });
    }

    let y = currentY;
    drawHeader(y);
    y += 22;

    doc.fontSize(8).fillColor('#0F234F');
    rows.forEach((row, idx) => {
      if (y > 750) {
        doc.addPage();
        y = 40;
        drawHeader(y);
        y += 22;
      }

      // Alternating row background
      if (idx % 2 === 0) {
        doc.rect(40, y - 2, 515, 18).fill('#F5F7FB');
        doc.fillColor('#0F234F');
      }

      let x = 40;
      const values = includeExtras
        ? [
            row.Date,
            row.Description,
            row.Category,
            row.PaymentMode,
            formatCurrency(row.Amount),
            row.Source,
            row.ExtraFields || '-',
          ]
        : [
            row.Date,
            row.Description,
            row.Category,
            row.PaymentMode,
            formatCurrency(row.Amount),
            row.Source,
          ];

      values.forEach((v, i) => {
        const align = headers[i] === 'Amount' ? 'right' : 'left';
        doc.text(String(v ?? ''), x + 4, y, { width: colWidths[i] - 8, height: 16, ellipsis: true, align });
        x += colWidths[i];
      });
      y += 18;
    });

    // Total Summary Section
    const grandTotal = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    y += 10;
    if (y > 740) {
      doc.addPage();
      y = 40;
    }

    doc.rect(40, y, 515, 24).fill('#2F6BFF');
    doc.fontSize(10).fillColor('#FFFFFF');
    doc.text('TOTAL CLAIMED AMOUNT', 50, y + 7);
    doc.text(formatCurrency(grandTotal), 380, y + 7, { width: 165, align: 'right' });
    y += 40;

    // Optional Category Summary Page
    if (includeSummary) {
      const summary = buildSummary(transactions);
      doc.addPage();

      let sumY = 40;
      if (hasLogo && hasLogoName) {
        doc.image(logoPath, 40, sumY, { width: 30, height: 30 });
        doc.image(logoNamePath, 78, sumY + 5, { height: 20 });
        sumY += 40;
      }

      doc.fontSize(16).fillColor('#0F234F').text('Category Breakdown Summary', 40, sumY);
      sumY += 25;

      doc.rect(40, sumY, 515, 20).fill('#0F234F');
      doc.fontSize(9).fillColor('#FFFFFF');
      doc.text('Category', 50, sumY + 5);
      doc.text('Total Amount (RM)', 380, sumY + 5, { width: 165, align: 'right' });
      sumY += 22;

      summary.byCategory
        .sort((a, b) => b.amount - a.amount)
        .forEach((s, idx) => {
          if (idx % 2 === 0) {
            doc.rect(40, sumY - 2, 515, 18).fill('#F5F7FB');
            doc.fillColor('#0F234F');
          }
          doc.fontSize(9).text(s.category, 50, sumY);
          doc.text(formatCurrency(s.amount), 380, sumY, { width: 165, align: 'right' });
          sumY += 18;
        });

      sumY += 10;
      doc.rect(40, sumY, 515, 22).fill('#2F6BFF');
      doc.fontSize(10).fillColor('#FFFFFF');
      doc.text('GRAND TOTAL', 50, sumY + 6);
      doc.text(formatCurrency(summary.total), 380, sumY + 6, { width: 165, align: 'right' });
    }

    doc.end();
  });
}

module.exports = { toCsv, toXlsx, toPdf };
