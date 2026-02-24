// --- Auth ---
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  referralCode: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

// --- Dashboard ---
export interface DashboardSummary {
  walletBalance: number;
  totalInvested: number;
  activeInvestmentsCount: number;
  totalInvestmentsCount: number;
  totalRoiEarned: number;
  totalRoiPayments: number;
  totalReferralIncome: number;
  totalIncome: number;
}

export interface Investment {
  _id: string;
  user: string;
  amount: number;
  plan: "basic" | "standard" | "premium";
  dailyRoiRate: number;
  startDate: string;
  endDate: string;
  status: "active" | "matured" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface LevelIncomeEntry {
  level: number;
  totalAmount: number;
  count: number;
}

export interface RecentRoi {
  _id: string;
  user: string;
  investment: { plan: string; amount: number };
  amount: number;
  date: string;
  createdAt: string;
}

export interface RecentReferral {
  _id: string;
  user: string;
  fromUser: { name: string; email: string };
  investment: { plan: string; amount: number };
  level: number;
  percentage: number;
  amount: number;
  createdAt: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  investments: Investment[];
  levelIncome: LevelIncomeEntry[];
  recentRoi: RecentRoi[];
  recentReferrals: RecentReferral[];
}

// --- Referral Tree ---
export interface ReferralNode {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  level: number;
  joinedAt: string;
  children: ReferralNode[];
}

export interface ReferralTreeData {
  referralCode: string;
  directReferrals: number;
  levelSummary: { level: number; totalIncome: number; referralCount: number }[];
  tree: ReferralNode[];
}

// --- API Response wrapper ---
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
