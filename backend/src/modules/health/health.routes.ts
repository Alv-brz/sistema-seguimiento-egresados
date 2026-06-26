import { Router } from "express";
import { healthController } from "./health.controller.js";

const router = Router();

// GET /api/health → estado del servidor + conexión a MySQL
router.get("/health", healthController.health);

export default router;
