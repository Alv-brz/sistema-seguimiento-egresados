import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type EgresadosFilters = {
  search?: string;
  carrera?: string;
  estado?: string;
};

export type AdminEgresadoInput = {
  nombre_usuario: string;
  password?: string;
  correo: string;
  estado_usuario: string;
  dni: string;
  nombre_egresado: string;
  apellidos_egresado: string;
  telefono: string | null;
  direccion: string | null;
  fecha_egreso: string;
  sexo: "M" | "F";
  id_carrera: number;
};

export async function listEgresados(
  pagination: PaginationInput,
  filters: EgresadosFilters
): Promise<PaginatedResult<unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push(
      "(e.dni LIKE ? OR e.nombre_egresado LIKE ? OR e.apellidos_egresado LIKE ? OR c.nombre_carrera LIKE ? OR u.correo LIKE ?)"
    );
    const q = `%${filters.search}%`;
    params.push(q, q, q, q, q);
  }

  if (filters.carrera) {
    where.push("c.nombre_carrera = ?");
    params.push(filters.carrera);
  }

  if (filters.estado) {
    where.push("u.estado_usuario = ?");
    params.push(filters.estado);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM egresado e
     INNER JOIN usuario u ON u.id_usuario = e.id_usuario
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
       c.id_carrera,
       f.id_facultad,
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

export async function createEgresado(input: AdminEgresadoInput) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [usuarioResult] = await connection.execute(
      `INSERT INTO usuario(
         nombre_usuario,
         password,
         correo,
         estado_usuario,
         fecha_creacion,
         ultimo_acceso
       )
       VALUES (?, ?, ?, ?, NOW(), NULL)`,
      [input.nombre_usuario, input.password ?? "", input.correo, input.estado_usuario]
    );

    const idUsuario = (usuarioResult as { insertId: number }).insertId;
    await connection.execute(
      `INSERT INTO egresado(
         id_usuario,
         dni,
         nombre_egresado,
         apellidos_egresado,
         telefono,
         direccion,
         fecha_egreso,
         sexo,
         id_carrera
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idUsuario,
        input.dni,
        input.nombre_egresado,
        input.apellidos_egresado,
        input.telefono,
        input.direccion,
        input.fecha_egreso,
        input.sexo,
        input.id_carrera,
      ]
    );

    await connection.commit();
    return { ok: true as const, id_usuario: idUsuario };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEgresado(idUsuario: number, input: AdminEgresadoInput) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `UPDATE egresado
       SET
         dni = ?,
         nombre_egresado = ?,
         apellidos_egresado = ?,
         telefono = ?,
         direccion = ?,
         fecha_egreso = ?,
         sexo = ?,
         id_carrera = ?
       WHERE id_usuario = ?`,
      [
        input.dni,
        input.nombre_egresado,
        input.apellidos_egresado,
        input.telefono,
        input.direccion,
        input.fecha_egreso,
        input.sexo,
        input.id_carrera,
        idUsuario,
      ]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      await connection.rollback();
      return result;
    }

    const passwordSql = input.password ? ", password = ?" : "";
    const usuarioParams: (string | number)[] = [
      input.nombre_usuario,
      input.correo,
      input.estado_usuario,
    ];
    if (input.password) usuarioParams.push(input.password);
    usuarioParams.push(idUsuario);

    await connection.execute(
      `UPDATE usuario
       SET nombre_usuario = ?,
           correo = ?,
           estado_usuario = ?
           ${passwordSql}
       WHERE id_usuario = ?`,
      usuarioParams
    );

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteEgresado(idUsuario: number) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute("DELETE FROM egresado WHERE id_usuario = ?", [idUsuario]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      await connection.rollback();
      return result;
    }
    await connection.execute("DELETE FROM usuario WHERE id_usuario = ?", [idUsuario]);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateEgresadoEstado(idUsuario: number, estadoUsuario: "Activo" | "Inactivo") {
  const [result] = await pool.execute(
    "UPDATE usuario SET estado_usuario = ? WHERE id_usuario = ? AND EXISTS (SELECT 1 FROM egresado e WHERE e.id_usuario = usuario.id_usuario)",
    [estadoUsuario, idUsuario]
  );

  return result;
}
