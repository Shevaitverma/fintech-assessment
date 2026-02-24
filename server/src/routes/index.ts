import { Router } from "express";
import healthRoutes from "./health";
import authRoutes from "./auth";
import investmentRoutes from "./investment";
import dashboardRoutes from "./dashboard";
import referralRoutes from "./referral";
import roiRoutes from "./roi";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/investments", investmentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/referrals", referralRoutes);
router.use("/roi", roiRoutes);

export default router;
