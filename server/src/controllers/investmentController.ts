import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { createInvestment as createInvestmentService } from "../services/investmentService";

export const createInvestment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { amount, plan } = req.body;

    const investment = await createInvestmentService({
      userId: req.user!._id,
      amount,
      plan,
    });

    res.status(201).json({
      success: true,
      message: "Investment created successfully.",
      data: { investment },
    });
  } catch (error) {
    next(error);
  }
};
