import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listEgresados } from "./egresados.service.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";

export const egresadosController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEgresados(getPagination(_req.query), {
      search: getStringFilter(_req.query.search),
      facultad: getExactFilter(_req.query.facultad, "Todas"),
      sexo: getExactFilter(_req.query.sexo, "Todos"),
    });
    res.json({ ok: true, data });
  }),
};
