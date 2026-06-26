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

export default router;
