import AppError from '../utils/AppError.js';

/**
 * validate — middleware factory that accepts a Zod schema.
 * Validates req.body by default, or req[key] if specified.
 *
 * Usage:
 *   validate(createUserSchema)          — validates req.body
 *   validate(querySchema, "query")      — validates req.query
 *   validate(paramsSchema, "params")    — validates req.params
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fieldErrors = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return next(
        new AppError('Validation failed', 422, 'VALIDATION_ERROR', { fields: fieldErrors }),
      );
    }

    // Replace with parsed/validated data (strips unknown fields by default)
    // Express 5 makes req.query read-only, so we merge instead
    if (source === 'query') {
      for (const key of Object.keys(result.data)) {
        req.query[key] = result.data[key];
      }
    } else {
      req[source] = result.data;
    }
    next();
  };
};

export default validate;
