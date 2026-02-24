import { Router } from "express";
import auth from "../middleware/auth";
import { getReferralTree } from "../controllers/referralController";

const router = Router();

// GET /api/referrals/tree - Get referral tree (protected)
router.get("/tree", auth, getReferralTree);

export default router;
