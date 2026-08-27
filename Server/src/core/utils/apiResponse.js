export const sendSuccess = (res, { data = null, meta = {}, statusCode = 200 } = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(Object.keys(meta).length > 0 && { meta }),
  });
};

export const sendError = (res, { message, code = 'ERROR', details = {}, statusCode = 500 } = {}) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(Object.keys(details).length > 0 && { details }),
    },
  });
};
