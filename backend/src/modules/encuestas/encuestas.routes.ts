import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { encuestasController } from "./encuestas.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), encuestasController.list);
router.delete("/:id", requireAuth, requireRole("admin"), encuestasController.delete);

export default router;
