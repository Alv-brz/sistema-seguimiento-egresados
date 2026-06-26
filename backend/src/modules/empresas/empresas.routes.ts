import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { empresasController } from "./empresas.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), empresasController.list);

export default router;
