import { Router } from "express";
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  addSupplierProduct,
  removeSupplierProduct,
  getProductSuppliers,
} from "../controllers/suppliers.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// Suppliers endpoints
router.get("/", asyncHandler(getSuppliers));
router.get("/:id", asyncHandler(getSupplier));
router.post("/", asyncHandler(createSupplier));
router.put("/:id", asyncHandler(updateSupplier));
router.delete("/:id", asyncHandler(deleteSupplier));

// Supplier products endpoints
router.get("/:id/products", asyncHandler(getSupplierProducts));
router.post("/:supplierId/products/:productId", asyncHandler(addSupplierProduct));
router.delete("/:supplierId/products/:productId", asyncHandler(removeSupplierProduct));

// Product suppliers endpoint
router.get("/products/:productId/suppliers", asyncHandler(getProductSuppliers));

export default router;
