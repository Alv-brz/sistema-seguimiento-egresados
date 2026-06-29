import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { adminSqlEvidenciasController } from "./admin-sql-evidencias.controller.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", adminSqlEvidenciasController.overview);
router.get("/vistas/:name", adminSqlEvidenciasController.view);
router.post("/funciones/:name/run", adminSqlEvidenciasController.functionRun);
router.post("/procedimientos/:name/run", adminSqlEvidenciasController.procedureRun);
router.get("/auditoria/reciente", adminSqlEvidenciasController.auditRecent);
router.post("/auditoria/probar", adminSqlEvidenciasController.auditEvidence);
router.post("/signal/:name/test", adminSqlEvidenciasController.signalTest);
router.get("/roles", adminSqlEvidenciasController.roles);

export default router;
