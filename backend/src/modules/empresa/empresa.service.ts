import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type EmpresaOfertasFilters = {
  search?: string;
  estado?: string;
  modalidad?: string;
};

export type EmpresaPostulacionesFilters = {
  search?: string;
  estado?: string;
};

export type OfertaInput = {
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

export type PostulacionEstado = "Pendiente" | "Aceptado" | "Rechazado";

export type PerfilEmpresaInput = {
  nombre_comercial: string | null;
  sector: string;
  direccion: string;
  telefono: string | null;
  pagina_web: string | null;
  correo: string;
};

export async function getEmpresaDashboard(idEmpresa: number) {
  const [profileRows] = await pool.execute(
    `SELECT
       em.id_usuario,
       em.ruc,
       em.razon_social,
       em.nombre_comercial,
       em.sector,
       em.direccion,
       em.telefono,
       em.pagina_web,
       u.correo,
       u.estado_usuario
     FROM empresa em
     INNER JOIN usuario u ON u.id_usuario = em.id_usuario
     WHERE em.id_usuario = ?`,
    [idEmpresa]
  );

  const [countRows] = await pool.execute(
    `SELECT
       fn_total_ofertas_empresa(?) AS totalOfertas,
       SUM(CASE WHEN o.estado_oferta = 'Activa' THEN 1 ELSE 0 END) AS ofertasActivas,
       SUM(CASE WHEN o.estado_oferta = 'Cerrada' THEN 1 ELSE 0 END) AS ofertasCerradas,
       (
         SELECT COALESCE(SUM(vpo.total_postulaciones), 0)
         FROM vw_postulaciones_por_oferta vpo
         INNER JOIN oferta_laboral ov ON ov.id_oferta = vpo.id_oferta
         WHERE ov.id_empresa = ?
       ) AS totalPostulaciones,
       SUM(CASE WHEN p.estado_postulacion = 'Pendiente' THEN 1 ELSE 0 END) AS postulacionesPendientes,
       SUM(CASE WHEN p.estado_postulacion = 'Aceptado' THEN 1 ELSE 0 END) AS postulacionesAceptadas,
       SUM(CASE WHEN p.estado_postulacion = 'Rechazado' THEN 1 ELSE 0 END) AS postulacionesRechazadas,
       SUM(CASE WHEN p.estado_postulacion = 'En Proceso' THEN 1 ELSE 0 END) AS postulacionesEnProceso
     FROM oferta_laboral o
     LEFT JOIN postulacion p ON p.id_oferta = o.id_oferta
     WHERE o.id_empresa = ?`,
    [idEmpresa, idEmpresa, idEmpresa]
  );

  const [ofertasRows] = await pool.execute(
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
       em.razon_social AS empresa
     FROM oferta_laboral o
     INNER JOIN vw_empresa_ofertas veo ON veo.id_oferta = o.id_oferta
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     WHERE o.id_empresa = ? AND o.estado_oferta = 'Activa'
     ORDER BY o.fecha_publicacion DESC, o.id_oferta DESC
     LIMIT 4`,
    [idEmpresa]
  );

  const [postulacionRows] = await pool.execute(
    `SELECT
       p.id_postulacion,
       CONCAT(e.nombre_egresado, ' ', e.apellidos_egresado) AS egresado,
       c.nombre_carrera AS carrera,
       o.titulo AS oferta,
       em.razon_social AS empresa,
       p.fecha_postulacion,
       p.estado_postulacion,
       p.observaciones,
       p.cv_adjunto
     FROM postulacion p
     INNER JOIN vw_postulaciones_completas vpc ON vpc.id_postulacion = p.id_postulacion
     INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     INNER JOIN egresado e ON e.id_usuario = p.id_egresado
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     WHERE o.id_empresa = ?
     ORDER BY p.fecha_postulacion DESC, p.id_postulacion DESC
     LIMIT 4`,
    [idEmpresa]
  );
  const [postulacionesReporteRows] = await pool.query(
    "CALL sp_postulaciones_por_empresa(?, ?)",
    [idEmpresa, "Pendiente"]
  );
  const postulacionesReporte = Array.isArray(postulacionesReporteRows) && Array.isArray(postulacionesReporteRows[0])
    ? postulacionesReporteRows[0]
    : [];

  const counts = (countRows as Record<string, number | null>[])[0] ?? {};

  return {
    profile: (profileRows as unknown[])[0] ?? null,
    counts: {
      totalOfertas: Number(counts.totalOfertas ?? 0),
      ofertasActivas: Number(counts.ofertasActivas ?? 0),
      ofertasCerradas: Number(counts.ofertasCerradas ?? 0),
      totalPostulaciones: Number(counts.totalPostulaciones ?? 0),
      postulacionesPendientes: Number(counts.postulacionesPendientes ?? 0),
      postulacionesAceptadas: Number(counts.postulacionesAceptadas ?? 0),
      postulacionesRechazadas: Number(counts.postulacionesRechazadas ?? 0),
      postulacionesEnProceso: Number(counts.postulacionesEnProceso ?? 0),
    },
    ofertasActivas: ofertasRows,
    ultimasPostulaciones: postulacionRows,
    sqlReports: {
      postulacionesPorEmpresa: postulacionesReporte,
    },
  };
}

export async function listEmpresaOfertas(
  idEmpresa: number,
  pagination: PaginationInput,
  filters: EmpresaOfertasFilters
): Promise<PaginatedResult<unknown>> {
  const where = ["o.id_empresa = ?"];
  const params: unknown[] = [idEmpresa];

  if (filters.search) {
    where.push("(o.titulo LIKE ? OR o.puesto LIKE ? OR o.area LIKE ? OR o.ubicacion LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  if (filters.estado) {
    where.push("o.estado_oferta = ?");
    params.push(filters.estado);
  }

  if (filters.modalidad) {
    where.push("o.modalidad = ?");
    params.push(filters.modalidad);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM oferta_laboral o
     INNER JOIN vw_empresa_ofertas veo ON veo.id_oferta = o.id_oferta
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
       em.razon_social AS empresa
     FROM oferta_laboral o
     INNER JOIN vw_empresa_ofertas veo ON veo.id_oferta = o.id_oferta
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

export async function listEmpresaPostulaciones(
  idEmpresa: number,
  pagination: PaginationInput,
  filters: EmpresaPostulacionesFilters
): Promise<PaginatedResult<unknown>> {
  const where = ["o.id_empresa = ?"];
  const params: unknown[] = [idEmpresa];

  if (filters.search) {
    where.push("(e.nombre_egresado LIKE ? OR e.apellidos_egresado LIKE ? OR c.nombre_carrera LIKE ? OR o.titulo LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  if (filters.estado) {
    where.push("p.estado_postulacion = ?");
    params.push(filters.estado);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM postulacion p
     INNER JOIN vw_postulaciones_completas vpc ON vpc.id_postulacion = p.id_postulacion
     INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
     INNER JOIN egresado e ON e.id_usuario = p.id_egresado
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       p.id_postulacion,
       CONCAT(e.nombre_egresado, ' ', e.apellidos_egresado) AS egresado,
       c.nombre_carrera AS carrera,
       o.titulo AS oferta,
       em.razon_social AS empresa,
       p.fecha_postulacion,
       p.estado_postulacion,
       p.observaciones,
       p.cv_adjunto
     FROM postulacion p
     INNER JOIN vw_postulaciones_completas vpc ON vpc.id_postulacion = p.id_postulacion
     INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     INNER JOIN egresado e ON e.id_usuario = p.id_egresado
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     ${whereSql}
     ORDER BY p.fecha_postulacion DESC, p.id_postulacion DESC
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

export async function getEmpresaPerfil(idEmpresa: number) {
  const [rows] = await pool.execute(
    `SELECT
       em.id_usuario,
       em.ruc,
       em.razon_social,
       em.nombre_comercial,
       em.sector,
       em.direccion,
       em.telefono,
       em.pagina_web,
       u.correo,
       u.estado_usuario
     FROM empresa em
     INNER JOIN usuario u ON u.id_usuario = em.id_usuario
     WHERE em.id_usuario = ?`,
    [idEmpresa]
  );

  return (rows as unknown[])[0] ?? null;
}

export async function createEmpresaOferta(idEmpresa: number, input: OfertaInput) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("CALL sp_publicar_oferta(?, ?, ?, ?)", [
      input.titulo,
      idEmpresa,
      input.puesto,
      input.salario,
    ]);
    const [idRows] = await connection.query("SELECT LAST_INSERT_ID() AS id_oferta");
    const idOferta = Number((idRows as { id_oferta: number }[])[0]?.id_oferta ?? 0);
    const [result] = await connection.execute(
      `UPDATE oferta_laboral
       SET descripcion = ?,
           area = ?,
           ubicacion = ?,
           modalidad = ?,
           tipo_contrato = ?,
           requisitos = ?,
           fecha_cierre = ?,
           estado_oferta = ?
       WHERE id_oferta = ? AND id_empresa = ?`,
      [
        input.descripcion,
        input.area,
        input.ubicacion,
        input.modalidad,
        input.tipo_contrato,
        input.requisitos,
        input.fecha_cierre,
        input.estado_oferta,
        idOferta,
        idEmpresa,
      ]
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

export async function updateEmpresaOferta(idEmpresa: number, idOferta: number, input: OfertaInput) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [ownershipRows] = await connection.execute(
      "SELECT id_oferta FROM oferta_laboral WHERE id_oferta = ? AND id_empresa = ? LIMIT 1",
      [idOferta, idEmpresa]
    );
    if ((ownershipRows as unknown[]).length === 0) {
      await connection.rollback();
      return { affectedRows: 0 };
    }
    await connection.query("CALL sp_actualizar_oferta(?, ?, ?)", [
      idOferta,
      input.salario,
      input.estado_oferta,
    ]);
    const [result] = await connection.execute(
      `UPDATE oferta_laboral
       SET titulo = ?,
           descripcion = ?,
           puesto = ?,
           area = ?,
           ubicacion = ?,
           modalidad = ?,
           tipo_contrato = ?,
           requisitos = ?,
           fecha_cierre = ?
       WHERE id_oferta = ? AND id_empresa = ?`,
      [
        input.titulo,
        input.descripcion,
        input.puesto,
        input.area,
        input.ubicacion,
        input.modalidad,
        input.tipo_contrato,
        input.requisitos,
        input.fecha_cierre,
        idOferta,
        idEmpresa,
      ]
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

export async function closeEmpresaOferta(idEmpresa: number, idOferta: number) {
  const connection = await pool.getConnection();
  try {
    await connection.query("CALL sp_cerrar_oferta(?, ?)", [idOferta, idEmpresa]);
    const [rows] = await connection.query("SELECT ROW_COUNT() AS affectedRows");
    return { affectedRows: Number((rows as { affectedRows: number }[])[0]?.affectedRows ?? 0) };
  } finally {
    connection.release();
  }
}

export async function updateEmpresaOfertaEstado(
  idEmpresa: number,
  idOferta: number,
  estado: OfertaInput["estado_oferta"]
) {
  if (estado === "Cerrada") {
    return closeEmpresaOferta(idEmpresa, idOferta);
  }

  const [result] = await pool.execute(
    "UPDATE oferta_laboral SET estado_oferta = ? WHERE id_oferta = ? AND id_empresa = ?",
    [estado, idOferta, idEmpresa]
  );

  return result;
}

export async function getEmpresaOfertaNotificationTargets(idEmpresa: number, idOferta: number) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT
       p.id_egresado,
       o.titulo
     FROM oferta_laboral o
     INNER JOIN postulacion p ON p.id_oferta = o.id_oferta
     WHERE o.id_oferta = ? AND o.id_empresa = ?`,
    [idOferta, idEmpresa]
  );

  const items = rows as { id_egresado: number; titulo: string }[];
  return {
    titulo: items[0]?.titulo ?? "",
    idEgresados: items.map((item) => item.id_egresado),
  };
}

export async function deleteEmpresaOferta(idEmpresa: number, idOferta: number) {
  const [postulacionRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM postulacion p
     INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
     WHERE p.id_oferta = ? AND o.id_empresa = ?`,
    [idOferta, idEmpresa]
  );

  const totalPostulaciones = Number((postulacionRows as { total: number }[])[0]?.total ?? 0);
  if (totalPostulaciones > 0) {
    return { deleted: false, hasPostulaciones: true };
  }

  const [result] = await pool.execute(
    "DELETE FROM oferta_laboral WHERE id_oferta = ? AND id_empresa = ?",
    [idOferta, idEmpresa]
  );

  return { deleted: true, hasPostulaciones: false, result };
}

export async function updateEmpresaPostulacionEstado(
  idEmpresa: number,
  idPostulacion: number,
  estado: PostulacionEstado
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [ownershipRows] = await connection.execute(
      `SELECT p.id_postulacion
       FROM postulacion p
       INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
       WHERE p.id_postulacion = ? AND o.id_empresa = ?
       LIMIT 1`,
      [idPostulacion, idEmpresa]
    );
    if ((ownershipRows as unknown[]).length === 0) {
      await connection.rollback();
      return { affectedRows: 0 };
    }
    await connection.query("CALL sp_cambiar_estado_postulacion(?, ?)", [idPostulacion, estado]);
    const [rows] = await connection.query("SELECT ROW_COUNT() AS affectedRows");
    await connection.commit();
    return { affectedRows: Number((rows as { affectedRows: number }[])[0]?.affectedRows ?? 0) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getEmpresaPostulacionNotificationTarget(idEmpresa: number, idPostulacion: number) {
  const [rows] = await pool.execute(
    `SELECT
       p.id_egresado,
       o.titulo
     FROM postulacion p
     INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
     WHERE p.id_postulacion = ? AND o.id_empresa = ?
     LIMIT 1`,
    [idPostulacion, idEmpresa]
  );

  return (rows as { id_egresado: number; titulo: string }[])[0] ?? null;
}

export async function updateEmpresaPerfil(idEmpresa: number, input: PerfilEmpresaInput) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query("CALL sp_actualizar_empresa(?, ?, ?)", [
      idEmpresa,
      input.telefono,
      input.pagina_web,
    ]);

    const [empresaResult] = await connection.execute(
      `UPDATE empresa
       SET
         nombre_comercial = ?,
         sector = ?,
         direccion = ?
       WHERE id_usuario = ?`,
      [
        input.nombre_comercial,
        input.sector,
        input.direccion,
        idEmpresa,
      ]
    );

    const [usuarioResult] = await connection.execute(
      "UPDATE usuario SET correo = ? WHERE id_usuario = ?",
      [input.correo, idEmpresa]
    );

    await connection.commit();

    return { empresaResult, usuarioResult };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
