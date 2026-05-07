import { Router } from "express";
import { getReorderSuggestions } from "../controllers/reorder.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getReorderSuggestions));

export default router;
