import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { checkDatabaseConnection } from "./health.service.js";

export const healthController = {
  // GET /api/health
  health: asyncHandler(async (_req: Request, res: Response) => {
    const dbStatus = await checkDatabaseConnection();
    res.json({
      ok: true,
      service: "seg-egresados-backend",
      db: dbStatus.db,
      timestamp: new Date().toISOString(),
    });
  }),
};
