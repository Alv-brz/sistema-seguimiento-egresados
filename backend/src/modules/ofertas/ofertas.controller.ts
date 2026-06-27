import type { Request, Response } from "express";
import type { ResultSetHeader } from "mysql2";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  deleteOferta,
  listOfertas,
  updateOferta,
  updateOfertaEstado,
  type AdminOfertaInput,
} from "./ofertas.service.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";

const VALID_OFERTA_STATES = new Set(["Activa", "Cerrada"]);

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

function parseInput(body: Record<string, unknown>, res: Response): AdminOfertaInput | null {
  const salario = body.salario === null || body.salario === "" || body.salario === undefined ? null : Number(body.salario);
  const estado = normalizeRequiredString(body.estado_oferta) as AdminOfertaInput["estado_oferta"];
  const input: AdminOfertaInput = {
    titulo: normalizeRequiredString(body.titulo),
    descripcion: normalizeRequiredString(body.descripcion),
    puesto: normalizeRequiredString(body.puesto),
    area: normalizeRequiredString(body.area),
    ubicacion: normalizeRequiredString(body.ubicacion),
    modalidad: normalizeRequiredString(body.modalidad),
    tipo_contrato: normalizeRequiredString(body.tipo_contrato),
    salario,
    requisitos: normalizeNullableString(body.requisitos),
    fecha_cierre: normalizeRequiredString(body.fecha_cierre),
    estado_oferta: estado,
  };

  if (!input.titulo || !input.descripcion || !input.puesto || !input.area || !input.ubicacion || !input.modalidad || !input.tipo_contrato || !input.fecha_cierre) {
    badRequest(res, "Completa todos los campos obligatorios de la oferta.");
    return null;
  }
  if (!VALID_OFERTA_STATES.has(estado)) {
    badRequest(res, "estado_oferta debe ser Activa o Cerrada.");
    return null;
  }
  if (salario !== null && (!Number.isFinite(salario) || salario <= 0)) {
    badRequest(res, "El salario debe ser mayor a 0 si se informa.");
    return null;
  }

  return input;
}

export const ofertasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listOfertas(getPagination(_req.query), {
      search: getStringFilter(_req.query.search),
      estado: getExactFilter(_req.query.estado, "Todos"),
      modalidad: getExactFilter(_req.query.modalidad, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      badRequest(res, "id de oferta inválido.");
      return;
    }

    const input = parseInput(req.body as Record<string, unknown>, res);
    if (!input) return;

    const result = (await updateOferta(id, input)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Oferta no encontrada." });
      return;
    }

    res.json({ ok: true });
  }),

  updateEstado: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    const estado = normalizeRequiredString((req.body as { estado_oferta?: unknown }).estado_oferta) as AdminOfertaInput["estado_oferta"];
    if (!id) {
      badRequest(res, "id de oferta inválido.");
      return;
    }
    if (!VALID_OFERTA_STATES.has(estado)) {
      badRequest(res, "estado_oferta debe ser Activa o Cerrada.");
      return;
    }

    const result = (await updateOfertaEstado(id, estado)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Oferta no encontrada." });
      return;
    }

    res.json({ ok: true });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      badRequest(res, "id de oferta inválido.");
      return;
    }

    const deleteResult = await deleteOferta(id);
    if (deleteResult.blockedByPostulaciones) {
      res.status(409).json({
        ok: false,
        error: "No se puede eliminar una oferta con postulaciones asociadas. Puede cerrarla.",
      });
      return;
    }

    const result = deleteResult.result as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Oferta no encontrada." });
      return;
    }

    res.json({ ok: true });
  }),
};
