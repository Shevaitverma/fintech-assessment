import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { getUserDashboard } from "../services/dashboardService";

export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await getUserDashboard(req.user!._id);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
