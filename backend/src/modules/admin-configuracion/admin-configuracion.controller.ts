import type { Request, Response } from "express";
import type { ResultSetHeader } from "mysql2";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  getConfiguracionSistema,
  updateConfiguracionSistema,
  type ConfiguracionSistemaInput,
} from "./admin-configuracion.service.js";

function badRequest(res: Response, error: string) {
  res.status(400).json({ ok: false, error });
}

function normalizeRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean === "" ? null : clean;
}

function parseInput(body: Record<string, unknown>, res: Response): ConfiguracionSistemaInput | null {
  const meses = Number(body.tiempo_entre_encuestas_meses);
  const input: ConfiguracionSistemaInput = {
    nombre_universidad: normalizeRequiredString(body.nombre_universidad),
    correo_institucional: normalizeRequiredString(body.correo_institucional),
    telefono: normalizeNullableString(body.telefono),
    logo_url: normalizeNullableString(body.logo_url),
    tiempo_entre_encuestas_meses: meses,
    estado_sistema: normalizeRequiredString(body.estado_sistema),
    version_sistema: normalizeRequiredString(body.version_sistema),
  };

  if (!input.nombre_universidad || !input.correo_institucional || !input.estado_sistema || !input.version_sistema) {
    badRequest(res, "Nombre de universidad, correo, estado y versión son obligatorios.");
    return null;
  }

  if (!Number.isInteger(meses)) {
    badRequest(res, "El tiempo entre encuestas debe ser un número entero.");
    return null;
  }

  return input;
}

export const adminConfiguracionController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    const data = await getConfiguracionSistema();
    if (!data) {
      res.status(404).json({ ok: false, error: "Configuración del sistema no encontrada." });
      return;
    }

    res.json({ ok: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    const result = (await updateConfiguracionSistema(input)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Configuración del sistema no encontrada." });
      return;
    }

    const data = await getConfiguracionSistema();
    res.json({ ok: true, data });
  }),
};
