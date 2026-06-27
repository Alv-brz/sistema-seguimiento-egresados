import type { Request, Response } from "express";
import type { ResultSetHeader } from "mysql2";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  createEgresado,
  deleteEgresado,
  listEgresados,
  updateEgresado,
  updateEgresadoEstado,
  type AdminEgresadoInput,
} from "./egresados.service.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";

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

function parsePositiveId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isFutureDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) || date > today;
}

function parseInput(body: Record<string, unknown>, res: Response, mode: "create" | "update"): AdminEgresadoInput | null {
  const sexo = normalizeRequiredString(body.sexo) as AdminEgresadoInput["sexo"];
  const idCarrera = Number(body.id_carrera);
  const input: AdminEgresadoInput = {
    nombre_usuario: normalizeRequiredString(body.nombre_usuario),
    password: normalizeRequiredString(body.password) || undefined,
    correo: normalizeRequiredString(body.correo),
    estado_usuario: normalizeRequiredString(body.estado_usuario) || "Activo",
    dni: normalizeRequiredString(body.dni),
    nombre_egresado: normalizeRequiredString(body.nombre_egresado),
    apellidos_egresado: normalizeRequiredString(body.apellidos_egresado),
    telefono: normalizeNullableString(body.telefono),
    direccion: normalizeNullableString(body.direccion),
    fecha_egreso: normalizeRequiredString(body.fecha_egreso),
    sexo,
    id_carrera: Number.isInteger(idCarrera) ? idCarrera : 0,
  };

  if (!/^\d{8}$/.test(input.dni)) {
    badRequest(res, "El DNI debe tener 8 dígitos.");
    return null;
  }
  if (!input.nombre_usuario || !input.correo || !input.nombre_egresado || !input.apellidos_egresado || !input.fecha_egreso) {
    badRequest(res, "Completa los campos obligatorios del egresado.");
    return null;
  }
  if (mode === "create" && !input.password) {
    badRequest(res, "La contraseña es obligatoria al crear un egresado.");
    return null;
  }
  if (!input.correo.includes("@")) {
    badRequest(res, "Correo inválido.");
    return null;
  }
  if (sexo !== "M" && sexo !== "F") {
    badRequest(res, "Sexo inválido. Usa M o F.");
    return null;
  }
  if (isFutureDate(input.fecha_egreso)) {
    badRequest(res, "La fecha de egreso no puede ser futura.");
    return null;
  }
  if (!Number.isInteger(input.id_carrera) || input.id_carrera <= 0) {
    badRequest(res, "Carrera inválida.");
    return null;
  }

  return input;
}

export const egresadosController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEgresados(getPagination(_req.query), {
      search: getStringFilter(_req.query.search),
      carrera: getExactFilter(_req.query.carrera, "Todas"),
      estado: getExactFilter(_req.query.estado, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(req.body as Record<string, unknown>, res, "create");
    if (!input) return;

    const data = await createEgresado(input);
    res.status(201).json({ ok: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      badRequest(res, "id de egresado inválido.");
      return;
    }

    const input = parseInput(req.body as Record<string, unknown>, res, "update");
    if (!input) return;

    const result = (await updateEgresado(id, input)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Egresado no encontrado." });
      return;
    }

    res.json({ ok: true });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      badRequest(res, "id de egresado inválido.");
      return;
    }

    const result = (await deleteEgresado(id)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Egresado no encontrado." });
      return;
    }

    res.json({ ok: true });
  }),

  updateEstado: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    const estado = normalizeRequiredString((req.body as { estado_usuario?: unknown }).estado_usuario);
    if (!id) {
      badRequest(res, "id de egresado inválido.");
      return;
    }
    if (estado !== "Activo" && estado !== "Inactivo") {
      badRequest(res, "estado_usuario debe ser Activo o Inactivo.");
      return;
    }

    const result = (await updateEgresadoEstado(id, estado)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Egresado no encontrado." });
      return;
    }

    res.json({ ok: true });
  }),
};
