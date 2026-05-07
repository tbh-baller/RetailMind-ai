import { Router } from "express";
import { getAlerts } from "../controllers/alerts.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getAlerts));

export default router;
