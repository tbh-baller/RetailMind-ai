import { Router } from "express";
import { 
  getSales, 
  createSale, 
  deleteSale,
  getSalesSummary,
  bulkUploadSales,
  exportSalesCsv
} from "../controllers/sales.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateCreateSale } from "../middleware/validateSales.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// GET /api/sales/export - export sales as CSV for ML forecasting
router.get("/export", asyncHandler(exportSalesCsv));

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
