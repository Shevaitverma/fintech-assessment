import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface Env {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  LOG_LEVEL: string;
  CORS_ORIGIN: string;
}

const getEnv = (): Env => {
  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT || "5000", 10),
    MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/fintech-db",
    LOG_LEVEL: process.env.LOG_LEVEL || "debug",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  };
};

const env = getEnv();

export default env;
