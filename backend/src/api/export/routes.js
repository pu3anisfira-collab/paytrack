const express = require('express');
const prisma = require('../../config/prisma');
const { requireAuth, checkRole } = require('../../middleware/auth');
const exportService = require('../../services/exportService');

const router = express.Router();
router.use(requireAuth, checkRole(['manager']));

async function fetchFilteredTransactions(filters) {
  const { dateFrom, dateTo, categoryId, source, staffId } = filters;
  const where = {};
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  if (categoryId) where.categoryId = categoryId;
  if (source) where.source = source;
  if (staffId) where.userId = staffId;

  return prisma.transaction.findMany({
    where,
    orderBy: { date: 'asc' },
    include: { category: true, user: true, extras: true },
  });
}

// POST /api/export/csv
router.post('/csv', async (req, res, next) => {
  try {
    const { includeExtras, includeSummary, ...filters } = req.body;
    const transactions = await fetchFilteredTransactions(filters);
    const csv = exportService.toCsv(transactions, { includeExtras, includeSummary });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// POST /api/export/xlsx
router.post('/xlsx', async (req, res, next) => {
  try {
    const { includeExtras, includeSummary, ...filters } = req.body;
    const transactions = await fetchFilteredTransactions(filters);
    const buffer = await exportService.toXlsx(transactions, { includeExtras, includeSummary });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

// POST /api/export/pdf
router.post('/pdf', async (req, res, next) => {
  try {
    const { includeExtras, includeSummary, categoryName, ...filters } = req.body;
    const transactions = await fetchFilteredTransactions(filters);
    const buffer = await exportService.toPdf(transactions, {
      includeExtras,
      includeSummary,
      filters: { ...filters, category: categoryName },
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
