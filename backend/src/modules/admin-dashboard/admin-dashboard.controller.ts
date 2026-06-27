import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getAdminDashboard } from "./admin-dashboard.service.js";
import { getExactFilter } from "../../utils/pagination.js";

export const adminDashboardController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const anioRaw = getExactFilter(req.query.anio, "Todos los años");
    const anio = /^\d{4}$/.test(anioRaw) ? Number(anioRaw) : undefined;
    const data = await getAdminDashboard({
      facultad: getExactFilter(req.query.facultad, "Todas las facultades"),
      carrera: getExactFilter(req.query.carrera, "Todas las carreras"),
      anio,
      estadoLaboral: getExactFilter(req.query.estadoLaboral, "Todos los estados laborales"),
    });
    res.json({ ok: true, data });
  }),
};
