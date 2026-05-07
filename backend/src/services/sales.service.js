import { pool } from "../config/db.js";

/**
 * Get sales with optional filtering
 * Filters: product_id, start_date, end_date, limit, offset
 * Excludes deleted sales (is_deleted = false)
 */
export async function getSalesWithFilters(filters) {
  const { product_id, start_date, end_date, limit, offset } = filters;

  let query = `
    SELECT 
      s.id,
      s.product_id,
      s.quantity AS qty_sold,
      s.sale_date,
      s.created_at,
      p.name AS product_name,
      p.sku,
      p.category,
      (s.quantity * p.price)::numeric AS total_value
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE s.is_deleted = FALSE
  `;

  const params = [];
  let paramCount = 1;

  // Filter by product_id
  if (product_id) {
    query += ` AND s.product_id = $${paramCount}`;
    params.push(product_id);
    paramCount++;
  }

  // Filter by start_date
  if (start_date) {
    query += ` AND s.sale_date >= $${paramCount}`;
    params.push(start_date);
    paramCount++;
  }

  // Filter by end_date
  if (end_date) {
    query += ` AND s.sale_date <= $${paramCount}`;
    params.push(end_date);
    paramCount++;
  }

  // Order and paginate
  query += ` ORDER BY s.sale_date DESC, s.created_at DESC`;
  query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get daily sales summary (total sales by date)
 * Optionally filtered by date range
 * Excludes deleted sales (is_deleted = false)
 */
export async function getSalesSummary(filters = {}) {
  const { start_date, end_date } = filters;

  let query = `
    SELECT 
      s.sale_date,
      COUNT(*) AS transaction_count,
      SUM(s.quantity) AS total_quantity,
      SUM(s.quantity * p.price)::numeric AS total_revenue
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE s.is_deleted = FALSE
  `;

  const params = [];
  let paramCount = 1;

  // Filter by start_date
  if (start_date) {
    query += ` AND s.sale_date >= $${paramCount}`;
    params.push(start_date);
    paramCount++;
  }

  // Filter by end_date
  if (end_date) {
    query += ` AND s.sale_date <= $${paramCount}`;
    params.push(end_date);
    paramCount++;
  }

  query += `
    GROUP BY s.sale_date
    ORDER BY s.sale_date DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 *  * Create a new sales transaction and decrement inventory stock.
 */
export async function createSaleAndReduceStock(saleData) {
  const { product_id, qty_sold, sale_date } = saleData;
  const quantity = Number(qty_sold);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `
      SELECT id, sku, name, stock, reorder_level
      FROM products
      WHERE id = $1 AND is_active = TRUE
      FOR UPDATE
      `,
      [product_id]
    );

    if (!productResult.rows.length) {
      const err = new Error("product_id does not exist");
      err.statusCode = 422;
      throw err;
    }

    const product = productResult.rows[0];
    const currentStock = Number(product.stock);

    if (currentStock < quantity) {
      const err = new Error("Insufficient stock");
      err.statusCode = 422;
      throw err;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const saleDateObj = new Date(sale_date);

    if (isNaN(saleDateObj.getTime()) || saleDateObj > today) {
      const err = new Error("sale_date cannot be in the future");
      err.statusCode = 422;
      throw err;
    }

    const saleResult = await client.query(
  `
  INSERT INTO sales (product_id, quantity, sale_date)
  VALUES ($1, $2, $3)
  RETURNING
    id,
    product_id,
    quantity AS qty_sold,
    sale_date,
    created_at
  `,
  [product_id, quantity, sale_date]
);

    if (!saleResult.rows.length) {
      const err = new Error("Failed to create sale");
      err.statusCode = 500;
      throw err;
    }

    const newStock = currentStock - quantity;
    const status = newStock === 0
      ? "out"
      : newStock <= Number(product.reorder_level)
        ? "low"
        : "healthy";

    await client.query(
      `
      UPDATE products
      SET stock = $1, status = $2, updated_at = NOW()
      WHERE id = $3
      `,
      [newStock, status, product_id]
    );

    await client.query("COMMIT");

    return {
      ...saleResult.rows[0],
      product_name: product.name,
      sku: product.sku,
      stock_remaining: newStock,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === '23503') {
      const err = new Error("product_id does not exist");
      err.statusCode = 422;
      err.code = 'FOREIGN_KEY_VIOLATION';
      throw err;
    }

    // Handle other database errors
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Legacy: Get all sales (without filtering)
 * Kept for backward compatibility
 * Excludes deleted sales
 */
export async function getAllSales() {
  const query = `
    SELECT 
      s.id,
      s.product_id,
      s.quantity AS qty_sold,
      s.sale_date,
      s.created_at,
      p.name AS product_name,
      p.sku,
      p.category,
      (s.quantity * p.price)::numeric AS total_value
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE s.is_deleted = FALSE
    ORDER BY s.sale_date DESC, s.created_at DESC
    LIMIT 100
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Bulk upload sales from CSV data
 * Each row: { sku, sale_date, quantity }
 * Uses UPSERT logic for each row
 * Returns { uploadedCount, errors }
 */
export async function bulkUploadSales(sales) {
  let uploadedCount = 0;
  const errors = [];

  for (let i = 0; i < sales.length; i++) {
    try {
      const { sku, sale_date, quantity } = sales[i];

      // Validate quantity
      if (!quantity || quantity <= 0) {
        errors.push({
          row: i + 2, // CSV row number (accounting for header)
          error: "Quantity must be greater than 0",
          sku
        });
        continue;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!sale_date || !dateRegex.test(sale_date)) {
        errors.push({
          row: i + 2,
          error: "Invalid date format, expected YYYY-MM-DD",
          sku,
          sale_date
        });
        continue;
      }

      // Find product by SKU using parameterized query
      const productResult = await pool.query(
        "SELECT id FROM products WHERE sku = $1 AND is_active = TRUE",
        [sku]
      );

      if (!productResult.rows.length) {
        errors.push({
          row: i + 2,
          error: `Product with SKU '${sku}' not found`,
          sku
        });
        continue;
      }

      const product_id = productResult.rows[0].id;

      // UPSERT using parameterized query
      await pool.query(
        `
        INSERT INTO sales (product_id, quantity, sale_date)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id, sale_date)
        DO UPDATE SET quantity = EXCLUDED.quantity
        `,
        [product_id, quantity, sale_date]
      );

      uploadedCount++;
    } catch (error) {
      errors.push({
        row: i + 2,
        error: error.message || "Unknown error",
        sku: sales[i].sku
      });
    }
  }

  return { uploadedCount, errors };
}

/**
 * Soft delete sale and restore inventory stock
 * Sets is_deleted = true and restores stock to product
 * Returns the deleted sale record
 */
export async function softDeleteSaleAndRestoreStock(saleId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get the sale record (even if already deleted)
    const saleResult = await client.query(
      `
      SELECT id, product_id, quantity, is_deleted
      FROM sales
      WHERE id = $1
      FOR UPDATE
      `,
      [saleId]
    );

    if (!saleResult.rows.length) {
      const err = new Error("Sale not found");
      err.statusCode = 404;
      throw err;
    }

    const sale = saleResult.rows[0];

    // If already deleted, just return it
    if (sale.is_deleted) {
      return {
        id: sale.id,
        product_id: sale.product_id,
        quantity: sale.quantity,
        is_deleted: true,
        message: "Sale was already deleted"
      };
    }

    // Restore inventory
    await client.query(
      `
      UPDATE products
      SET stock = stock + $1, updated_at = NOW()
      WHERE id = $2
      `,
      [sale.quantity, sale.product_id]
    );

    // Mark sale as deleted
    const deleteResult = await client.query(
      `
      UPDATE sales
      SET is_deleted = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, product_id, quantity, is_deleted, updated_at
      `,
      [saleId]
    );

    if (!deleteResult.rows.length) {
      const err = new Error("Failed to delete sale");
      err.statusCode = 500;
      throw err;
    }

    await client.query("COMMIT");

    return {
      ...deleteResult.rows[0],
      message: "Sale deleted and inventory restored"
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Export sales as CSV for ML forecasting
 * Returns CSV string with proper formatting and BOM for Excel compatibility
 * Columns: product_name,sku,sale_date,quantity,unit_price,total_sale,category
 * Only includes non-deleted sales with valid data
 */
export async function exportSalesForML(filters = {}) {
  const { start_date, end_date } = filters;

  let query = `
    SELECT 
      p.name AS product_name,
      p.sku,
      s.sale_date,
      s.quantity,
      p.price AS unit_price,
      (s.quantity * p.price)::numeric AS total_sale,
      p.category
    FROM sales s
    JOIN products p ON s.product_id = p.id
    WHERE s.is_deleted = FALSE
  `;

  const params = [];
  let paramCount = 1;

  // Filter by start_date
  if (start_date) {
    query += ` AND s.sale_date >= $${paramCount}`;
    params.push(start_date);
    paramCount++;
  }

  // Filter by end_date
  if (end_date) {
    query += ` AND s.sale_date <= $${paramCount}`;
    params.push(end_date);
    paramCount++;
  }

  query += ` ORDER BY s.sale_date DESC, s.created_at DESC`;

  const result = await pool.query(query, params);
  const rows = result.rows;

  // Build CSV with BOM for Excel compatibility
  const csvHeaders = ["product_name", "sku", "sale_date", "quantity", "unit_price", "total_sale", "category"];
  
  const csvData = [
    csvHeaders.join(","),
    ...rows.map(row => {
      const productName = escapeCsvValue(row.product_name);
      const sku = escapeCsvValue(row.sku);
      const saleDate = row.sale_date; // ISO date format YYYY-MM-DD
      const quantity = row.quantity;
      const unitPrice = row.unit_price;
      const totalSale = row.total_sale;
      const category = escapeCsvValue(row.category);

      return `${productName},${sku},${saleDate},${quantity},${unitPrice},${totalSale},${category}`;
    })
  ].join("\n");

  // Add BOM for Excel compatibility
  return "\uFEFF" + csvData;
}

/**
 * Helper function to escape CSV values
 */
function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Get best-selling products (top 5 by total quantity sold)
 * Returns: [ { name, units }, ... ]
 */
export async function getBestSellers() {
  const query = `
    SELECT
      p.name,
      SUM(s.quantity)::int AS units
    FROM sales s
    JOIN products p ON p.id = s.product_id
    WHERE s.is_deleted = false
    GROUP BY p.name
    ORDER BY units DESC
    LIMIT 5
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get slow-moving products (bottom 5 by total quantity sold)
 * Returns: [ { name, units }, ... ]
 */
export async function getSlowMovers() {
  const query = `
    SELECT
      p.name,
      SUM(s.quantity)::int AS units
    FROM sales s
    JOIN products p ON p.id = s.product_id
    WHERE s.is_deleted = false
    GROUP BY p.name
    ORDER BY units ASC
    LIMIT 5
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get category performance (revenue by category)
 * Returns: [ { category, revenue }, ... ]
 */
export async function getCategoryPerformance() {
  const query = `
    SELECT
      p.category,
      SUM(s.quantity * p.price)::numeric AS revenue
    FROM sales s
    JOIN products p ON p.id = s.product_id
    WHERE s.is_deleted = false
    GROUP BY p.category
  `;

  const result = await pool.query(query);
  return result.rows;
}
