import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listEmpresas } from "./empresas.service.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";

export const empresasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEmpresas(getPagination(_req.query), {
      search: getStringFilter(_req.query.search),
      sector: getExactFilter(_req.query.sector, "Todos"),
    });
    res.json({ ok: true, data });
  }),
};
