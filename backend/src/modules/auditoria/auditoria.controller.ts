import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listAuditoria } from "./auditoria.service.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";

export const auditoriaController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listAuditoria(getPagination(_req.query), {
      search: getStringFilter(_req.query.search),
      tabla: getExactFilter(_req.query.tabla, "Todas"),
      accion: getExactFilter(_req.query.accion, "Todas"),
    });
    res.json({ ok: true, data });
  }),
};
