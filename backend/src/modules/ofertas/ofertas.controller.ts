import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listOfertas } from "./ofertas.service.js";
import { getExactFilter, getPagination } from "../../utils/pagination.js";

export const ofertasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listOfertas(getPagination(_req.query), {
      estado: getExactFilter(_req.query.estado, "Todos"),
      modalidad: getExactFilter(_req.query.modalidad, "Todos"),
    });
    res.json({ ok: true, data });
  }),
};
