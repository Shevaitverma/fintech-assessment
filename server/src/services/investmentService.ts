import { Types } from "mongoose";
import Investment, { PLAN_DAILY_ROI, PlanType, PLAN_ENUM, IInvestment } from "../models/Investment";
import ReferralIncome from "../models/ReferralIncome";
import LevelSetting, { DEFAULT_LEVEL_CONFIG } from "../models/LevelSetting";
import User from "../models/User";
import AppError from "../utils/AppError";

const INVESTMENT_DURATION_DAYS = 365;

interface CreateInvestmentInput {
  userId: Types.ObjectId;
  amount: number;
  plan: string;
}

export interface InvestmentResult {
  id: string;
  amount: number;
  plan: string;
  dailyRoiRate: number;
  startDate: Date;
  endDate: Date;
  status: string;
}

const distributeReferralIncome = async (
  investorId: string,
  investmentId: string,
  investmentAmount: number
): Promise<void> => {
  const levelSetting = await LevelSetting.findOne({
    key: "referral_levels",
    isActive: true,
  });
  const levels = levelSetting?.levels ?? DEFAULT_LEVEL_CONFIG;

  let currentUserId = investorId;

  for (const { level, percentage } of levels) {
    const currentUser = await User.findById(currentUserId);
    if (!currentUser?.referredBy) break;

    const referrerId = currentUser.referredBy.toString();
    const amount = (investmentAmount * percentage) / 100;

    await ReferralIncome.create({
      user: referrerId,
      fromUser: investorId,
      investment: investmentId,
      level,
      percentage,
      amount,
    });

    currentUserId = referrerId;
  }
};

export const createInvestment = async (
  input: CreateInvestmentInput
): Promise<InvestmentResult> => {
  const { userId, amount, plan } = input;

  if (!amount || !plan) {
    throw new AppError("Amount and plan are required.", 400);
  }

  if (!PLAN_ENUM.includes(plan as PlanType)) {
    throw new AppError("Plan must be one of: basic, standard, premium.", 400);
  }

  if (typeof amount !== "number" || amount < 1) {
    throw new AppError("Amount must be a number greater than or equal to 1.", 400);
  }

  const dailyRoiRate = PLAN_DAILY_ROI[plan as PlanType];
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + INVESTMENT_DURATION_DAYS);

  const investment = await Investment.create({
    user: userId,
    amount,
    plan,
    dailyRoiRate,
    startDate,
    endDate,
  });

  await distributeReferralIncome(
    userId.toString(),
    investment._id.toString(),
    amount
  );

  return {
    id: investment._id.toString(),
    amount: investment.amount,
    plan: investment.plan,
    dailyRoiRate: investment.dailyRoiRate,
    startDate: investment.startDate,
    endDate: investment.endDate,
    status: investment.status,
  };
};
