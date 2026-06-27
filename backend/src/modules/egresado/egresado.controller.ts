import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";
import {
  createEncuesta,
  createHistorialLaboral,
  createPostulacion,
  deleteHistorialLaboral,
  getEgresadoDashboard,
  getEgresadoPerfil,
  getUltimaEncuesta,
  listCarreras,
  listBolsaLaboral,
  listEgresadoPostulaciones,
  listHistorialLaboral,
  updateEgresadoPerfil,
  updateHistorialLaboral,
  type EgresadoPerfilInput,
  type EncuestaInput,
  type HistorialLaboralInput,
} from "./egresado.service.js";
import type { ResultSetHeader } from "mysql2";

function getAuthEgresadoId(res: Response): number | null {
  const auth = res.locals.auth;
  return auth?.role === "egresado" ? auth.id_usuario : null;
}

function badRequest(res: Response, error: string) {
  res.status(400).json({ ok: false, error });
}

function normalizeRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean === "" || clean === "Seleccionar..." ? null : clean;
}

function parsePositiveId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : NaN;
}

function isFutureDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) || date > today;
}

function parsePerfilInput(body: Record<string, unknown>, res: Response): EgresadoPerfilInput | null {
  const sexo = normalizeRequiredString(body.sexo) as EgresadoPerfilInput["sexo"];
  const idCarreraRaw = body.id_carrera === undefined || body.id_carrera === "" ? null : Number(body.id_carrera);
  const input: EgresadoPerfilInput = {
    dni: normalizeRequiredString(body.dni),
    nombre_egresado: normalizeRequiredString(body.nombre_egresado),
    apellidos_egresado: normalizeRequiredString(body.apellidos_egresado),
    telefono: normalizeNullableString(body.telefono),
    direccion: normalizeNullableString(body.direccion),
    fecha_egreso: normalizeRequiredString(body.fecha_egreso),
    sexo,
    id_carrera: Number.isInteger(idCarreraRaw) && Number(idCarreraRaw) > 0 ? Number(idCarreraRaw) : null,
    nombre_carrera: normalizeNullableString(body.nombre_carrera),
    correo: normalizeRequiredString(body.correo),
  };

  if (!/^\d{8}$/.test(input.dni)) {
    badRequest(res, "El DNI debe tener 8 dígitos.");
    return null;
  }
  if (!input.nombre_egresado || !input.apellidos_egresado || !input.fecha_egreso || !input.correo) {
    badRequest(res, "Nombre, apellidos, fecha de egreso y correo son obligatorios.");
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
  if (!input.correo.includes("@")) {
    badRequest(res, "Correo inválido.");
    return null;
  }
  if (!input.id_carrera && !input.nombre_carrera) {
    badRequest(res, "Carrera inválida.");
    return null;
  }

  return input;
}

function parseHistorialInput(body: Record<string, unknown>, res: Response): HistorialLaboralInput | null {
  const salario = parseNullableNumber(body.salario);
  const actual = body.actual === true || body.actual === 1 || body.actual === "true" || body.actual === "1";
  const input: HistorialLaboralInput = {
    nombre_empresa: normalizeRequiredString(body.nombre_empresa),
    cargo: normalizeRequiredString(body.cargo),
    fecha_inicio: normalizeRequiredString(body.fecha_inicio),
    fecha_fin: actual ? null : normalizeNullableString(body.fecha_fin),
    salario,
    modalidad: normalizeRequiredString(body.modalidad),
    actual,
  };

  if (!input.nombre_empresa || !input.cargo || !input.fecha_inicio || !input.modalidad) {
    badRequest(res, "Empresa, cargo, fecha de inicio y modalidad son obligatorios.");
    return null;
  }
  if (salario !== null && (!Number.isFinite(salario) || salario < 0)) {
    badRequest(res, "El salario no puede ser negativo.");
    return null;
  }
  if (input.fecha_fin && new Date(`${input.fecha_fin}T00:00:00`) < new Date(`${input.fecha_inicio}T00:00:00`)) {
    badRequest(res, "La fecha fin debe ser mayor o igual a la fecha inicio.");
    return null;
  }

  return input;
}

function parseEncuestaInput(body: Record<string, unknown>, res: Response): EncuestaInput | null {
  const sueldo = parseNullableNumber(body.sueldo_mensual);
  const input: EncuestaInput = {
    estado_laboral: normalizeRequiredString(body.estado_laboral),
    nombre_empresa_actual: normalizeNullableString(body.nombre_empresa_actual),
    cargo_actual: normalizeNullableString(body.cargo_actual),
    area_trabajo: normalizeNullableString(body.area_trabajo),
    sueldo_mensual: sueldo,
    tipo_contrato: normalizeNullableString(body.tipo_contrato),
    satisfaccion_profesional: normalizeNullableString(body.satisfaccion_profesional),
    tiempo_conseguir_empleo: normalizeNullableString(body.tiempo_conseguir_empleo),
    observaciones: normalizeNullableString(body.observaciones),
  };

  if (!input.estado_laboral || input.estado_laboral === "Seleccionar...") {
    badRequest(res, "Estado laboral es obligatorio.");
    return null;
  }
  if (sueldo !== null && (!Number.isFinite(sueldo) || sueldo < 0)) {
    badRequest(res, "El sueldo mensual no puede ser negativo.");
    return null;
  }

  return input;
}

export const egresadoController = {
  dashboard: asyncHandler(async (_req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getEgresadoDashboard(idEgresado);
    res.json({ ok: true, data });
  }),

  bolsa: asyncHandler(async (req: Request, res: Response) => {
    const data = await listBolsaLaboral(getPagination(req.query), {
      search: getStringFilter(req.query.search),
      modalidad: getExactFilter(req.query.modalidad, "Todos"),
      contrato: getExactFilter(req.query.contrato, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  carreras: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listCarreras();
    res.json({ ok: true, data });
  }),

  createPostulacion: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const idOferta = Number((req.body as { id_oferta?: unknown }).id_oferta);
    if (!Number.isInteger(idOferta) || idOferta <= 0) {
      badRequest(res, "id_oferta inválido.");
      return;
    }

    const result = await createPostulacion(idEgresado, idOferta);
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }

    res.status(201).json({ ok: true });
  }),

  postulaciones: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await listEgresadoPostulaciones(idEgresado, getPagination(req.query), {
      search: getStringFilter(req.query.search),
      estado: getExactFilter(req.query.estado, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  perfil: asyncHandler(async (_req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getEgresadoPerfil(idEgresado);
    res.json({ ok: true, data });
  }),

  updatePerfil: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const input = parsePerfilInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    const result = await updateEgresadoPerfil(idEgresado, input);
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }

    res.json({ ok: true });
  }),

  historial: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await listHistorialLaboral(idEgresado, getPagination(req.query), {
      search: getStringFilter(req.query.search),
      actual: getExactFilter(req.query.actual, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  createHistorial: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const input = parseHistorialInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    await createHistorialLaboral(idEgresado, input);
    res.status(201).json({ ok: true });
  }),

  updateHistorial: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    const idHistorial = parsePositiveId(req.params.id);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }
    if (!idHistorial) {
      badRequest(res, "id de historial inválido.");
      return;
    }

    const input = parseHistorialInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    const result = (await updateHistorialLaboral(idEgresado, idHistorial, input)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Historial no encontrado para el egresado autenticado." });
      return;
    }

    res.json({ ok: true });
  }),

  deleteHistorial: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    const idHistorial = parsePositiveId(req.params.id);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }
    if (!idHistorial) {
      badRequest(res, "id de historial inválido.");
      return;
    }

    const result = (await deleteHistorialLaboral(idEgresado, idHistorial)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Historial no encontrado para el egresado autenticado." });
      return;
    }

    res.json({ ok: true });
  }),

  encuesta: asyncHandler(async (_req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getUltimaEncuesta(idEgresado);
    res.json({ ok: true, data });
  }),

  createEncuesta: asyncHandler(async (req: Request, res: Response) => {
    const idEgresado = getAuthEgresadoId(res);
    if (!idEgresado) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const input = parseEncuestaInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    const result = await createEncuesta(idEgresado, input);
    if (!result.ok) {
      res.status(result.status).json({ ok: false, error: result.error });
      return;
    }

    res.status(201).json({ ok: true, data: { id_encuesta: result.idEncuesta } });
  }),
};
