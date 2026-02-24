import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import env from "./config/env";
import requestLogger from "./middleware/requestLogger";
import errorHandler from "./middleware/errorHandler";
import routes from "./routes";
import AppError from "./utils/AppError";

const app = express();

// Security
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later" },
  })
);

// Parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Compression
app.use(compression());

// Logging
app.use(requestLogger);

// Routes
app.use("/api", routes);

// 404 handler
app.use((_req, _res, next) => {
  next(new AppError("Route not found", 404));
});

// Global error handler
app.use(errorHandler);

export default app;
