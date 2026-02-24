import app from "./app";
import env from "./config/env";
import logger from "./config/logger";
import connectDB from "./config/db";
import { startDailyRoiJob } from "./jobs/dailyRoiJob";

const startServer = async (): Promise<void> => {
  await connectDB();

  // Start scheduled jobs after DB connection is established
  const dailyRoiTask = startDailyRoiJob();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    dailyRoiTask.stop();
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

startServer().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
