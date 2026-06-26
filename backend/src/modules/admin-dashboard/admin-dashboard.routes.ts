import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { adminDashboardController } from "./admin-dashboard.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), adminDashboardController.get);

export default router;
