const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/prisma');
const { requireAuth, checkRole } = require('../../middleware/auth');
const { uploadReceipt } = require('../../middleware/upload');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const { ApiError } = require('../../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

// All accepted payment mode values (new + legacy for backward compat)
const PAYMENT_MODES = [
  // New values
  'TNG', 'GrabPay', 'ShopeePay', 'Boost', 'MAE', 'BigPay', 'Setel',
  'DuitNow', 'DuitNowQR', 'FPX',
  'Visa', 'Mastercard',
  'Cash',
  // Legacy values (kept so old records remain valid)
  'Online', 'M2U', 'CreditCard', 'Epay',
];


// GET /api/transactions - filters: dateFrom, dateTo, categoryId, source, search, staffId
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const { dateFrom, dateTo, categoryId, source, search, staffId, status } = req.query;

    const where = {};
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (categoryId) where.categoryId = categoryId;
    if (source) where.source = source;
    if (status) where.status = status;
    if (staffId) where.userId = staffId;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          category: true,
          user: { select: { id: true, fullName: true, username: true } },
          extras: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ transactions, pagination: buildPaginationMeta(total, page, pageSize) });
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { category: true, user: true, extras: true, importBatch: true },
    });
    if (!transaction) throw new ApiError(404, 'Transaction not found.');
    res.json({ transaction });
  } catch (err) {
    next(err);
  }
});

const extraSchema = z.object({
  fieldKey: z.string(),
  // Accept either 'fieldValue' (standard) or 'value' (mileage extras shorthand)
  fieldValue: z.string().optional(),
  value: z.string().optional(),
  fieldType: z.enum(['text', 'number', 'date', 'textarea', 'select']).optional().default('text'),
  fieldName: z.string().optional(),
}).transform((e) => ({
  fieldKey: e.fieldKey,
  fieldValue: e.fieldValue ?? e.value ?? '',
  fieldType: e.fieldType ?? 'text',
}));

const createTransactionSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  // Accept any string payment mode (new Malaysian methods + legacy values)
  paymentMode: z.string().min(1).refine(
    (v) => PAYMENT_MODES.includes(v),
    (v) => ({ message: `Unknown payment mode: "${v}". Accepted: ${PAYMENT_MODES.join(', ')}` }),
  ),
  amount: z.number().positive(),
  categoryId: z.string().min(1).optional().nullable(),
  remarks: z.string().optional(),
  status: z.enum(['draft', 'completed', 'archived']).optional(),
  extras: z.array(extraSchema).optional(),
});

// POST /api/transactions - manual entry (staff or manager)
router.post('/', uploadReceipt.single('receipt'), async (req, res, next) => {
  try {
    // multipart/form-data sends everything as strings; coerce before validation
    const body = { ...req.body };
    if (body.amount) body.amount = Number(body.amount);
    if (body.extras && typeof body.extras === 'string') body.extras = JSON.parse(body.extras);

    const data = createTransactionSchema.parse(body);
    const source = req.user.role === 'manager' ? 'manager_manual' : 'staff_manual';

    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(data.date),
        description: data.description,
        paymentMode: data.paymentMode,
        amount: data.amount,
        categoryId: data.categoryId || null,
        remarks: data.remarks,
        status: data.status || 'completed',
        source,
        userId: req.user.id,
        createdBy: req.user.id,
        receiptPath: req.file ? `receipts/${req.file.filename}` : null,
        extras: data.extras
          ? { create: data.extras.map((e) => ({ fieldKey: e.fieldKey, fieldValue: e.fieldValue, fieldType: e.fieldType })) }
          : undefined,
      },
      include: { category: true, extras: true },
    });

    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
});

const updateTransactionSchema = createTransactionSchema.partial();

// PUT /api/transactions/:id (Manager only)
router.put('/:id', checkRole(['manager']), uploadReceipt.single('receipt'), async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.amount) body.amount = Number(body.amount);
    if (body.extras && typeof body.extras === 'string') body.extras = JSON.parse(body.extras);

    const data = updateTransactionSchema.parse(body);

    const updateData = {
      ...(data.date && { date: new Date(data.date) }),
      ...(data.description && { description: data.description }),
      ...(data.paymentMode && { paymentMode: data.paymentMode }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      ...(data.remarks !== undefined && { remarks: data.remarks }),
      ...(data.status && { status: data.status }),
      ...(req.file && { receiptPath: `receipts/${req.file.filename}` }),
    };

    if (data.extras) {
      await prisma.transactionExtra.deleteMany({ where: { transactionId: req.params.id } });
      updateData.extras = {
        create: data.extras.map((e) => ({ fieldKey: e.fieldKey, fieldValue: e.fieldValue, fieldType: e.fieldType })),
      };
    }

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: updateData,
      include: { category: true, extras: true },
    });

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id (Manager only)
router.delete('/:id', checkRole(['manager']), async (req, res, next) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Transaction deleted.' });
  } catch (err) {
    next(err);
  }
});

const enrichSchema = z.object({
  categoryId: z.string().min(1),
  remarks: z.string().optional(),
  extras: z.array(extraSchema).optional(),
});

// POST /api/transactions/:id/enrich - add category/fields/receipt to an imported transaction
router.post('/:id/enrich', uploadReceipt.single('receipt'), async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.extras && typeof body.extras === 'string') body.extras = JSON.parse(body.extras);
    const data = enrichSchema.parse(body);

    if (data.extras) {
      await prisma.transactionExtra.deleteMany({ where: { transactionId: req.params.id } });
    }

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        categoryId: data.categoryId,
        remarks: data.remarks,
        status: 'completed',
        ...(req.file && { receiptPath: `receipts/${req.file.filename}` }),
        ...(data.extras && {
          extras: { create: data.extras.map((e) => ({ fieldKey: e.fieldKey, fieldValue: e.fieldValue, fieldType: e.fieldType })) },
        }),
      },
      include: { category: true, extras: true },
    });

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
