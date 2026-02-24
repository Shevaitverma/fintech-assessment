import { Router } from "express";
import auth from "../middleware/auth";
import { getDashboard } from "../controllers/dashboardController";

const router = Router();

// GET /api/dashboard - Get user dashboard data (protected)
router.get("/", auth, getDashboard);

export default router;
