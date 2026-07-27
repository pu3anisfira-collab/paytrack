const fs = require('fs');
const Papa = require('papaparse');
const XLSX = require('xlsx');
const PDFJS = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
const { parseFlexibleDate, parseAmount } = require('../utils/dateParser');
const { ApiError } = require('../middleware/errorHandler');

// Maps raw strings from CSV/Excel/PDF imports to canonical payment mode values
const PAYMENT_MODE_MAP = {
  // Touch 'n Go variants
  'tng': 'TNG',
  'tng ewallet': 'TNG',
  'touch n go': 'TNG',
  "touch 'n go": 'TNG',
  'touchngo': 'TNG',
  // GrabPay
  'grabpay': 'GrabPay',
  'grab': 'GrabPay',
  // ShopeePay
  'shopeepay': 'ShopeePay',
  'shopee': 'ShopeePay',
  // Boost
  'boost': 'Boost',
  // MAE / Maybank
  'mae': 'MAE',
  'maybank': 'MAE',
  'maybank2u': 'MAE',
  'm2u': 'MAE',
  // BigPay
  'bigpay': 'BigPay',
  // Setel
  'setel': 'Setel',
  // DuitNow
  'duitnow': 'DuitNow',
  'duit now': 'DuitNow',
  'online': 'DuitNow',  // legacy → DuitNow
  // FPX
  'fpx': 'FPX',
  // Cards
  'visa': 'Visa',
  'mastercard': 'Mastercard',
  'credit card': 'Visa',
  'creditcard': 'Visa',
  // Cash
  'cash': 'Cash',
  // Epay (legacy)
  'epay': 'TNG',
};

function normalizePaymentMode(raw) {
  if (!raw) return 'DuitNow';
  const key = String(raw).trim().toLowerCase();
  return PAYMENT_MODE_MAP[key] || 'DuitNow';
}


/** Finds the best-matching column name from a row's keys, case-insensitively. */
function findColumn(row, candidates) {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === candidate);
    if (found) return found;
  }
  // partial match fallback
  for (const candidate of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase().includes(candidate));
    if (found) return found;
  }
  return null;
}

function rowsToRecords(rows) {
  const records = [];
  const errors = [];

  rows.forEach((row, idx) => {
    const dateCol = findColumn(row, ['date', 'transaction date', 'txn date']);
    const descCol = findColumn(row, ['description', 'details', 'remark', 'narrative']);
    const amountCol = findColumn(row, ['amount', 'amount (rm)', 'value']);
    const modeCol = findColumn(row, ['payment mode', 'mode', 'payment method', 'channel']);

    const rawDate = dateCol ? row[dateCol] : null;
    const rawAmount = amountCol ? row[amountCol] : null;

    const date = parseFlexibleDate(rawDate);
    const amount = parseAmount(rawAmount);
    const description = descCol ? String(row[descCol] || '').trim() : '';

    if (!date || amount === null || !description) {
      errors.push(`Row ${idx + 2}: could not parse date/description/amount (raw: ${JSON.stringify(row)})`);
      return;
    }

    records.push({
      date,
      description,
      amount: Math.abs(amount),
      paymentMode: normalizePaymentMode(modeCol ? row[modeCol] : null),
    });
  });

  return { records, errors };
}

function parseCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  return rowsToRecords(parsed.data);
}

function parseXlsxFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rowsToRecords(rows);
}

// --- PDF parsing -----------------------------------------------------------
//
// TNG eWallet statement PDFs are text-based (not scanned images), so we can
// extract the raw text and pull transaction lines out with a regex. TNG
// statement lines are typically laid out like one of:
//
//   19/07/2026  Grab - Ride Payment            -15.50
//   19/07/2026 09:14  Payment to ABC Sdn Bhd    RM 42.00
//
// i.e. a date, a description, then an amount (optionally with a currency
// prefix and/or leading +/- sign) all on the same line.
//
// IMPORTANT: TNG's exact layout can vary by app version/region. If your real
// statement doesn't parse cleanly, check the `errors` array returned in the
// upload preview (each failed line is included) and adjust TNG_LINE_REGEX
// below to match your actual line format.
const TNG_LINE_REGEX =
  /^(?<date>\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s+(?<description>.+?)\s+(?<amount>[+-]?\s?(?:RM)?\s?-?\d[\d,]*\.\d{2})\s*$/i;

function parsePdfLines(text) {
  const records = [];
  const errors = [];

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Try multi-line block parsing (standard layout for new TNG PDF statements)
  const DATE_REGEX = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/;
  let i = 0;
  while (i < lines.length) {
    if (lines[i].match(DATE_REGEX)) {
      // Each transaction typically has 8 lines:
      // Date, Status, Transaction Type, Reference, Description, Details, Amount, Balance
      if (i + 7 < lines.length) {
        const potentialDate = lines[i];
        const potentialStatus = lines[i + 1];
        const potentialType = lines[i + 2];
        const potentialDesc = lines[i + 4];
        const potentialAmountRaw = lines[i + 6];

        const date = parseFlexibleDate(potentialDate);
        const looksLikeAmount = potentialAmountRaw.toUpperCase().includes('RM') || !isNaN(parseFloat(potentialAmountRaw.replace(/[^\d.-]/g, '')));

        if (date && looksLikeAmount) {
          const amount = parseAmount(potentialAmountRaw);
          const description = potentialDesc.trim();

          if (amount !== null && description) {
            records.push({
              date,
              description: `${potentialType}: ${description}`,
              amount: Math.abs(amount),
              paymentMode: 'Online',
            });
            i += 8; // skip this entire transaction block
            continue;
          }
        }
      }
    }
    i++;
  }

  // 2. Fallback to single-line regex parsing if no multi-line records were found
  if (records.length === 0) {
    lines.forEach((line, idx) => {
      const match = line.match(TNG_LINE_REGEX);
      if (!match || !match.groups) {
        return;
      }

      const date = parseFlexibleDate(match.groups.date);
      const amount = parseAmount(match.groups.amount);
      const description = match.groups.description.trim();

      if (!date || amount === null || !description) {
        errors.push(`Line ${idx + 1}: could not fully parse "${line}"`);
        return;
      }

      records.push({
        date,
        description,
        amount: Math.abs(amount),
        paymentMode: 'Online',
      });
    });
  }

  if (records.length === 0) {
    errors.push(
      'No transaction lines matched. The PDF text layout may differ from the expected format — see tngImportService.js (TNG_LINE_REGEX) to adjust the pattern for your statement.'
    );
  }

  return { records, errors };
}

async function parsePdfFile(filePath, password) {
  const buffer = fs.readFileSync(filePath);
  try {
    // Configure PDFJS to run in main thread without web workers to avoid pathing/cross-origin issues in Docker
    PDFJS.disableWorker = true;

    const docInitParams = {
      data: new Uint8Array(buffer),
    };
    if (password) {
      docInitParams.password = password;
    }

    const doc = await PDFJS.getDocument(docInitParams);

    let text = '';
    const numPages = doc.numPages;
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      });

      let lastY;
      let pageText = '';
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          pageText += item.str;
        } else {
          pageText += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      text += `\n\n${pageText}`;
    }

    await doc.destroy();
    try {
      const path = require('path');
      fs.writeFileSync(path.join(path.dirname(filePath), 'raw_pdf_text.txt'), text);
    } catch (e) {
      console.error('Failed to write debug raw_pdf_text.txt', e);
    }
    return parsePdfLines(text);
  } catch (err) {
    const isPasswordError =
      err.name === 'PasswordException' ||
      (err.message && err.message.toLowerCase().includes('password'));

    if (isPasswordError) {
      if (!password) {
        throw new ApiError(400, 'This PDF is password-protected. Please enter a password to import.');
      } else {
        throw new ApiError(400, 'Incorrect password. Please try again.');
      }
    }
    throw err;
  }
}

async function parseImportFile(filePath, originalName, password) {
  if (originalName.match(/\.csv$/i)) return parseCsvFile(filePath);
  if (originalName.match(/\.(xlsx|xls)$/i)) return parseXlsxFile(filePath);
  if (originalName.match(/\.pdf$/i)) return parsePdfFile(filePath, password);
  throw new Error('Unsupported file type. Please upload a .csv, .xlsx, or .pdf file.');
}

module.exports = { parseImportFile };
