import { Router } from "express";
import auth from "../middleware/auth";
import { createInvestment } from "../controllers/investmentController";

const router = Router();

// POST /api/investments - Create a new investment (protected)
router.post("/", auth, createInvestment);

export default router;
