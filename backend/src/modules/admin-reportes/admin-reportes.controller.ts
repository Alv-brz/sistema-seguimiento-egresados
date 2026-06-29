import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getExactFilter, getStringFilter } from "../../utils/pagination.js";
import { exportAdminReport, type ExportFormat, type ReportKind } from "./admin-reportes.service.js";

function parseKind(value: unknown): ReportKind {
  if (value === "estadisticas") return "estadisticas";
  return value === "encuestas" ? "encuestas" : "administrativo";
}

function parseDashboardYear(value: unknown): number | undefined {
  const raw = getExactFilter(value, "Todos los años");
  return /^\d{4}$/.test(raw) ? Number(raw) : undefined;
}

function contentDisposition(filename: string): string {
  return `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function sendExport(req: Request, res: Response, format: ExportFormat) {
  const result = await exportAdminReport({
    kind: parseKind(req.query.tipo),
    format,
    userId: res.locals.auth?.id_usuario ?? 0,
    dashboardFilters: {
      facultad: getExactFilter(req.query.facultad, "Todas las facultades"),
      carrera: getExactFilter(req.query.carrera, "Todas las carreras"),
      anio: parseDashboardYear(req.query.anio),
      estadoLaboral: getExactFilter(req.query.estadoLaboral, "Todos los estados laborales"),
    },
    encuestasFilters: {
      search: getStringFilter(req.query.search),
      estadoLaboral: getExactFilter(req.query.estadoLaboral, "Todos"),
    },
  });

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", contentDisposition(result.filename));
  res.setHeader("Content-Length", result.buffer.length);
  res.send(result.buffer);
}

export const adminReportesController = {
  pdf: asyncHandler(async (req: Request, res: Response) => {
    await sendExport(req, res, "pdf");
  }),

  excel: asyncHandler(async (req: Request, res: Response) => {
    await sendExport(req, res, "excel");
  }),
};
