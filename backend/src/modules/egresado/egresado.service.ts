import { pool } from "../../config/db.js";
import type { PaginatedResult, PaginationInput } from "../../utils/pagination.js";

export type BolsaFilters = {
  search?: string;
  modalidad?: string;
  contrato?: string;
};

export type EgresadoPostulacionesFilters = {
  estado?: string;
};

export type EgresadoPerfilInput = {
  dni: string;
  nombre_egresado: string;
  apellidos_egresado: string;
  telefono: string | null;
  direccion: string | null;
  fecha_egreso: string;
  sexo: "M" | "F";
  id_carrera: number | null;
  nombre_carrera: string | null;
  correo: string;
};

export type HistorialLaboralInput = {
  nombre_empresa: string;
  cargo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  salario: number | null;
  modalidad: string;
  actual: boolean;
};

export type EncuestaInput = {
  estado_laboral: string;
  nombre_empresa_actual: string | null;
  cargo_actual: string | null;
  area_trabajo: string | null;
  sueldo_mensual: number | null;
  tipo_contrato: string | null;
  satisfaccion_profesional: string | null;
  tiempo_conseguir_empleo: string | null;
  observaciones: string | null;
};

export async function getEgresadoPerfil(idEgresado: number) {
  const [rows] = await pool.execute(
    `SELECT
       e.id_usuario,
       e.dni,
       e.nombre_egresado,
       e.apellidos_egresado,
       e.telefono,
       e.direccion,
       e.fecha_egreso,
       e.sexo,
       e.id_carrera,
       c.id_facultad,
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
     WHERE e.id_usuario = ?`,
    [idEgresado]
  );

  return (rows as unknown[])[0] ?? null;
}

export async function getEgresadoDashboard(idEgresado: number) {
  const [metricsRows] = await pool.execute(
    `SELECT
       fn_total_postulaciones(?) AS totalPostulaciones,
       fn_estado_laboral_actual(?) AS estadoLaboralActual,
       fn_ultima_empresa(?) AS ultimaEmpresa,
       (SELECT COUNT(*) FROM oferta_laboral WHERE estado_oferta = 'Activa') AS ofertasActivas`,
    [idEgresado, idEgresado, idEgresado]
  );

  const [ofertasRows] = await pool.query(
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
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
     WHERE o.estado_oferta = 'Activa'
     ORDER BY o.fecha_publicacion DESC, o.id_oferta DESC
     LIMIT 3`
  );

  const [historialRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM historial_laboral WHERE id_egresado = ?",
    [idEgresado]
  );
  const [encuestaRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM seguimiento_egresado WHERE id_egresado = ?",
    [idEgresado]
  );

  const metrics = (metricsRows as Record<string, unknown>[])[0] ?? {};
  return {
    profile: await getEgresadoPerfil(idEgresado),
    metrics: {
      totalPostulaciones: Number(metrics.totalPostulaciones ?? 0),
      estadoLaboralActual: String(metrics.estadoLaboralActual ?? "Sin encuesta"),
      ultimaEmpresa: String(metrics.ultimaEmpresa ?? "Sin historial"),
      ofertasActivas: Number(metrics.ofertasActivas ?? 0),
      historialRegistrado: Number((historialRows as { total: number }[])[0]?.total ?? 0) > 0,
      encuestaCompletada: Number((encuestaRows as { total: number }[])[0]?.total ?? 0) > 0,
    },
    ofertasRecomendadas: ofertasRows,
  };
}

export async function listCarreras() {
  const [rows] = await pool.query(
    `SELECT
       c.id_carrera,
       c.nombre_carrera,
       c.grado_academico,
       c.id_facultad,
       f.nombre_facultad
     FROM carrera c
     INNER JOIN facultad f ON f.id_facultad = c.id_facultad
     WHERE c.estado_carrera = 'Activa'
     ORDER BY f.nombre_facultad ASC, c.nombre_carrera ASC`
  );

  return rows;
}

export async function listBolsaLaboral(
  pagination: PaginationInput,
  filters: BolsaFilters
): Promise<PaginatedResult<unknown>> {
  const where = ["o.estado_oferta = 'Activa'"];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("(o.titulo LIKE ? OR o.puesto LIKE ? OR o.area LIKE ? OR em.razon_social LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }

  if (filters.modalidad) {
    where.push("o.modalidad = ?");
    params.push(filters.modalidad);
  }

  if (filters.contrato) {
    where.push("o.tipo_contrato = ?");
    params.push(filters.contrato);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
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

export async function createPostulacion(idEgresado: number, idOferta: number) {
  const [ofertaRows] = await pool.execute(
    `SELECT id_oferta, estado_oferta, fecha_cierre
     FROM oferta_laboral
     WHERE id_oferta = ?`,
    [idOferta]
  );
  const oferta = (ofertaRows as { estado_oferta: string; fecha_cierre: string }[])[0];

  if (!oferta) {
    return { ok: false as const, status: 404, error: "Oferta no encontrada." };
  }
  if (oferta.estado_oferta !== "Activa") {
    return { ok: false as const, status: 422, error: "No se puede postular a una oferta cerrada." };
  }

  const cierre = new Date(`${String(oferta.fecha_cierre).slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(cierre.getTime()) || cierre < today) {
    return { ok: false as const, status: 422, error: "No se puede postular a una oferta con fecha de cierre vencida." };
  }

  const [existingRows] = await pool.execute(
    "SELECT id_postulacion FROM postulacion WHERE id_egresado = ? AND id_oferta = ? LIMIT 1",
    [idEgresado, idOferta]
  );
  if ((existingRows as unknown[]).length > 0) {
    return { ok: false as const, status: 409, error: "Ya postulaste a esta oferta." };
  }

  const [result] = await pool.execute(
    `INSERT INTO postulacion(
       id_egresado,
       id_oferta,
       fecha_postulacion,
       estado_postulacion,
       observaciones,
       cv_adjunto
     )
     VALUES (?, ?, NOW(), 'Pendiente', ?, ?)`,
    [idEgresado, idOferta, "Postulación registrada desde Bolsa Laboral", null]
  );

  return { ok: true as const, result };
}

export async function listEgresadoPostulaciones(
  idEgresado: number,
  pagination: PaginationInput,
  filters: EgresadoPostulacionesFilters
): Promise<PaginatedResult<unknown>> {
  const where = ["p.id_egresado = ?"];
  const params: unknown[] = [idEgresado];

  if (filters.estado) {
    where.push("p.estado_postulacion = ?");
    params.push(filters.estado);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM postulacion p
     ${whereSql}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT
       p.id_postulacion,
       o.titulo AS oferta,
       em.razon_social AS empresa,
       p.fecha_postulacion,
       p.estado_postulacion,
       p.observaciones,
       p.cv_adjunto
     FROM postulacion p
     INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
     INNER JOIN empresa em ON em.id_usuario = o.id_empresa
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

export async function listHistorialLaboral(
  idEgresado: number,
  pagination: PaginationInput
): Promise<PaginatedResult<unknown>> {
  const [countRows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM historial_laboral WHERE id_egresado = ?",
    [idEgresado]
  );

  const [rows] = await pool.query(
    `SELECT
       id_historial,
       nombre_empresa,
       cargo,
       fecha_inicio,
       fecha_fin,
       salario,
       modalidad,
       actual
     FROM historial_laboral
     WHERE id_egresado = ?
     ORDER BY fecha_inicio DESC, id_historial DESC
     LIMIT ? OFFSET ?`,
    [idEgresado, pagination.pageSize, pagination.offset]
  );

  return {
    items: rows,
    total: Number((countRows as { total: number }[])[0]?.total ?? 0),
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
}

async function resolveCarreraId(idCarrera: number | null, nombreCarrera: string | null) {
  if (idCarrera) return idCarrera;
  if (!nombreCarrera) return null;

  const [rows] = await pool.execute(
    "SELECT id_carrera FROM carrera WHERE nombre_carrera = ? LIMIT 1",
    [nombreCarrera]
  );

  return Number((rows as { id_carrera: number }[])[0]?.id_carrera ?? 0) || null;
}

export async function updateEgresadoPerfil(idEgresado: number, input: EgresadoPerfilInput) {
  const idCarrera = await resolveCarreraId(input.id_carrera, input.nombre_carrera);
  if (!idCarrera) {
    return { ok: false as const, status: 400, error: "Carrera inválida." };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
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
        idCarrera,
        idEgresado,
      ]
    );

    await connection.execute(
      "UPDATE usuario SET correo = ? WHERE id_usuario = ?",
      [input.correo, idEgresado]
    );

    await connection.commit();
    return { ok: true as const };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createHistorialLaboral(idEgresado: number, input: HistorialLaboralInput) {
  const [result] = await pool.execute(
    `INSERT INTO historial_laboral(
       nombre_empresa,
       cargo,
       fecha_inicio,
       fecha_fin,
       salario,
       modalidad,
       actual,
       id_egresado
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.nombre_empresa,
      input.cargo,
      input.fecha_inicio,
      input.actual ? null : input.fecha_fin,
      input.salario,
      input.modalidad,
      input.actual,
      idEgresado,
    ]
  );

  return result;
}

export async function updateHistorialLaboral(
  idEgresado: number,
  idHistorial: number,
  input: HistorialLaboralInput
) {
  const [result] = await pool.execute(
    `UPDATE historial_laboral
     SET
       nombre_empresa = ?,
       cargo = ?,
       fecha_inicio = ?,
       fecha_fin = ?,
       salario = ?,
       modalidad = ?,
       actual = ?
     WHERE id_historial = ? AND id_egresado = ?`,
    [
      input.nombre_empresa,
      input.cargo,
      input.fecha_inicio,
      input.actual ? null : input.fecha_fin,
      input.salario,
      input.modalidad,
      input.actual,
      idHistorial,
      idEgresado,
    ]
  );

  return result;
}

export async function deleteHistorialLaboral(idEgresado: number, idHistorial: number) {
  const [result] = await pool.execute(
    "DELETE FROM historial_laboral WHERE id_historial = ? AND id_egresado = ?",
    [idHistorial, idEgresado]
  );

  return result;
}

export async function getUltimaEncuesta(idEgresado: number) {
  const [rows] = await pool.execute(
    `SELECT
       es.id_encuesta,
       es.fecha_registro,
       es.estado_laboral,
       es.nombre_empresa_actual,
       es.cargo_actual,
       es.area_trabajo,
       es.sueldo_mensual,
       es.tipo_contrato,
       es.satisfaccion_profesional,
       es.tiempo_conseguir_empleo,
       es.observaciones,
       se.fecha_asociacion,
       cfg.tiempo_entre_encuestas_meses,
       DATE_ADD(es.fecha_registro, INTERVAL cfg.tiempo_entre_encuestas_meses MONTH) AS proxima_disponible,
       CASE
         WHEN cfg.tiempo_entre_encuestas_meses = 0 THEN 1
         WHEN CURDATE() >= DATE_ADD(es.fecha_registro, INTERVAL cfg.tiempo_entre_encuestas_meses MONTH) THEN 1
         ELSE 0
       END AS can_submit
     FROM seguimiento_egresado se
     INNER JOIN encuesta_seguimiento es ON es.id_encuesta = se.id_encuesta
     INNER JOIN configuracion_sistema cfg ON cfg.id_configuracion = 1
     WHERE se.id_egresado = ?
     ORDER BY es.fecha_registro DESC, es.id_encuesta DESC
     LIMIT 1`,
    [idEgresado]
  );

  return (rows as unknown[])[0] ?? null;
}

export async function createEncuesta(idEgresado: number, input: EncuestaInput) {
  const ultima = await getUltimaEncuesta(idEgresado) as { can_submit?: boolean | number } | null;
  if (ultima && ultima.can_submit !== true && ultima.can_submit !== 1) {
    return { ok: false as const, status: 409, error: "La encuesta aún no está disponible para este egresado." };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [encuestaResult] = await connection.execute(
      `INSERT INTO encuesta_seguimiento(
         fecha_registro,
         estado_laboral,
         nombre_empresa_actual,
         cargo_actual,
         area_trabajo,
         sueldo_mensual,
         tipo_contrato,
         satisfaccion_profesional,
         tiempo_conseguir_empleo,
         observaciones
       )
       VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.estado_laboral,
        input.nombre_empresa_actual,
        input.cargo_actual,
        input.area_trabajo,
        input.sueldo_mensual,
        input.tipo_contrato,
        input.satisfaccion_profesional,
        input.tiempo_conseguir_empleo,
        input.observaciones,
      ]
    );

    const idEncuesta = (encuestaResult as { insertId: number }).insertId;
    await connection.execute(
      `INSERT INTO seguimiento_egresado(
         id_encuesta,
         id_egresado,
         fecha_asociacion
       )
       VALUES (?, ?, NOW())`,
      [idEncuesta, idEgresado]
    );

    await connection.commit();
    return { ok: true as const, idEncuesta };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
