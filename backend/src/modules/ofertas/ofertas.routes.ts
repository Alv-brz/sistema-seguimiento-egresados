import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { ofertasController } from "./ofertas.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), ofertasController.list);
router.post("/", requireAuth, requireRole("admin"), ofertasController.create);
router.put("/:id", requireAuth, requireRole("admin"), ofertasController.update);
router.patch("/:id/estado", requireAuth, requireRole("admin"), ofertasController.updateEstado);
router.delete("/:id", requireAuth, requireRole("admin"), ofertasController.delete);

export default router;
