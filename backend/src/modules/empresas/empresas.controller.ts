import type { Request, Response } from "express";
import type { ResultSetHeader } from "mysql2";
import { asyncHandler } from "../../middleware/errorHandler.js";
import {
  createEmpresa,
  listEmpresas,
  updateEmpresa,
  updateEmpresaEstado,
  type AdminEmpresaInput,
} from "./empresas.service.js";
import { getExactFilter, getPagination, getStringFilter } from "../../utils/pagination.js";
import { registerAuditEvent } from "../auditoria/auditoria.service.js";
import { notifyCuentaEstado } from "../notificaciones/notificaciones.service.js";

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

function parseInput(body: Record<string, unknown>, res: Response, mode: "create" | "update"): AdminEmpresaInput | null {
  const input: AdminEmpresaInput = {
    nombre_usuario: normalizeRequiredString(body.nombre_usuario),
    password: normalizeRequiredString(body.password) || undefined,
    correo: normalizeRequiredString(body.correo),
    estado_usuario: normalizeRequiredString(body.estado_usuario) || "Activo",
    ruc: normalizeRequiredString(body.ruc),
    razon_social: normalizeRequiredString(body.razon_social),
    nombre_comercial: normalizeNullableString(body.nombre_comercial),
    sector: normalizeRequiredString(body.sector),
    direccion: normalizeRequiredString(body.direccion),
    telefono: normalizeNullableString(body.telefono),
    pagina_web: normalizeNullableString(body.pagina_web),
  };

  if (!/^\d{11}$/.test(input.ruc)) {
    badRequest(res, "El RUC debe tener 11 dígitos.");
    return null;
  }
  if (!input.nombre_usuario || !input.correo || !input.razon_social || !input.sector || !input.direccion) {
    badRequest(res, "Completa los campos obligatorios de la empresa.");
    return null;
  }
  if (mode === "create" && !input.password) {
    badRequest(res, "La contraseña es obligatoria al crear una empresa.");
    return null;
  }
  if (!input.correo.includes("@")) {
    badRequest(res, "Correo inválido.");
    return null;
  }
  if (input.pagina_web && !input.pagina_web.startsWith("www.")) {
    badRequest(res, "La página web debe iniciar con www. si se informa.");
    return null;
  }

  return input;
}

export const empresasController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await listEmpresas(getPagination(_req.query), {
      search: getStringFilter(_req.query.search),
      sector: getExactFilter(_req.query.sector, "Todos"),
      estado: getExactFilter(_req.query.estado, "Todos"),
    });
    res.json({ ok: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(req.body as Record<string, unknown>, res, "create");
    if (!input) return;

    const data = await createEmpresa(input);
    res.status(201).json({ ok: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      badRequest(res, "id de empresa inválido.");
      return;
    }

    const input = parseInput(req.body as Record<string, unknown>, res, "update");
    if (!input) return;

    const result = (await updateEmpresa(id, input)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Empresa no encontrada." });
      return;
    }

    res.json({ ok: true });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      badRequest(res, "id de empresa inválido.");
      return;
    }

    res.status(405).json({
      ok: false,
      error: "Las empresas no se eliminan físicamente. Use Desactivar para conservar ofertas e historial.",
    });
  }),

  updateEstado: asyncHandler(async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    const estado = normalizeRequiredString((req.body as { estado_usuario?: unknown }).estado_usuario);
    if (!id) {
      badRequest(res, "id de empresa inválido.");
      return;
    }
    if (estado !== "Activo" && estado !== "Inactivo") {
      badRequest(res, "estado_usuario debe ser Activo o Inactivo.");
      return;
    }

    const result = (await updateEmpresaEstado(id, estado)) as ResultSetHeader;
    if (result.affectedRows === 0) {
      res.status(404).json({ ok: false, error: "Empresa no encontrada." });
      return;
    }

    await registerAuditEvent({
      tabla: "empresa",
      accion: "UPDATE",
      idRegistro: id,
      descripcion: `${estado === "Activo" ? "Reactivación" : "Desactivación"} de cuenta de empresa`,
      usuario: `Administrador #${res.locals.auth?.id_usuario ?? "N/D"}`,
    });
    await notifyCuentaEstado({ idUsuario: id, estado });

    res.json({ ok: true });
  }),
};
