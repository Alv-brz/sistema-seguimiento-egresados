import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { empresasController } from "./empresas.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), empresasController.list);
router.post("/", requireAuth, requireRole("admin"), empresasController.create);
router.put("/:id", requireAuth, requireRole("admin"), empresasController.update);
router.patch("/:id/estado", requireAuth, requireRole("admin"), empresasController.updateEstado);
router.delete("/:id", requireAuth, requireRole("admin"), empresasController.delete);

export default router;
