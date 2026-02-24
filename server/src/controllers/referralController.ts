import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { getUserReferralTree } from "../services/referralService";

export const getReferralTree = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const maxLevel = parseInt(req.query.maxLevel as string) || 3;

    const data = await getUserReferralTree(req.user!._id, maxLevel);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
