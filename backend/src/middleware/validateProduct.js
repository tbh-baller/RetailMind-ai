const categories = ["Grocery", "Pharmacy", "Beverage", "Dairy", "Snacks"];
const categoriesByLowercase = new Map(
  categories.map(category => [category.toLowerCase(), category])
);
const statuses = ["healthy", "low", "expiring", "out"];

const numberFields = ["stock", "reorder_level", "price", "velocity"];

function normalizeCategory(category) {
  return categoriesByLowercase.get(String(category || "").trim().toLowerCase()) || null;
}

function validateProductFields(body, { partial = false } = {}) {
  const errors = [];

  const requiredFields = ["sku", "name", "category", "stock", "price", "expiry"];
  if (!partial) {
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === "") {
        errors.push(`${field} is required`);
      }
    }
  }

  if (body.category !== undefined) {
    const normalizedCategory = normalizeCategory(body.category);
    if (!normalizedCategory) {
      errors.push("category is invalid");
    } else {
      body.category = normalizedCategory;
    }
  }

  if (body.status !== undefined && !statuses.includes(body.status)) {
    errors.push("status is invalid");
  }

  for (const field of numberFields) {
    if (body[field] !== undefined && Number.isNaN(Number(body[field]))) {
      errors.push(`${field} must be a number`);
    }
  }

  if (body.expiry !== undefined && Number.isNaN(Date.parse(body.expiry))) {
    errors.push("expiry must be a valid date");
  }

  return errors;
}

export function validateCreateProduct(req, _res, next) {
  const errors = validateProductFields(req.body);
  if (errors.length) {
    const err = new Error(errors.join(", "));
    err.statusCode = 400;
    return next(err);
  }

  next();
}

export function validateUpdateProduct(req, _res, next) {
  const errors = validateProductFields(req.body, { partial: true });
  if (errors.length) {
    const err = new Error(errors.join(", "));
    err.statusCode = 400;
    return next(err);
  }

  next();
}
