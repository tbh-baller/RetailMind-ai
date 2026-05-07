import { Router } from "express";
import { 
  getSales, 
  createSale, 
  deleteSale,
  getSalesSummary,
  bulkUploadSales,
  exportSalesCsv,
  getBestSellers,
  getSlowMovers,
  getCategoryPerformance
} from "../controllers/sales.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateCreateSale } from "../middleware/validateSales.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// GET /api/sales/export - export sales as CSV for ML forecasting
router.get("/export", asyncHandler(exportSalesCsv));

// GET /api/sales/analytics/best-sellers - top 5 products by quantity
router.get("/analytics/best-sellers", asyncHandler(getBestSellers));

// GET /api/sales/analytics/slow-movers - bottom 5 products by quantity
router.get("/analytics/slow-movers", asyncHandler(getSlowMovers));

// GET /api/sales/analytics/category-performance - revenue by category
router.get("/analytics/category-performance", asyncHandler(getCategoryPerformance));

// GET /api/sales with optional filters
router.get("/", asyncHandler(getSales));

// GET /api/sales/summary - daily total sales grouped by date
router.get("/summary", asyncHandler(getSalesSummary));

// POST /api/sales - create single sale with UPSERT logic
router.post("/", validateCreateSale, asyncHandler(createSale));

// DELETE /api/sales/:id - soft delete sale and restore stock
router.delete("/:id", asyncHandler(deleteSale));

// POST /api/sales/bulk-upload - bulk import from CSV
router.post("/bulk-upload", upload.single("file"), asyncHandler(bulkUploadSales));

export default router;
