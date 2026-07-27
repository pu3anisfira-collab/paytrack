const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/prisma');
const { requireAuth, checkRole } = require('../../middleware/auth');
const { ApiError } = require('../../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

// GET /api/categories - returns parent-child tree, active only unless includeInactive=true
router.get('/', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { fields: { orderBy: { displayOrder: 'asc' } } },
    });

    const byId = new Map(categories.map((c) => [c.id, { ...c, children: [] }]));
    const roots = [];
    byId.forEach((cat) => {
      if (cat.parentId && byId.has(cat.parentId)) {
        byId.get(cat.parentId).children.push(cat);
      } else {
        roots.push(cat);
      }
    });

    res.json({ categories: roots });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id/fields
router.get('/:id/fields', async (req, res, next) => {
  try {
    const fields = await prisma.categoryField.findMany({
      where: { categoryId: req.params.id },
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ fields });
  } catch (err) {
    next(err);
  }
});

const categorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

// POST /api/categories (Manager only)
router.post('/', checkRole(['manager']), async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id (Manager only)
router.put('/:id', checkRole(['manager']), async (req, res, next) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id (Manager only) - soft delete to preserve history
router.delete('/:id', checkRole(['manager']), async (req, res, next) => {
  try {
    const inUse = await prisma.transaction.count({ where: { categoryId: req.params.id } });
    if (inUse > 0) {
      const category = await prisma.category.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      return res.json({ category, note: 'Category is in use by transactions; deactivated instead of deleted.' });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
});

const fieldSchema = z.object({
  fieldName: z.string().min(1),
  fieldKey: z.string().min(1).regex(/^[a-zA-Z0-9_]+$/, 'fieldKey must be alphanumeric/underscore.'),
  fieldType: z.enum(['text', 'number', 'date', 'textarea', 'select']),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

// POST /api/categories/:id/fields (Manager only)
router.post('/:id/fields', checkRole(['manager']), async (req, res, next) => {
  try {
    const data = fieldSchema.parse(req.body);
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) throw new ApiError(404, 'Category not found.');

    const field = await prisma.categoryField.create({
      data: { ...data, categoryId: req.params.id, options: data.options || undefined },
    });
    res.status(201).json({ field });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id/fields/:fieldId (Manager only)
router.put('/:id/fields/:fieldId', checkRole(['manager']), async (req, res, next) => {
  try {
    const data = fieldSchema.partial().parse(req.body);
    const field = await prisma.categoryField.update({
      where: { id: req.params.fieldId },
      data,
    });
    res.json({ field });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id/fields/:fieldId (Manager only)
router.delete('/:id/fields/:fieldId', checkRole(['manager']), async (req, res, next) => {
  try {
    await prisma.categoryField.delete({ where: { id: req.params.fieldId } });
    res.json({ message: 'Field deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
