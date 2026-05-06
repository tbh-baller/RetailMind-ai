import * as productsService from "../services/products.service.js";

const allowedCategories = ["Pharmacy", "Dairy", "Grocery", "Beverage", "Snacks", "Household"];
const allowedCategoriesByLowercase = new Map(
  allowedCategories.map(category => [category.toLowerCase(), category])
);
const requiredFields = ["name", "sku", "category", "stock", "price", "expiry"];

function normalizeCategory(category) {
  return allowedCategoriesByLowercase.get(String(category || "").trim().toLowerCase()) || null;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      row += char + nextChar;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      row += char;
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }

      if (row.trim()) {
        rows.push(parseCsvLine(row));
      }

      row = "";
      continue;
    }

    row += char;
  }

  if (row.trim()) {
    rows.push(parseCsvLine(row));
  }

  return rows;
}

function validateProductRow(row) {
  for (const field of requiredFields) {
    if (typeof row[field] !== "string" || row[field].trim() === "") {
      return `${field} is required`;
    }
  }

  if (!normalizeCategory(row.category)) {
    return `Invalid category. Valid categories: ${allowedCategories.join(", ")}`;
  }

  const stock = Number(row.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    return "stock must be an integer >= 0";
  }

  const price = Number(row.price);
  if (!Number.isFinite(price) || price <= 0) {
    return "price must be a number > 0";
  }

  if (Number.isNaN(Date.parse(row.expiry))) {
    return "expiry must be a valid date";
  }

  return null;
}

export async function getProducts(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  const result = await productsService.getProductsWithPagination(page, limit, search);
  res.json(result);
}

export async function createProduct(req, res) {
  const product = await productsService.createProduct(req.body);
  res.status(201).json(product);
}

export async function updateProduct(req, res) {
  const product = await productsService.updateProduct(req.params.id, req.body);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json(product);
}

export async function deleteProduct(req, res) {
  const deleted = await productsService.deleteProduct(req.params.id);

  if (!deleted) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.status(204).send();
}

export async function bulkUploadProducts(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const csvText = req.file.buffer.toString("utf-8");
    const csvRows = parseCsvRows(csvText);

    if (csvRows.length < 2) {
      return res.status(400).json({
        successCount: 0,
        failedCount: 1,
        errors: [{ row: 0, message: "CSV must have headers and at least one row" }],
      });
    }

    const headers = csvRows[0].map(h => h.trim().replace(/^\uFEFF/, "").toLowerCase());
    console.log("HEADERS:", headers);

    const missing = requiredFields.filter(f => !headers.includes(f));

    if (missing.length > 0) {
      return res.status(400).json({
        successCount: 0,
        failedCount: 1,
        errors: [{ row: 0, message: `Missing required columns: ${missing.join(", ")}` }],
      });
    }

    const rows = [];
    const errors = [];

    for (let i = 1; i < csvRows.length; i++) {
      const cells = csvRows[i];
      const row = {};

      for (let j = 0; j < headers.length; j++) {
        if (requiredFields.includes(headers[j]) || ["reorder_level", "reorderlevel"].includes(headers[j])) {
          row[headers[j]] = cells[j] || "";
        }
      }

      console.log("ROW:", row);

      const validationMessage = validateProductRow(row);
      if (validationMessage) {
        errors.push({ row: i, message: validationMessage });
        continue;
      }

      const reorderLevelValue = row.reorder_level || row.reorderlevel;
      const reorderLevel = reorderLevelValue ? Number(reorderLevelValue) : 30;
      if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
        errors.push({ row: i, message: "reorder_level must be an integer >= 0" });
        continue;
      }

      rows.push({
        ...row,
        category: normalizeCategory(row.category),
        stock: Number(row.stock),
        price: Number(row.price),
        reorder_level: reorderLevel,
        __rowIndex: i,
      });
    }

    const upsertResult = await productsService.bulkCreateProducts(rows);
    const insertedCount = upsertResult.insertedCount;
    const updatedCount = upsertResult.updatedCount;
    errors.push(...upsertResult.errors);
    const failedCount = errors.length;

    const response = {
      insertedCount,
      updatedCount,
      failedCount,
      errors,
    };

    // If all rows failed (no inserts or updates), return error status
    if (insertedCount === 0 && updatedCount === 0) {
      return res.status(400).json(response);
    }

    res.status(201).json(response);
  } catch (error) {
    console.error("CSV upload error:", error.message);
    res.status(500).json({ message: error.message || "Failed to upload products" });
  }
}
