import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listEncuestas } from "./encuestas.service.js";

export const encuestasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEncuestas();
    res.json({ ok: true, data });
  }),
};
