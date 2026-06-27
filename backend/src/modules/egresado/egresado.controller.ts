import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";
import {
  getEgresadoDashboard,
  getEgresadoPerfil,
  getUltimaEncuesta,
  listBolsaLaboral,
  listEgresadoPostulaciones,
  listHistorialLaboral,
} from "./egresado.service.js";

function getAuthEgresadoId(res: Response): number | null {
  const auth = res.locals.auth;
  return auth?.role === "egresado" ? auth.id_usuario : null;
}

export const egresadoController = {
  dashboard: asyncHandler(async (_req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getEgresadoDashboard(idEgresado);
    res.json({ ok: true, data });
  }),

  bolsa: asyncHandler(async (req: Request, res: Response) => {
    const data = await listBolsaLaboral(getPagination(req.query), {
      search: getStringFilter(req.query.search),
      modalidad: getExactFilter(req.query.modalidad, "Todos"),
      contrato: getExactFilter(req.query.contrato, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  postulaciones: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await listEgresadoPostulaciones(idEgresado, getPagination(req.query), {
      estado: getExactFilter(req.query.estado, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  perfil: asyncHandler(async (_req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getEgresadoPerfil(idEgresado);
    res.json({ ok: true, data });
  }),

  historial: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await listHistorialLaboral(idEgresado, getPagination(req.query));
    res.json({ ok: true, data });
  }),

  encuesta: asyncHandler(async (_req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getUltimaEncuesta(idEgresado);
    res.json({ ok: true, data });
  }),
};
