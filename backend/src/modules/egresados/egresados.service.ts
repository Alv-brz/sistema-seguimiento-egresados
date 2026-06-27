import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type EgresadosFilters = {
  search?: string;
  facultad?: string;
  sexo?: string;
};

export async function listEgresados(
  pagination: PaginationInput,
  filters: EgresadosFilters
): Promise<PaginatedResult<unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push(
      "(e.dni LIKE ? OR e.nombre_egresado LIKE ? OR e.apellidos_egresado LIKE ? OR c.nombre_carrera LIKE ?)"
    );
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  if (filters.facultad) {
    where.push("f.nombre_facultad = ?");
    params.push(filters.facultad);
  }

  if (filters.sexo) {
    where.push("e.sexo = ?");
    params.push(filters.sexo);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM egresado e
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     INNER JOIN facultad f ON f.id_facultad = c.id_facultad
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       e.id_usuario,
       e.dni,
       e.nombre_egresado,
       e.apellidos_egresado,
       e.telefono,
       e.direccion,
       e.fecha_egreso,
       e.sexo,
       c.nombre_carrera,
       c.grado_academico,
       f.nombre_facultad,
       u.nombre_usuario,
       u.correo,
       u.estado_usuario,
       u.fecha_creacion,
       u.ultimo_acceso
     FROM egresado e
     INNER JOIN usuario u ON u.id_usuario = e.id_usuario
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     INNER JOIN facultad f ON f.id_facultad = c.id_facultad
     ${whereSql}
     ORDER BY e.id_usuario
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
