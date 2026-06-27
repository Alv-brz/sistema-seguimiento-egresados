import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { egresadosController } from "./egresados.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), egresadosController.list);
router.post("/", requireAuth, requireRole("admin"), egresadosController.create);
router.put("/:id", requireAuth, requireRole("admin"), egresadosController.update);
router.delete("/:id", requireAuth, requireRole("admin"), egresadosController.delete);

export default router;
