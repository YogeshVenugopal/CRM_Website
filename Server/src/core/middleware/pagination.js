export const paginate = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  req.pagination = {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  };

  next();
};

export const buildPaginationMeta = (total, { page, limit }) => {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export default paginate;
