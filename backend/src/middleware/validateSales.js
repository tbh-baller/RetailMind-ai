// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates UUID format
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid);
}

/**
 * Validates ISO date format (YYYY-MM-DD)
 */
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * Checks if date is not in the future
 */
function isNotFutureDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

/**
 * Middleware to validate POST /api/v1/sales request
 * Expected body: { product_id, qty_sold, sale_date }
 */
export function validateCreateSale(req, _res, next) {
  const { product_id, qty_sold, sale_date } = req.body;
  const errors = [];

  // Validate product_id (UUID)
  if (!product_id) {
    errors.push("product_id is required");
  } else if (!isValidUUID(product_id)) {
    errors.push("product_id must be a valid UUID");
  }

  // Validate qty_sold (integer > 0)
  if (qty_sold === undefined || qty_sold === "") {
    errors.push("qty_sold is required");
  } else if (!Number.isInteger(Number(qty_sold))) {
    errors.push("qty_sold must be an integer");
  } else if (Number(qty_sold) <= 0) {
    errors.push("qty_sold must be greater than 0");
  }

  // Validate sale_date (ISO date, not future)
  if (!sale_date) {
    errors.push("sale_date is required");
  } else if (!isValidDate(sale_date)) {
    errors.push("sale_date must be a valid date in YYYY-MM-DD format");
  } else if (!isNotFutureDate(sale_date)) {
    errors.push("sale_date cannot be in the future");
  }

  if (errors.length > 0) {
    const err = new Error(errors.join("; "));
    err.statusCode = 422; // 422 Unprocessable Entity
    return next(err);
  }

  next();
}
