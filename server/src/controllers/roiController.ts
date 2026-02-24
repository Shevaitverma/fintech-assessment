import { Request, Response, NextFunction } from "express";
import { processDailyRoi } from "../services/roiService";

export const triggerDailyRoi = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await processDailyRoi();

    res.status(200).json({
      success: true,
      message: "Daily ROI processing completed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
