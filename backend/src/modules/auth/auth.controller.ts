import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { authenticateUser, getAuthenticatedSession } from "./auth.service.js";

export const authController = {
  // POST /api/auth/login
  // Valida nombre_usuario y password contra la tabla usuario (texto plano),
  // resuelve el rol y devuelve un JWT + datos de sesión.
  login: asyncHandler(async (req: Request, res: Response) => {
    const { nombre_usuario, password } = req.body as {
      nombre_usuario?: string;
      password?: string;
    };

    if (!nombre_usuario || !password) {
      res.status(400).json({ ok: false, reason: "empty" });
      return;
    }

    const result = await authenticateUser(nombre_usuario, password);

    if (!result.ok) {
      const status = result.reason === "inactive" ? 403 : 401;
      res.status(status).json({ ok: false, reason: result.reason });
      return;
    }

    // En Fases posteriores el token irá en el Authorization header.
    // Por ahora se devuelve en el body junto con la sesión para que el
    // frontend lo guarde y lo envíe en las siguientes peticiones.
    res.json({ ok: true, session: result.session });
  }),

  // GET /api/auth/me
  // Valida el JWT recibido y reconstruye la sesión contra MySQL.
  me: asyncHandler(async (_req: Request, res: Response) => {
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }

    const result = await getAuthenticatedSession(auth.id_usuario, auth.token);

    if (!result.ok) {
      const status = result.reason === "inactive" ? 403 : 401;
      res.status(status).json({ ok: false, reason: result.reason });
      return;
    }

    if (result.session.role !== auth.role) {
      res.status(403).json({ ok: false, reason: "role-mismatch" });
      return;
    }

    res.json({ ok: true, session: result.session });
  }),
};
