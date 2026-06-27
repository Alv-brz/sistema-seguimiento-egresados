import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { empresaController } from "./empresa.controller.js";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("empresa"), empresaController.dashboard);
router.get("/ofertas", requireAuth, requireRole("empresa"), empresaController.ofertas);
router.get("/postulaciones", requireAuth, requireRole("empresa"), empresaController.postulaciones);
router.get("/perfil", requireAuth, requireRole("empresa"), empresaController.perfil);

export default router;
