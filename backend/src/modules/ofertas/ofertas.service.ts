import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type OfertasFilters = {
  estado?: string;
  modalidad?: string;
};

export type AdminOfertaInput = {
  titulo: string;
  descripcion: string;
  puesto: string;
  area: string;
  ubicacion: string;
  modalidad: string;
  tipo_contrato: string;
  salario: number | null;
  requisitos: string | null;
  fecha_cierre: string;
  estado_oferta: "Activa" | "Cerrada";
};

export async function listOfertas(
  pagination: PaginationInput,
  filters: OfertasFilters
): Promise<PaginatedResult<unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.estado) {
    where.push("o.estado_oferta = ?");
    params.push(filters.estado);
  }

  if (filters.modalidad) {
    where.push("o.modalidad = ?");
    params.push(filters.modalidad);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM oferta_laboral o
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       o.id_oferta,
       o.titulo,
       o.descripcion,
       o.puesto,
       o.area,
       o.ubicacion,
       o.modalidad,
       o.tipo_contrato,
       o.salario,
       o.requisitos,
       o.fecha_publicacion,
       o.fecha_cierre,
       o.estado_oferta,
       o.id_empresa,
       em.razon_social AS empresa
     FROM oferta_laboral o
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     ${whereSql}
     ORDER BY o.fecha_publicacion DESC, o.id_oferta DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.pageSize, pagination.offset]
  );

  return {
    items: rows,
    total: Number((countRows as { total: number }[])[0]?.total ?? 0),
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

export async function updateOferta(idOferta: number, input: AdminOfertaInput) {
  const [result] = await pool.execute(
    `UPDATE oferta_laboral
     SET
       titulo = ?,
       descripcion = ?,
       puesto = ?,
       area = ?,
       ubicacion = ?,
       modalidad = ?,
       tipo_contrato = ?,
       salario = ?,
       requisitos = ?,
       fecha_cierre = ?,
       estado_oferta = ?
     WHERE id_oferta = ?`,
    [
      input.titulo,
      input.descripcion,
      input.puesto,
      input.area,
      input.ubicacion,
      input.modalidad,
      input.tipo_contrato,
      input.salario,
      input.requisitos,
      input.fecha_cierre,
      input.estado_oferta,
      idOferta,
    ]
  );

  return result;
}

export async function updateOfertaEstado(idOferta: number, estado: "Activa" | "Cerrada") {
  const [result] = await pool.execute(
    "UPDATE oferta_laboral SET estado_oferta = ? WHERE id_oferta = ?",
    [estado, idOferta]
  );

  return result;
}

export async function deleteOferta(idOferta: number) {
  const [postulacionesRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM postulacion WHERE id_oferta = ?",
    [idOferta]
  );
  const totalPostulaciones = Number((postulacionesRows as { total: number }[])[0]?.total ?? 0);
  if (totalPostulaciones > 0) {
    return { blockedByPostulaciones: true as const };
  }

  const [result] = await pool.execute(
    "DELETE FROM oferta_laboral WHERE id_oferta = ?",
    [idOferta]
  );

  return { blockedByPostulaciones: false as const, result };
}
