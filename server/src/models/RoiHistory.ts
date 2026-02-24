import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRoiHistory extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  investment: Types.ObjectId;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const roiHistorySchema = new Schema<IRoiHistory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    investment: {
      type: Schema.Types.ObjectId,
      ref: "Investment",
      required: [true, "Investment is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
  },
  {
    timestamps: true,
  }
);

roiHistorySchema.index({ user: 1, date: -1 });
roiHistorySchema.index({ investment: 1, date: 1 }, { unique: true });

const RoiHistory = mongoose.model<IRoiHistory>("RoiHistory", roiHistorySchema);

export default RoiHistory;
