import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { auditoriaController } from "./auditoria.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), auditoriaController.list);

export default router;
