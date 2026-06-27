import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { egresadoController } from "./egresado.controller.js";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("egresado"), egresadoController.dashboard);
router.get("/bolsa", requireAuth, requireRole("egresado"), egresadoController.bolsa);
router.get("/postulaciones", requireAuth, requireRole("egresado"), egresadoController.postulaciones);
router.get("/perfil", requireAuth, requireRole("egresado"), egresadoController.perfil);
router.get("/historial", requireAuth, requireRole("egresado"), egresadoController.historial);
router.get("/encuesta", requireAuth, requireRole("egresado"), egresadoController.encuesta);

export default router;
