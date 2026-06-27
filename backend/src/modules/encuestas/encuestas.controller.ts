import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listEncuestas } from "./encuestas.service.js";
import { getExactFilter, getPagination } from "../../utils/pagination.js";

export const encuestasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEncuestas(getPagination(_req.query), {
      estadoLaboral: getExactFilter(_req.query.estadoLaboral, "Todos"),
    });
    res.json({ ok: true, data });
  }),
};
