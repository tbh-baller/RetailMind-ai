import { Router } from "express";
import {
  getRecommendations,
  getProcurementOrders,
  getProcurementOrderById,
  createProcurementOrder,
  updateProcurementOrderStatus,
} from "../controllers/procurement.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// Recommendations endpoint
router.get("/recommendations", asyncHandler(getRecommendations));

// Procurement orders endpoints
router.get("/orders", asyncHandler(getProcurementOrders));
router.get("/orders/:id", asyncHandler(getProcurementOrderById));
router.post("/orders", asyncHandler(createProcurementOrder));
router.put("/orders/:id", asyncHandler(updateProcurementOrderStatus));

export default router;
