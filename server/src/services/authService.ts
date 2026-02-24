import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import AppError from "../utils/AppError";
import env from "../config/env";

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
  };
  token: string;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  referralCode?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string & jwt.SignOptions["expiresIn"],
  });
};

const generateReferralCode = (): string => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

export const registerUser = async (input: RegisterInput): Promise<AuthResult> => {
  const { name, email, password, referralCode } = input;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required.", 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError("Email already registered.", 409);
  }

  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode, isActive: true });
    if (!referrer) {
      throw new AppError("Invalid referral code.", 400);
    }
    referredBy = referrer._id;
  }

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    referralCode: generateReferralCode(),
    referredBy,
  });

  const token = generateToken(user._id.toString());

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
    },
    token,
  };
};

export const loginUser = async (input: LoginInput): Promise<AuthResult> => {
  const { email, password } = input;

  if (!email || !password) {
    throw new AppError("Email and password are required.", 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated.", 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password.", 401);
  }

  const token = generateToken(user._id.toString());

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
    },
    token,
  };
};
