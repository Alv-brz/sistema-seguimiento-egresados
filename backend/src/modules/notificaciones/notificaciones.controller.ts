import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  countUnreadNotificaciones,
  createNotificacion,
  deleteNotificacion,
  ensureEncuestaDisponibleNotificacion,
  listNotificaciones,
  markAllNotificacionesLeidas,
  markNotificacionLeida,
  usuarioExists,
} from "./notificaciones.service.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";
import type { ResultSetHeader } from "mysql2";
import { registerAuditEvent } from "../auditoria/auditoria.service.js";

function parsePositiveId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseOptionalPositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const notificacionesController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }

    if (auth.role === "egresado") {
      await ensureEncuestaDisponibleNotificacion(auth.id_usuario);
    }

    const data = await listNotificaciones(auth.id_usuario, getPagination(_req.query), {
      search: getStringFilter(_req.query.search),
      estado: getExactFilter(_req.query.estado, "Todas"),
    });
    res.json({ ok: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const auth = res.locals.auth;
    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }

    const titulo = normalizeRequiredString((req.body as { titulo?: unknown }).titulo);
    const mensaje = normalizeRequiredString((req.body as { mensaje?: unknown }).mensaje);
    if (!titulo || !mensaje) {
      res.status(400).json({ ok: false, error: "Título y mensaje son obligatorios." });
      return;
    }
    if (titulo.length > 150) {
      res.status(400).json({ ok: false, error: "El título no debe superar 150 caracteres." });
      return;
    }

    const requestedUserId = parseOptionalPositiveId((req.body as { id_usuario?: unknown }).id_usuario);
    const targetUserId = requestedUserId ?? auth.id_usuario;

    if (requestedUserId && !(await usuarioExists(requestedUserId))) {
      res.status(404).json({ ok: false, error: "Usuario destinatario no encontrado." });
      return;
    }

    const result = (await createNotificacion(targetUserId, { titulo, mensaje })) as ResultSetHeader;
    await registerAuditEvent({
      tabla: "notificacion",
      accion: "INSERT",
      idRegistro: result.insertId,
      descripcion: `Notificación creada para usuario #${targetUserId}: ${titulo}`,
      usuario: `Administrador #${auth.id_usuario}`,
    });
    res.status(201).json({ ok: true, data: { id_notificacion: result.insertId } });
  }),

  unreadCount: asyncHandler(async (_req: Request, res: Response) => {
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }

    if (auth.role === "egresado") {
      await ensureEncuestaDisponibleNotificacion(auth.id_usuario);
    }

    const unread = await countUnreadNotificaciones(auth.id_usuario);
    res.json({ ok: true, data: { unread } });
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    const auth = res.locals.auth;
    const idNotificacion = parsePositiveId(req.params.id);

    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }
    if (!idNotificacion) {
      res.status(400).json({ ok: false, error: "id de notificación inválido." });
      return;
    }

    const result = (await markNotificacionLeida(auth.id_usuario, idNotificacion)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Notificación no encontrada para el usuario autenticado." });
      return;
    }

    res.json({ ok: true });
  }),

  markAllRead: asyncHandler(async (_req: Request, res: Response) => {
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }

    await markAllNotificacionesLeidas(auth.id_usuario);
    res.json({ ok: true });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const auth = res.locals.auth;
    const idNotificacion = parsePositiveId(req.params.id);

    if (!auth) {
      res.status(401).json({ ok: false, reason: "missing-token" });
      return;
    }
    if (!idNotificacion) {
      res.status(400).json({ ok: false, error: "id de notificación inválido." });
      return;
    }

    const result = (await deleteNotificacion(auth.id_usuario, idNotificacion)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Notificación no encontrada para el usuario autenticado." });
      return;
    }

    await registerAuditEvent({
      tabla: "notificacion",
      accion: "DELETE",
      idRegistro: idNotificacion,
      descripcion: "Notificación eliminada por administrador",
      usuario: `Administrador #${auth.id_usuario}`,
    });

    res.json({ ok: true });
  }),
};
