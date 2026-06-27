import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { listNotificaciones } from "./notificaciones.service.js";
import { getPagination } from "../../utils/pagination.js";

export const notificacionesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }

    const data = await listNotificaciones(auth.id_usuario, getPagination(_req.query));
    res.json({ ok: true, data });
  }),
};
