import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { empresaController } from "./empresa.controller.js";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("empresa"), empresaController.dashboard);
router.get("/ofertas", requireAuth, requireRole("empresa"), empresaController.ofertas);
router.post("/ofertas", requireAuth, requireRole("empresa"), empresaController.createOferta);
router.put("/ofertas/:id", requireAuth, requireRole("empresa"), empresaController.updateOferta);
router.patch("/ofertas/:id/cerrar", requireAuth, requireRole("empresa"), empresaController.closeOferta);
router.get("/postulaciones", requireAuth, requireRole("empresa"), empresaController.postulaciones);
router.patch("/postulaciones/:id/estado", requireAuth, requireRole("empresa"), empresaController.updatePostulacionEstado);
router.get("/perfil", requireAuth, requireRole("empresa"), empresaController.perfil);
router.put("/perfil", requireAuth, requireRole("empresa"), empresaController.updatePerfil);

export default router;
