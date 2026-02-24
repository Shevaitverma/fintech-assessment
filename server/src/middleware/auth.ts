import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env";
import AppError from "../utils/AppError";
import User, { IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

const auth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Authentication required. Please provide a valid token.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError("User not found. Token may be invalid.", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account is deactivated.", 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("Invalid token.", 401));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("Token expired. Please login again.", 401));
      return;
    }
    next(error);
  }
};

export default auth;
