import mongoose, { Schema, Document, Types } from "mongoose";

export const PLAN_ENUM = ["basic", "standard", "premium"] as const;
export type PlanType = (typeof PLAN_ENUM)[number];

export const INVESTMENT_STATUS_ENUM = ["active", "matured", "cancelled"] as const;
export type InvestmentStatusType = (typeof INVESTMENT_STATUS_ENUM)[number];

export const PLAN_DAILY_ROI: Record<PlanType, number> = {
  basic: 0.5,
  standard: 1.0,
  premium: 1.5,
};

export interface IInvestment extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  amount: number;
  plan: PlanType;
  dailyRoiRate: number;
  startDate: Date;
  endDate: Date;
  status: InvestmentStatusType;
  createdAt: Date;
  updatedAt: Date;
}

const investmentSchema = new Schema<IInvestment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least 1"],
    },
    plan: {
      type: String,
      required: [true, "Plan is required"],
      enum: {
        values: PLAN_ENUM,
        message: "Plan must be one of: basic, standard, premium",
      },
    },
    dailyRoiRate: {
      type: Number,
      required: [true, "Daily ROI rate is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    status: {
      type: String,
      enum: {
        values: INVESTMENT_STATUS_ENUM,
        message: "Status must be one of: active, matured, cancelled",
      },
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

investmentSchema.index({ user: 1, status: 1 });
investmentSchema.index({ status: 1, endDate: 1 });

const Investment = mongoose.model<IInvestment>("Investment", investmentSchema);

export default Investment;
