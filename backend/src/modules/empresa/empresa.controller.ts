import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";
import {
  getEmpresaDashboard,
  getEmpresaPerfil,
  listEmpresaOfertas,
  listEmpresaPostulaciones,
} from "./empresa.service.js";

function getAuthEmpresaId(res: Response): number | null {
  const auth = res.locals.auth;
  return auth?.role === "empresa" ? auth.id_usuario : null;
}

export const empresaController = {
  dashboard: asyncHandler(async (_req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getEmpresaDashboard(idEmpresa);
    res.json({ ok: true, data });
  }),

  ofertas: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await listEmpresaOfertas(idEmpresa, getPagination(req.query), {
      estado: getExactFilter(req.query.estado, "Todos"),
      modalidad: getExactFilter(req.query.modalidad, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  postulaciones: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await listEmpresaPostulaciones(idEmpresa, getPagination(req.query), {
      search: getStringFilter(req.query.search),
      estado: getExactFilter(req.query.estado, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  perfil: asyncHandler(async (_req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getEmpresaPerfil(idEmpresa);
    res.json({ ok: true, data });
  }),
};
