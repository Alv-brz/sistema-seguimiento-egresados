import express, { type Application } from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRoutes from "./modules/health/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";

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

  // Manejo centralizado de errores (último middleware).
  app.use(errorHandler);

  return app;
}
