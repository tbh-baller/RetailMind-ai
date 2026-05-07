import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  bulkUploadProducts,
} from "../controllers/products.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validateCreateProduct, validateUpdateProduct } from "../middleware/validateProduct.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/", asyncHandler(getProducts));
router.post("/", validateCreateProduct, asyncHandler(createProduct));
router.post("/bulk-upload", upload.single("file"), asyncHandler(bulkUploadProducts));
router.put("/:id", validateUpdateProduct, asyncHandler(updateProduct));
router.delete("/:id", asyncHandler(deleteProduct));

export default router;
