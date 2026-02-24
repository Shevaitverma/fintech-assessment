import mongoose from "mongoose";
import Investment from "../models/Investment";
import RoiHistory from "../models/RoiHistory";
import ReferralIncome from "../models/ReferralIncome";
import LevelSetting, { DEFAULT_LEVEL_CONFIG } from "../models/LevelSetting";
import User from "../models/User";
import logger from "../config/logger";

interface DailyRoiResult {
  processedInvestments: number;
  totalRoiDistributed: number;
  totalLevelIncomeDistributed: number;
  maturedInvestments: number;
  errors: string[];
}

const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Distribute level income on a daily ROI payout to the investor's referral upline.
 * Walks up the referral chain and credits each ancestor based on configured level percentages.
 */
const distributeLevelIncome = async (
  investorId: string,
  investmentId: string,
  roiAmount: number,
  levels: { level: number; percentage: number }[]
): Promise<number> => {
  let totalDistributed = 0;
  let currentUserId = investorId;

  for (const { level, percentage } of levels) {
    const currentUser = await User.findById(currentUserId);
    if (!currentUser?.referredBy) break;

    const referrerId = currentUser.referredBy.toString();
    const amount = parseFloat(((roiAmount * percentage) / 100).toFixed(2));

    if (amount <= 0) {
      currentUserId = referrerId;
      continue;
    }

    // Use upsert to avoid duplicates — the unique index on { investment, user }
    // prevents double-crediting but we use $inc to accumulate daily level income
    await ReferralIncome.findOneAndUpdate(
      { investment: investmentId, user: referrerId },
      {
        $inc: { amount },
        $setOnInsert: {
          user: referrerId,
          fromUser: investorId,
          investment: investmentId,
          level,
          percentage,
        },
      },
      { upsert: true }
    );

    await User.findByIdAndUpdate(referrerId, {
      $inc: { walletBalance: amount },
    });

    totalDistributed += amount;
    currentUserId = referrerId;
  }

  return totalDistributed;
};

/**
 * Core daily ROI processing function.
 *
 * For each active investment:
 * 1. Calculate daily ROI = investmentAmount * dailyRoiRate / 100
 * 2. Create RoiHistory entry (idempotent — skips if already processed for today)
 * 3. Credit ROI to the investor's walletBalance
 * 4. Distribute level income on the ROI to the referral hierarchy
 * 5. Mark investments past their endDate as "matured"
 */
export const processDailyRoi = async (): Promise<DailyRoiResult> => {
  const today = getStartOfDay(new Date());
  const result: DailyRoiResult = {
    processedInvestments: 0,
    totalRoiDistributed: 0,
    totalLevelIncomeDistributed: 0,
    maturedInvestments: 0,
    errors: [],
  };

  // Step 1: Mark matured investments (endDate <= today and still active)
  const maturedResult = await Investment.updateMany(
    { status: "active", endDate: { $lte: today } },
    { $set: { status: "matured" } }
  );
  result.maturedInvestments = maturedResult.modifiedCount;

  if (result.maturedInvestments > 0) {
    logger.info(`Marked ${result.maturedInvestments} investments as matured`);
  }

  // Step 2: Fetch all active investments (those still active after maturity check)
  const activeInvestments = await Investment.find({ status: "active" }).lean();

  if (activeInvestments.length === 0) {
    logger.info("No active investments to process for daily ROI");
    return result;
  }

  // Step 3: Load level settings once for all distributions
  const levelSetting = await LevelSetting.findOne({
    key: "referral_levels",
    isActive: true,
  });
  const levels = levelSetting?.levels ?? DEFAULT_LEVEL_CONFIG;

  // Step 4: Process each investment
  for (const investment of activeInvestments) {
    try {
      const roiAmount = parseFloat(
        ((investment.amount * investment.dailyRoiRate) / 100).toFixed(2)
      );

      // Create RoiHistory entry — unique index on { investment, date } ensures idempotency
      const existingRoi = await RoiHistory.findOne({
        investment: investment._id,
        date: today,
      });

      if (existingRoi) {
        // Already processed today, skip
        continue;
      }

      // Use a session for atomicity: ROI entry + wallet update
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Create ROI history entry
          await RoiHistory.create(
            [
              {
                user: investment.user,
                investment: investment._id,
                amount: roiAmount,
                date: today,
              },
            ],
            { session }
          );

          // Credit investor's wallet
          await User.findByIdAndUpdate(
            investment.user,
            { $inc: { walletBalance: roiAmount } },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }

      result.processedInvestments++;
      result.totalRoiDistributed += roiAmount;

      // Distribute level income to referral hierarchy (outside transaction for flexibility)
      const levelIncomeDistributed = await distributeLevelIncome(
        investment.user.toString(),
        investment._id.toString(),
        roiAmount,
        levels
      );
      result.totalLevelIncomeDistributed += levelIncomeDistributed;
    } catch (error: unknown) {
      const errMsg = `Failed to process ROI for investment ${investment._id}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errMsg);
      result.errors.push(errMsg);
    }
  }

  return result;
};
