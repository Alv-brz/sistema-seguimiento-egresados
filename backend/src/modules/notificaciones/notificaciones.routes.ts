import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { notificacionesController } from "./notificaciones.controller.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("admin", "empresa", "egresado"),
  notificacionesController.list
);

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  notificacionesController.create
);

router.get(
  "/unread-count",
  requireAuth,
  requireRole("admin", "empresa", "egresado"),
  notificacionesController.unreadCount
);

router.patch(
  "/leer-todas",
  requireAuth,
  requireRole("admin", "empresa", "egresado"),
  notificacionesController.markAllRead
);

router.patch(
  "/:id/leida",
  requireAuth,
  requireRole("admin", "empresa", "egresado"),
  notificacionesController.markRead
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  notificacionesController.delete
);

export default router;
