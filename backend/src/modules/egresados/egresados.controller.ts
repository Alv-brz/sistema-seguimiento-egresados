import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listEgresados } from "./egresados.service.js";

export const egresadosController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEgresados();
    res.json({ ok: true, data });
  }),
};
