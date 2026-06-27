import type { Request, Response } from "express";
import type { ResultSetHeader } from "mysql2";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { deleteEncuesta, listEncuestas } from "./encuestas.service.js";
import { getExactFilter, getPagination } from "../../utils/pagination.js";

function badRequest(res: Response, error: string) {
  res.status(400).json({ ok: false, error });
}

function parsePositiveId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const encuestasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEncuestas(getPagination(_req.query), {
      estadoLaboral: getExactFilter(_req.query.estadoLaboral, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      badRequest(res, "id de encuesta inválido.");
      return;
    }

    const result = (await deleteEncuesta(id)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Encuesta no encontrada." });
      return;
    }

    res.json({ ok: true });
  }),
};
