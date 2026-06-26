import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listAuditoria } from "./auditoria.service.js";

export const auditoriaController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listAuditoria();
    res.json({ ok: true, data });
  }),
};
