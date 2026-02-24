import { Types } from "mongoose";
import Investment from "../models/Investment";
import RoiHistory from "../models/RoiHistory";
import ReferralIncome from "../models/ReferralIncome";
import User from "../models/User";

interface LevelIncomeEntry {
  level: number;
  totalAmount: number;
  count: number;
}

interface DashboardSummary {
  walletBalance: number;
  totalInvested: number;
  activeInvestmentsCount: number;
  totalInvestmentsCount: number;
  totalRoiEarned: number;
  totalRoiPayments: number;
  totalReferralIncome: number;
  totalIncome: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  investments: any[];
  levelIncome: LevelIncomeEntry[];
  recentRoi: any[];
  recentReferrals: any[];
}

export const getUserDashboard = async (
  userId: Types.ObjectId
): Promise<DashboardData> => {
  const [user, investments, roiAggregation, referralAggregation, recentRoi, recentReferrals] =
    await Promise.all([
      User.findById(userId).select("walletBalance").lean(),

      Investment.find({ user: userId })
        .sort({ createdAt: -1 })
        .lean(),

      RoiHistory.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalRoi: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      ReferralIncome.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: "$level",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      RoiHistory.find({ user: userId })
        .sort({ date: -1 })
        .limit(10)
        .populate("investment", "plan amount")
        .lean(),

      ReferralIncome.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("fromUser", "name email")
        .populate("investment", "plan amount")
        .lean(),
    ]);

  const totalRoi = roiAggregation[0]?.totalRoi ?? 0;
  const totalRoiCount = roiAggregation[0]?.count ?? 0;

  const levelIncome: LevelIncomeEntry[] = referralAggregation.map((entry) => ({
    level: entry._id,
    totalAmount: entry.totalAmount,
    count: entry.count,
  }));

  const totalReferralIncome = levelIncome.reduce(
    (sum, entry) => sum + entry.totalAmount,
    0
  );

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const activeInvestments = investments.filter((inv) => inv.status === "active");

  return {
    summary: {
      walletBalance: user?.walletBalance ?? 0,
      totalInvested,
      activeInvestmentsCount: activeInvestments.length,
      totalInvestmentsCount: investments.length,
      totalRoiEarned: totalRoi,
      totalRoiPayments: totalRoiCount,
      totalReferralIncome,
      totalIncome: totalRoi + totalReferralIncome,
    },
    investments,
    levelIncome,
    recentRoi,
    recentReferrals,
  };
};
