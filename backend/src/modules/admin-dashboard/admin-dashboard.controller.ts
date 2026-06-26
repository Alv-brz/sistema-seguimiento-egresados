import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getAdminDashboard } from "./admin-dashboard.service.js";

export const adminDashboardController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    const data = await getAdminDashboard();
    res.json({ ok: true, data });
  }),
};
