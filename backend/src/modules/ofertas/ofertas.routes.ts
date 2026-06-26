import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { ofertasController } from "./ofertas.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), ofertasController.list);

export default router;
