import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { adminReportesController } from "./admin-reportes.controller.js";

const router = Router();

router.get("/export/pdf", requireAuth, requireRole("admin"), adminReportesController.pdf);
router.get("/export/excel", requireAuth, requireRole("admin"), adminReportesController.excel);

export default router;
