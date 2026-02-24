import cron, { ScheduledTask } from "node-cron";
import { processDailyRoi } from "../services/roiService";
import logger from "../config/logger";

// ─── Toggle this flag to switch between testing and production mode ───
// true  = runs every 10 seconds (for testing)
// false = runs daily at midnight (production default)
const TEST_MODE = false;

const CRON_EXPRESSION = TEST_MODE ? "*/10 * * * * *" : "0 0 * * *";
const SCHEDULE_LABEL = TEST_MODE
  ? "every 10 seconds (TEST MODE)"
  : "daily at 00:00 UTC";

/**
 * Scheduled job that runs daily at midnight (00:00) to:
 * 1. Calculate and distribute daily ROI for all active investments
 * 2. Distribute level income to referral hierarchy based on daily ROI
 * 3. Credit wallet balances accordingly
 * 4. Mark matured investments
 */
export const startDailyRoiJob = (): ScheduledTask => {
  const task = cron.schedule(
    CRON_EXPRESSION,
    async () => {
      console.log(`[DailyROI] Job triggered at ${new Date().toISOString()}`);
      logger.info("Daily ROI job started");
      const startTime = Date.now();

      try {
        const result = await processDailyRoi();
        const duration = Date.now() - startTime;

        console.log(`[DailyROI] Job completed in ${duration}ms`, {
          processedInvestments: result.processedInvestments,
          totalRoiDistributed: result.totalRoiDistributed,
          totalLevelIncomeDistributed: result.totalLevelIncomeDistributed,
          maturedInvestments: result.maturedInvestments,
          errors: result.errors.length,
        });
        logger.info("Daily ROI job completed", {
          duration: `${duration}ms`,
          processedInvestments: result.processedInvestments,
          totalRoiDistributed: result.totalRoiDistributed,
          totalLevelIncomeDistributed: result.totalLevelIncomeDistributed,
          maturedInvestments: result.maturedInvestments,
          errors: result.errors.length,
        });

        if (result.errors.length > 0) {
          console.warn(
            `[DailyROI] Job had ${result.errors.length} errors`,
            result.errors
          );
          logger.warn(`Daily ROI job had ${result.errors.length} errors`, {
            errors: result.errors,
          });
        }
      } catch (error) {
        console.error("[DailyROI] Job failed:", error);
        logger.error("Daily ROI job failed", error);
      }
    },
    {
      timezone: "UTC",
    }
  );

  console.log(`[DailyROI] Cron job scheduled (${SCHEDULE_LABEL})`);
  logger.info(`Daily ROI cron job scheduled (${SCHEDULE_LABEL})`);
  return task;
};
