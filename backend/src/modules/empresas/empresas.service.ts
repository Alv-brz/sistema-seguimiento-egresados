import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type EmpresasFilters = {
  search?: string;
  sector?: string;
};

export type AdminEmpresaInput = {
  nombre_usuario: string;
  password?: string;
  correo: string;
  estado_usuario: string;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  sector: string;
  direccion: string;
  telefono: string | null;
  pagina_web: string | null;
};

export async function listEmpresas(
  pagination: PaginationInput,
  filters: EmpresasFilters
): Promise<PaginatedResult<unknown>> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("(em.razon_social LIKE ? OR em.ruc LIKE ? OR em.sector LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }

  if (filters.sector) {
    where.push("em.sector = ?");
    params.push(filters.sector);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM empresa em
     INNER JOIN usuario u ON u.id_usuario = em.id_usuario
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       em.id_usuario,
       em.ruc,
       em.razon_social,
       em.nombre_comercial,
       em.sector,
       em.direccion,
       em.telefono,
       em.pagina_web,
       u.nombre_usuario,
       u.correo,
       u.estado_usuario
     FROM empresa em
     INNER JOIN usuario u ON u.id_usuario = em.id_usuario
     ${whereSql}
     ORDER BY em.id_usuario
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

export async function createEmpresa(input: AdminEmpresaInput) {
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
      `INSERT INTO empresa(
         id_usuario,
         ruc,
         razon_social,
         nombre_comercial,
         sector,
         direccion,
         telefono,
         pagina_web
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idUsuario,
        input.ruc,
        input.razon_social,
        input.nombre_comercial,
        input.sector,
        input.direccion,
        input.telefono,
        input.pagina_web,
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

export async function updateEmpresa(idUsuario: number, input: AdminEmpresaInput) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `UPDATE empresa
       SET
         ruc = ?,
         razon_social = ?,
         nombre_comercial = ?,
         sector = ?,
         direccion = ?,
         telefono = ?,
         pagina_web = ?
       WHERE id_usuario = ?`,
      [
        input.ruc,
        input.razon_social,
        input.nombre_comercial,
        input.sector,
        input.direccion,
        input.telefono,
        input.pagina_web,
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

export async function deleteEmpresa(idUsuario: number) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute("DELETE FROM empresa WHERE id_usuario = ?", [idUsuario]);
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
