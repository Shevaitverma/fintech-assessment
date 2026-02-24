import { Types } from "mongoose";
import User from "../models/User";
import ReferralIncome from "../models/ReferralIncome";

export interface ReferralNode {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  level: number;
  joinedAt: Date;
  children: ReferralNode[];
}

interface LevelSummaryEntry {
  level: number;
  totalIncome: number;
  referralCount: number;
}

export interface ReferralTreeData {
  referralCode: string;
  directReferrals: number;
  levelSummary: LevelSummaryEntry[];
  tree: ReferralNode[];
}

const buildReferralTree = async (
  userId: string,
  currentLevel: number,
  maxLevel: number
): Promise<ReferralNode[]> => {
  if (currentLevel > maxLevel) return [];

  const directReferrals = await User.find({
    referredBy: userId,
    isActive: true,
  })
    .select("name email referralCode createdAt")
    .lean();

  const tree: ReferralNode[] = [];

  for (const referral of directReferrals) {
    const children = await buildReferralTree(
      referral._id.toString(),
      currentLevel + 1,
      maxLevel
    );

    tree.push({
      id: referral._id.toString(),
      name: referral.name,
      email: referral.email,
      referralCode: referral.referralCode,
      level: currentLevel,
      joinedAt: referral.createdAt,
      children,
    });
  }

  return tree;
};

export const getUserReferralTree = async (
  userId: Types.ObjectId,
  maxLevel: number
): Promise<ReferralTreeData> => {
  const userIdStr = userId.toString();
  const cappedMaxLevel = Math.min(maxLevel, 10);

  const user = await User.findById(userId).select("referralCode").lean();

  const [tree, incomeByLevel, totalReferrals] = await Promise.all([
    buildReferralTree(userIdStr, 1, cappedMaxLevel),

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

    User.countDocuments({ referredBy: userIdStr, isActive: true }),
  ]);

  const levelSummary: LevelSummaryEntry[] = incomeByLevel.map((entry) => ({
    level: entry._id,
    totalIncome: entry.totalAmount,
    referralCount: entry.count,
  }));

  return {
    referralCode: user!.referralCode,
    directReferrals: totalReferrals,
    levelSummary,
    tree,
  };
};
