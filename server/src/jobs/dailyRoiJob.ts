import cron, { ScheduledTask } from "node-cron";
import { processDailyRoi } from "../services/roiService";
import logger from "../config/logger";

/**
 * Scheduled job that runs daily at midnight (00:00) to:
 * 1. Calculate and distribute daily ROI for all active investments
 * 2. Distribute level income to referral hierarchy based on daily ROI
 * 3. Credit wallet balances accordingly
 * 4. Mark matured investments
 */
export const startDailyRoiJob = (): ScheduledTask => {
  const task = cron.schedule(
    "0 0 * * *", // Every day at midnight
    async () => {
      logger.info("Daily ROI job started");
      const startTime = Date.now();

      try {
        const result = await processDailyRoi();
        const duration = Date.now() - startTime;

        logger.info("Daily ROI job completed", {
          duration: `${duration}ms`,
          processedInvestments: result.processedInvestments,
          totalRoiDistributed: result.totalRoiDistributed,
          totalLevelIncomeDistributed: result.totalLevelIncomeDistributed,
          maturedInvestments: result.maturedInvestments,
          errors: result.errors.length,
        });

        if (result.errors.length > 0) {
          logger.warn(`Daily ROI job had ${result.errors.length} errors`, {
            errors: result.errors,
          });
        }
      } catch (error) {
        logger.error("Daily ROI job failed", error);
      }
    },
    {
      timezone: "UTC",
    }
  );

  logger.info("Daily ROI cron job scheduled (runs daily at 00:00 UTC)");
  return task;
};
