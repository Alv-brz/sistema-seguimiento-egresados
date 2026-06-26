import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listEmpresas } from "./empresas.service.js";

export const empresasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEmpresas();
    res.json({ ok: true, data });
  }),
};
