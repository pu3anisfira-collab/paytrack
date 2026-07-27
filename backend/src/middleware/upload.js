const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const receiptsDir = path.join(config.uploadDir, 'receipts');
const importsDir = path.join(config.uploadDir, 'imports');
ensureDir(receiptsDir);
ensureDir(importsDir);

function uniqueName(originalName) {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${base}${ext}`;
}

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, receiptsDir),
  filename: (req, file, cb) => cb(null, uniqueName(file.originalname)),
});

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, importsDir),
  filename: (req, file, cb) => cb(null, uniqueName(file.originalname)),
});

const receiptFileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only image (png/jpg/webp) or PDF files are allowed for receipts.'));
};

const importFileFilter = (req, file, cb) => {
  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
  ];
  if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls|pdf)$/i)) {
    return cb(null, true);
  }
  cb(new Error('Only CSV, XLSX, or PDF files are allowed for TNG import.'));
};

const uploadReceipt = multer({
  storage: receiptStorage,
  fileFilter: receiptFileFilter,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});

const uploadImport = multer({
  storage: importStorage,
  fileFilter: importFileFilter,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});

module.exports = { uploadReceipt, uploadImport, receiptsDir, importsDir };
