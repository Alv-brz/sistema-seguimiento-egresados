import express, { type Application } from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./modules/health/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import adminDashboardRoutes from "./modules/admin-dashboard/admin-dashboard.routes.js";
import egresadosRoutes from "./modules/egresados/egresados.routes.js";
import empresasRoutes from "./modules/empresas/empresas.routes.js";
import ofertasRoutes from "./modules/ofertas/ofertas.routes.js";
import encuestasRoutes from "./modules/encuestas/encuestas.routes.js";
import auditoriaRoutes from "./modules/auditoria/auditoria.routes.js";
import notificacionesRoutes from "./modules/notificaciones/notificaciones.routes.js";

export function createApp(): Application {
  const app = express();

  // Confía en el proxy (útil tras un reverse proxy en producción).
  app.set("trust proxy", 1);

  // CORS: permite al frontend (Vite) llamar a la API.
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    })
  );

  // Parsing de cuerpos JSON.
  app.use(express.json());

  // Logs de solicitudes en desarrollo.
  app.use(morgan("dev"));

  // Rutas de la API (todas bajo /api).
  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/admin/dashboard", adminDashboardRoutes);
  app.use("/api/egresados", egresadosRoutes);
  app.use("/api/empresas", empresasRoutes);
  app.use("/api/ofertas", ofertasRoutes);
  app.use("/api/encuestas", encuestasRoutes);
  app.use("/api/auditoria", auditoriaRoutes);
  app.use("/api/notificaciones", notificacionesRoutes);

  // Manejo centralizado de errores (último middleware).
  app.use(errorHandler);

  return app;
}
