import * as salesService from "../services/sales.service.js";

/**
 * GET /api/sales/export
 * Export sales data as CSV for ML forecasting
 * Query params:
 *   - start_date: filter sales from this date (YYYY-MM-DD)
 *   - end_date: filter sales until this date (YYYY-MM-DD)
 * Returns: CSV file with BOM for Excel compatibility
 */
export async function exportSalesCsv(req, res) {
  try {
    const { start_date, end_date } = req.query;

    // Validate date formats if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (start_date && !dateRegex.test(start_date)) {
      const err = new Error("start_date must be in YYYY-MM-DD format");
      err.statusCode = 400;
      throw err;
    }
    if (end_date && !dateRegex.test(end_date)) {
      const err = new Error("end_date must be in YYYY-MM-DD format");
      err.statusCode = 400;
      throw err;
    }

    const csv = await salesService.exportSalesForML({
      start_date,
      end_date
    });

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv;charset=utf-8");
    res.setHeader("Content-Disposition", `attachment;filename="sales-export-${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csv);
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/sales
 * Get all sales with optional filtering
 * Query params:
 *   - product_id: filter by product UUID
 *   - start_date: filter sales from this date (YYYY-MM-DD)
 *   - end_date: filter sales until this date (YYYY-MM-DD)
 *   - limit: max results (default 100, max 1000)
 *   - offset: pagination offset (default 0)
 */
export async function getSales(req, res) {
  try {
    const { product_id, start_date, end_date, limit, offset } = req.query;

    // Parse and validate limit/offset
    const parsedLimit = Math.min(parseInt(limit) || 100, 1000);
    const parsedOffset = parseInt(offset) || 0;

    if (parsedOffset < 0) {
      const err = new Error("offset must be non-negative");
      err.statusCode = 400;
      throw err;
    }

    if (parsedLimit < 1 || parsedLimit > 1000) {
      const err = new Error("limit must be between 1 and 1000");
      err.statusCode = 400;
      throw err;
    }

    // Build filter params
    const filters = {
      product_id,
      start_date,
      end_date,
      limit: parsedLimit,
      offset: parsedOffset
    };

    const sales = await salesService.getSalesWithFilters(filters);
    
    res.status(200).json(sales);
  } catch (error) {
    // Errors are caught by async handler and error handler middleware
    throw error;
  }
}

/**
 * POST /api/sales
 * Create a sale and reduce inventory stock.
 * 
 * Expected body:
 * {
 *   "product_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "qty_sold": 10,
 *   "sale_date": "2026-05-05"
 * }
 */
export async function createSale(req, res) {
  try {
    const { product_id, qty_sold, sale_date } = req.body;

    const quantityInt = parseInt(qty_sold);

    const sale = await salesService.createSaleAndReduceStock({
      product_id,
      qty_sold: quantityInt,
      sale_date
    });

    res.status(201).json({
      data: sale,
      message: "Sale created and inventory updated"
    });
  } catch (error) {
    // Check for specific error types
    if (error.code === 'FOREIGN_KEY_VIOLATION') {
      const err = new Error("product_id does not exist");
      err.statusCode = 422;
      throw err;
    }
    
    // Re-throw for async handler to catch
    throw error;
  }
}

export async function deleteSale(req, res) {
  try {
    const deleted = await salesService.softDeleteSaleAndRestoreStock(req.params.id);

    res.status(200).json({
      data: deleted,
      message: "Sale deleted and inventory restored"
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/sales/summary
 * Get daily total sales grouped by date
 * Query params:
 *   - start_date: from date (YYYY-MM-DD, optional)
 *   - end_date: until date (YYYY-MM-DD, optional)
 */
export async function getSalesSummary(req, res) {
  try {
    const { start_date, end_date } = req.query;

    // Validate date formats if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (start_date && !dateRegex.test(start_date)) {
      const err = new Error("start_date must be in YYYY-MM-DD format");
      err.statusCode = 400;
      throw err;
    }
    if (end_date && !dateRegex.test(end_date)) {
      const err = new Error("end_date must be in YYYY-MM-DD format");
      err.statusCode = 400;
      throw err;
    }

    const summary = await salesService.getSalesSummary({
      start_date,
      end_date
    });

    res.status(200).json({
      data: summary,
      count: summary.length
    });
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/sales/bulk-upload
 * Upload sales from CSV file
 * CSV must have columns: sku, sale_date, quantity
 */
export async function bulkUploadSales(req, res) {
  try {
    if (!req.file) {
      const err = new Error("No file uploaded");
      err.statusCode = 400;
      throw err;
    }

    // Parse CSV from buffer
    const csvText = req.file.buffer.toString("utf-8");
    const lines = csvText
  .replace(/^\uFEFF/, "")
  .trim()
  .split(/\r?\n/);

    if (lines.length < 2) {
      const err = new Error("CSV must have headers and at least one row");
      err.statusCode = 400;
      throw err;
    }

    // Parse headers
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const requiredFields = ["sku", "sale_date", "quantity"];
    const missing = requiredFields.filter(f => !headers.includes(f));

    if (missing.length > 0) {
      const err = new Error(`Missing required columns: ${missing.join(", ")}`);
      err.statusCode = 400;
      throw err;
    }

    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const cells = line
      .split(",")
      .map(c => c.replace(/"/g, "").trim());
      const row = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = cells[j] || "";
      }

      // Validate required fields are not empty
      for (const field of requiredFields) {
        if (!row[field]) {
          const err = new Error(`Row ${i}: ${field} is required`);
          err.statusCode = 400;
          throw err;
        }
      }

      // Convert quantity to number
      row.quantity = Number(row.quantity);
      if (isNaN(row.quantity) || row.quantity <= 0) {
        const err = new Error(`Row ${i}: quantity must be a positive number`);
        err.statusCode = 400;
        throw err;
      }

      rows.push({
        sku: row.sku,
        sale_date: row.sale_date,
        quantity: row.quantity
      });
    }

    // Bulk upload sales
    const { uploadedCount, errors } = await salesService.bulkUploadSales(rows);

    res.status(201).json({
      message: "Bulk upload completed",
      insertedCount: uploadedCount,
      uploadedRows: uploadedCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/sales/analytics/best-sellers
 * Get top 5 best-selling products by total quantity sold
 * Returns: [ { name, units }, ... ]
 */
export async function getBestSellers(req, res) {
  try {
    const data = await salesService.getBestSellers();
    
    res.status(200).json({
      data: data,
      count: data.length
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/sales/analytics/slow-movers
 * Get bottom 5 slow-moving products by total quantity sold
 * Returns: [ { name, units }, ... ]
 */
export async function getSlowMovers(req, res) {
  try {
    const data = await salesService.getSlowMovers();
    
    res.status(200).json({
      data: data,
      count: data.length
    });
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/sales/analytics/category-performance
 * Get revenue by category
 * Returns: [ { category, revenue }, ... ]
 */
export async function getCategoryPerformance(req, res) {
  try {
    const data = await salesService.getCategoryPerformance();
    
    res.status(200).json({
      data: data,
      count: data.length
    });
  } catch (error) {
    throw error;
  }
}
