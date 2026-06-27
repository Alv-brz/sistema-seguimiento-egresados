import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { egresadoController } from "./egresado.controller.js";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("egresado"), egresadoController.dashboard);
router.get("/bolsa", requireAuth, requireRole("egresado"), egresadoController.bolsa);
router.get("/carreras", requireAuth, requireRole("egresado"), egresadoController.carreras);
router.get("/postulaciones", requireAuth, requireRole("egresado"), egresadoController.postulaciones);
router.post("/postulaciones", requireAuth, requireRole("egresado"), egresadoController.createPostulacion);
router.get("/perfil", requireAuth, requireRole("egresado"), egresadoController.perfil);
router.put("/perfil", requireAuth, requireRole("egresado"), egresadoController.updatePerfil);
router.get("/historial", requireAuth, requireRole("egresado"), egresadoController.historial);
router.post("/historial", requireAuth, requireRole("egresado"), egresadoController.createHistorial);
router.put("/historial/:id", requireAuth, requireRole("egresado"), egresadoController.updateHistorial);
router.delete("/historial/:id", requireAuth, requireRole("egresado"), egresadoController.deleteHistorial);
router.get("/encuesta", requireAuth, requireRole("egresado"), egresadoController.encuesta);
router.post("/encuesta", requireAuth, requireRole("egresado"), egresadoController.createEncuesta);

export default router;
