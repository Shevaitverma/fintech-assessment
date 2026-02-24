import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReferralIncome extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  fromUser: Types.ObjectId;
  investment: Types.ObjectId;
  level: number;
  percentage: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const referralIncomeSchema = new Schema<IReferralIncome>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "From user is required"],
    },
    investment: {
      type: Schema.Types.ObjectId,
      ref: "Investment",
      required: [true, "Investment is required"],
    },
    level: {
      type: Number,
      required: [true, "Level is required"],
      min: [1, "Level must be at least 1"],
    },
    percentage: {
      type: Number,
      required: [true, "Percentage is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
  },
  {
    timestamps: true,
  }
);

referralIncomeSchema.index({ user: 1, createdAt: -1 });
referralIncomeSchema.index({ investment: 1, user: 1 }, { unique: true });

const ReferralIncome = mongoose.model<IReferralIncome>(
  "ReferralIncome",
  referralIncomeSchema
);

export default ReferralIncome;
