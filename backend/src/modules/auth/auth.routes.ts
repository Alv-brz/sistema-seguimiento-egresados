import { Router } from "express";
import { authController } from "./auth.controller.js";
import { requireAuth, requireRole } from "./auth.middleware.js";

const router = Router();

// POST /api/auth/login — autenticación contra tabla usuario
router.post("/login", authController.login);

// GET /api/auth/me — sesión autenticada reconstruida desde MySQL
router.get(
  "/me",
  requireAuth,
  requireRole("admin", "empresa", "egresado"),
  authController.me
);

export default router;
