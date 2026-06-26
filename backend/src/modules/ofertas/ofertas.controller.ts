import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listOfertas } from "./ofertas.service.js";

export const ofertasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listOfertas();
    res.json({ ok: true, data });
  }),
};
