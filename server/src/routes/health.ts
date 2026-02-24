import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus[dbState] || "unknown",
  });
});

export default router;
