/**
 * Parses page/pageSize query params into Prisma skip/take, with sane defaults
 * and upper bounds to prevent abuse.
 */
function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 200);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

function buildPaginationMeta(total, page, pageSize) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

module.exports = { parsePagination, buildPaginationMeta };
