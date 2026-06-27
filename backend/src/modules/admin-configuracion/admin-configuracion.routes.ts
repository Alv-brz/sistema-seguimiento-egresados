import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { adminConfiguracionController } from "./admin-configuracion.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), adminConfiguracionController.get);
router.put("/", requireAuth, requireRole("admin"), adminConfiguracionController.update);

export default router;
