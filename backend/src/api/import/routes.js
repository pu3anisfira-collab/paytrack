const express = require('express');
const prisma = require('../../config/prisma');
const { requireAuth } = require('../../middleware/auth');
const { uploadImport } = require('../../middleware/upload');
const { parseImportFile } = require('../../services/tngImportService');
const { ApiError } = require('../../middleware/errorHandler');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');

const router = express.Router();
router.use(requireAuth);

// POST /api/import/tng - upload file, create a pending batch (does not create transactions yet)
router.post('/tng', uploadImport.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded.');

    const { password } = req.body;
    const { records, errors } = await parseImportFile(req.file.path, req.file.originalname, password);

    const batch = await prisma.importBatch.create({
      data: {
        userId: req.user.id,
        fileName: req.file.originalname,
        filePath: `imports/${req.file.filename}`,
        totalRecords: records.length + errors.length,
        importedCount: 0,
        status: 'pending',
        errorLog: errors.length ? errors.join('\n') : null,
      },
    });

    // Stash parsed records temporarily on the batch response so the client
    // can review before confirming the actual import (process step).
    res.status(201).json({ batch, preview: records.slice(0, 50), parsedCount: records.length, errorCount: errors.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/import/tng/history
router.get('/tng/history', async (req, res, next) => {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const [batches, total] = await Promise.all([
      prisma.importBatch.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, username: true } } },
      }),
      prisma.importBatch.count(),
    ]);
    res.json({ batches, pagination: buildPaginationMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
});

// GET /api/import/tng/:batchId
router.get('/tng/:batchId', async (req, res, next) => {
  try {
    const batch = await prisma.importBatch.findUnique({
      where: { id: req.params.batchId },
      include: { transactions: { include: { category: true } } },
    });
    if (!batch) throw new ApiError(404, 'Import batch not found.');
    res.json({ batch });
  } catch (err) {
    next(err);
  }
});

// POST /api/import/tng/:batchId/process - re-parses file and creates draft transactions
router.post('/tng/:batchId/process', async (req, res, next) => {
  try {
    const { password } = req.body;
    const batch = await prisma.importBatch.findUnique({ where: { id: req.params.batchId } });
    if (!batch) throw new ApiError(404, 'Import batch not found.');
    if (batch.status === 'completed') {
      throw new ApiError(400, 'This batch has already been processed.');
    }

    await prisma.importBatch.update({ where: { id: batch.id }, data: { status: 'processing' } });

    const path = require('path');
    const config = require('../../config');
    const fullPath = path.join(config.uploadDir, batch.filePath.replace(/^imports\//, 'imports/'));
    const { records, errors } = await parseImportFile(fullPath, batch.fileName, password);

    const created = await prisma.$transaction(
      records.map((r) =>
        prisma.transaction.create({
          data: {
            userId: req.user.id,
            createdBy: req.user.id,
            date: r.date,
            description: r.description,
            amount: r.amount,
            paymentMode: r.paymentMode,
            source: 'tng_import',
            status: 'draft', // requires enrichment before it's "completed"
            importBatchId: batch.id,
          },
        })
      )
    );

    const updatedBatch = await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: 'completed',
        importedCount: created.length,
        errorLog: errors.length ? errors.join('\n') : batch.errorLog,
      },
    });

    res.json({ batch: updatedBatch, createdCount: created.length });
  } catch (err) {
    // Roll batch back to failed so it can be retried/inspected
    await prisma.importBatch
      .update({ where: { id: req.params.batchId }, data: { status: 'failed', errorLog: String(err.message || err) } })
      .catch(() => {});
    next(err);
  }
});

module.exports = router;
