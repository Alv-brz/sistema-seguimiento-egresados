import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { egresadosController } from "./egresados.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), egresadosController.list);

export default router;
