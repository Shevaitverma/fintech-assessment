import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILevelEntry {
  level: number;
  percentage: number;
}

export interface ILevelSetting extends Document {
  _id: Types.ObjectId;
  key: string;
  levels: ILevelEntry[];
  isActive: boolean;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_LEVEL_CONFIG: ILevelEntry[] = [
  { level: 1, percentage: 5 },
  { level: 2, percentage: 3 },
  { level: 3, percentage: 1 },
];

const levelEntrySchema = new Schema<ILevelEntry>(
  {
    level: {
      type: Number,
      required: [true, "Level is required"],
      min: [1, "Level must be at least 1"],
    },
    percentage: {
      type: Number,
      required: [true, "Percentage is required"],
      min: [0, "Percentage cannot be negative"],
    },
  },
  { _id: false }
);

const levelSettingSchema = new Schema<ILevelSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "referral_levels",
    },
    levels: {
      type: [levelEntrySchema],
      required: true,
      validate: {
        validator: (arr: ILevelEntry[]) => arr.length >= 1,
        message: "At least one level entry is required",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: String,
      default: "system",
    },
  },
  {
    timestamps: true,
  }
);

const LevelSetting = mongoose.model<ILevelSetting>(
  "LevelSetting",
  levelSettingSchema
);

export default LevelSetting;
