import { Router } from "express";
import { getForecast } from "../controllers/forecast.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getForecast));

export default router;
