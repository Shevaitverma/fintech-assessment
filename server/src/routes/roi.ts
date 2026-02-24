import { Router } from "express";
import auth from "../middleware/auth";
import { triggerDailyRoi } from "../controllers/roiController";

const router = Router();

// POST /api/roi/process-daily - Manually trigger daily ROI processing (protected)
router.post("/process-daily", auth, triggerDailyRoi);

export default router;
