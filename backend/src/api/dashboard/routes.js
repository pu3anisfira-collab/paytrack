const express = require('express');
const prisma = require('../../config/prisma');
const { requireAuth, checkRole } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAuth, checkRole(['manager']));

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  return new Date(d.setDate(diff));
}

// GET /api/dashboard/summary
router.get('/summary', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThisWeek = startOfWeek(now);

    const [totalAgg, monthAgg, weekAgg, categoriesUsed] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, _count: true }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfThisWeek } } }),
      prisma.transaction.groupBy({ by: ['categoryId'], where: { categoryId: { not: null } } }),
    ]);

    res.json({
      totalSpend: totalAgg._sum.amount || 0,
      totalTransactions: totalAgg._count,
      monthSpend: monthAgg._sum.amount || 0,
      weekSpend: weekAgg._sum.amount || 0,
      categoriesUsed: categoriesUsed.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/category-breakdown - top categories for a given month or all time
router.get('/category-breakdown', async (req, res, next) => {
  try {
    const { month, year, limit, allTime } = req.query;
    let whereClause = { categoryId: { not: null } };

    if (!allTime && (month || year)) {
      const now = new Date();
      const y = year ? Number(year) : now.getFullYear();
      const m = month ? Number(month) - 1 : now.getMonth();
      const from = new Date(y, m, 1);
      const to = new Date(y, m + 1, 1);
      whereClause.date = { gte: from, lt: to };
    }

    let grouped = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: whereClause,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: Number(limit) || 10,
    });

    // Fallback to all-time if current month query returned no records
    if (grouped.length === 0 && !allTime && !month && !year) {
      grouped = await prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { categoryId: { not: null } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: Number(limit) || 10,
      });
    }

    const categoryIds = grouped.map((g) => g.categoryId);
    const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const nameMap = new Map(categories.map((c) => [c.id, c.name]));

    const data = grouped.map((g) => ({
      categoryId: g.categoryId,
      categoryName: nameMap.get(g.categoryId) || 'Unknown',
      total: Number(g._sum.amount || 0),
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/trend - Spending trend grouped by period (days, weeks, months, years)
router.get('/trend', async (req, res, next) => {
  try {
    const period = (req.query.period || 'months').toLowerCase();
    const now = new Date();
    let trend = [];

    if (period === 'days' || period === 'day') {
      // Last 30 days
      const days = [];
      for (let i = 29; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        days.push(d);
      }
      trend = await Promise.all(
        days.map(async (d) => {
          const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
          const to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0);
          const agg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { date: { gte: from, lt: to } },
          });
          return {
            label: d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }),
            total: Number(agg._sum.amount || 0),
          };
        })
      );
    } else if (period === 'weeks' || period === 'week') {
      // Last 12 weeks
      const weeks = [];
      for (let i = 11; i >= 0; i -= 1) {
        const currentRef = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        const start = startOfWeek(currentRef);
        weeks.push(start);
      }
      trend = await Promise.all(
        weeks.map(async (start) => {
          const from = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
          const to = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 0, 0, 0);
          const agg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { date: { gte: from, lt: to } },
          });
          return {
            label: start.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }),
            total: Number(agg._sum.amount || 0),
          };
        })
      );
    } else if (period === 'years' || period === 'year') {
      // Last 5 years
      const years = [];
      const currentYear = now.getFullYear();
      for (let i = 4; i >= 0; i -= 1) {
        years.push(currentYear - i);
      }
      trend = await Promise.all(
        years.map(async (yr) => {
          const from = new Date(yr, 0, 1);
          const to = new Date(yr + 1, 0, 1);
          const agg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { date: { gte: from, lt: to } },
          });
          return {
            label: String(yr),
            total: Number(agg._sum.amount || 0),
          };
        })
      );
    } else {
      // Default: months (last 12 months)
      const months = [];
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() });
      }

      trend = await Promise.all(
        months.map(async ({ year, month }) => {
          const from = new Date(year, month, 1);
          const to = new Date(year, month + 1, 1);
          const agg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { date: { gte: from, lt: to } },
          });
          return {
            label: from.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' }),
            total: Number(agg._sum.amount || 0),
          };
        })
      );
    }

    res.json({ trend });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
