import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { defaultRateLimiter } from "./middleware/rateLimiter";
import { csrfProtection } from "./middleware/csrf";
import { recordHttpRequest } from "./lib/metrics";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(csrfProtection);
  app.use((_req, _res, next) => {
    recordHttpRequest();
    next();
  });
  app.use(
    pinoHttp({
      logger,
      redact: ["req.headers.authorization", "req.headers.cookie"],
    }),
  );
  app.use(defaultRateLimiter);

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
