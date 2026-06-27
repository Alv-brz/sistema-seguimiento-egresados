import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";
import {
  closeEmpresaOferta,
  createEmpresaOferta,
  deleteEmpresaOferta,
  getEmpresaDashboard,
  getEmpresaPerfil,
  listEmpresaOfertas,
  listEmpresaPostulaciones,
  updateEmpresaOferta,
  updateEmpresaOfertaEstado,
  updateEmpresaPerfil,
  updateEmpresaPostulacionEstado,
  type OfertaInput,
  type PerfilEmpresaInput,
  type PostulacionEstado,
} from "./empresa.service.js";
import type { ResultSetHeader } from "mysql2";

function getAuthEmpresaId(res: Response): number | null {
  const auth = res.locals.auth;
  return auth?.role === "empresa" ? auth.id_usuario : null;
}

const VALID_OFERTA_STATES = new Set(["Activa", "Cerrada"]);
const VALID_POSTULACION_STATES = new Set(["Pendiente", "Aceptado", "Rechazado"]);

function badRequest(res: Response, error: string) {
  res.status(400).json({ ok: false, error });
}

function parsePositiveId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean === "" ? null : clean;
}

function normalizeRequiredString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseOfertaInput(body: Record<string, unknown>, res: Response): OfertaInput | null {
  const input: OfertaInput = {
    titulo: normalizeRequiredString(body.titulo),
    descripcion: normalizeRequiredString(body.descripcion),
    puesto: normalizeRequiredString(body.puesto),
    area: normalizeRequiredString(body.area),
    ubicacion: normalizeRequiredString(body.ubicacion),
    modalidad: normalizeRequiredString(body.modalidad),
    tipo_contrato: normalizeRequiredString(body.tipo_contrato),
    salario: body.salario === null || body.salario === "" || body.salario === undefined ? null : Number(body.salario),
    requisitos: normalizeNullableString(body.requisitos),
    fecha_cierre: normalizeRequiredString(body.fecha_cierre),
    estado_oferta: normalizeRequiredString(body.estado_oferta) as OfertaInput["estado_oferta"],
  };

  if (
    !input.titulo ||
    !input.descripcion ||
    !input.puesto ||
    !input.area ||
    !input.ubicacion ||
    !input.modalidad ||
    !input.tipo_contrato ||
    !input.fecha_cierre
  ) {
    badRequest(res, "Completa todos los campos obligatorios de la oferta.");
    return null;
  }

  if (!VALID_OFERTA_STATES.has(input.estado_oferta)) {
    badRequest(res, "estado_oferta debe ser Activa o Cerrada.");
    return null;
  }

  if (input.salario !== null && (!Number.isFinite(input.salario) || input.salario <= 0)) {
    badRequest(res, "El salario debe ser mayor a 0 si se informa.");
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fechaCierre = new Date(`${input.fecha_cierre}T00:00:00`);

  if (Number.isNaN(fechaCierre.getTime()) || fechaCierre <= today) {
    badRequest(res, "fecha_cierre debe ser mayor a la fecha_publicacion.");
    return null;
  }

  return input;
}

function parsePerfilInput(body: Record<string, unknown>, res: Response): PerfilEmpresaInput | null {
  const input: PerfilEmpresaInput = {
    nombre_comercial: normalizeNullableString(body.nombre_comercial),
    sector: normalizeRequiredString(body.sector),
    direccion: normalizeRequiredString(body.direccion),
    telefono: normalizeNullableString(body.telefono),
    pagina_web: normalizeNullableString(body.pagina_web),
    correo: normalizeRequiredString(body.correo),
  };

  if (!input.sector || !input.direccion || !input.correo) {
    badRequest(res, "Sector, dirección y correo son obligatorios.");
    return null;
  }

  if (input.pagina_web && !input.pagina_web.startsWith("www.")) {
    badRequest(res, "La página web debe iniciar con www. si se informa.");
    return null;
  }

  if (!input.correo.includes("@")) {
    badRequest(res, "Correo inválido.");
    return null;
  }

  return input;
}

export const empresaController = {
  dashboard: asyncHandler(async (_req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getEmpresaDashboard(idEmpresa);
    res.json({ ok: true, data });
  }),

  ofertas: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await listEmpresaOfertas(idEmpresa, getPagination(req.query), {
      estado: getExactFilter(req.query.estado, "Todos"),
      modalidad: getExactFilter(req.query.modalidad, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  postulaciones: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await listEmpresaPostulaciones(idEmpresa, getPagination(req.query), {
      search: getStringFilter(req.query.search),
      estado: getExactFilter(req.query.estado, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  perfil: asyncHandler(async (_req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const data = await getEmpresaPerfil(idEmpresa);
    res.json({ ok: true, data });
  }),

  createOferta: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const input = parseOfertaInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    await createEmpresaOferta(idEmpresa, input);
    res.status(201).json({ ok: true });
  }),

  updateOferta: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    const idOferta = parsePositiveId(req.params.id);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }
    if (!idOferta) {
      badRequest(res, "id de oferta inválido.");
      return;
    }

    const input = parseOfertaInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    const result = (await updateEmpresaOferta(idEmpresa, idOferta, input)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Oferta no encontrada para la empresa autenticada." });
      return;
    }

    res.json({ ok: true });
  }),

  closeOferta: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    const idOferta = parsePositiveId(req.params.id);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }
    if (!idOferta) {
      badRequest(res, "id de oferta inválido.");
      return;
    }

    const result = (await closeEmpresaOferta(idEmpresa, idOferta)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Oferta no encontrada para la empresa autenticada." });
      return;
    }

    res.json({ ok: true });
  }),

  updateOfertaEstado: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    const idOferta = parsePositiveId(req.params.id);
    const estado = normalizeRequiredString((req.body as { estado_oferta?: unknown }).estado_oferta) as OfertaInput["estado_oferta"];
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }
    if (!idOferta) {
      badRequest(res, "id de oferta inválido.");
      return;
    }
    if (!VALID_OFERTA_STATES.has(estado)) {
      badRequest(res, "estado_oferta debe ser Activa o Cerrada.");
      return;
    }

    const result = (await updateEmpresaOfertaEstado(idEmpresa, idOferta, estado)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Oferta no encontrada para la empresa autenticada." });
      return;
    }

    res.json({ ok: true });
  }),

  deleteOferta: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    const idOferta = parsePositiveId(req.params.id);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }
    if (!idOferta) {
      badRequest(res, "id de oferta inválido.");
      return;
    }

    const result = await deleteEmpresaOferta(idEmpresa, idOferta);
    if (result.hasPostulaciones) {
      res.status(409).json({
        ok: false,
        error: "No se puede eliminar una oferta con postulaciones asociadas. Puede cerrarla.",
      });
      return;
    }

    const deleteResult = result.result as ResultSetHeader;
    if (deleteResult.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Oferta no encontrada para la empresa autenticada." });
      return;
    }

    res.json({ ok: true });
  }),

  updatePostulacionEstado: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    const idPostulacion = parsePositiveId(req.params.id);
    const estado = normalizeRequiredString((req.body as { estado?: unknown }).estado) as PostulacionEstado;
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }
    if (!idPostulacion) {
      badRequest(res, "id de postulación inválido.");
      return;
    }
    if (!VALID_POSTULACION_STATES.has(estado)) {
      badRequest(res, "Estado de postulación inválido. Usa Pendiente, Aceptado o Rechazado.");
      return;
    }

    const result = (await updateEmpresaPostulacionEstado(idEmpresa, idPostulacion, estado)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Postulación no encontrada para la empresa autenticada." });
      return;
    }

    res.json({ ok: true });
  }),

  updatePerfil: asyncHandler(async (req: Request, res: Response) => {
    const idEmpresa = getAuthEmpresaId(res);
    if (!idEmpresa) {
      res.status(403).json({ ok: false, reason: "forbidden" });
      return;
    }

    const input = parsePerfilInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    await updateEmpresaPerfil(idEmpresa, input);
    res.json({ ok: true });
  }),
};
