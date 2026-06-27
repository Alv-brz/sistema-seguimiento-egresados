import { pool } from "../../config/db.js";

const FACULTAD_COLORS = ["#2563EB", "#0EA5E9", "#6366F1", "#10B981", "#F59E0B", "#EF4444"];
const LABORAL_COLORS: Record<string, string> = {
  Empleado: "#10B981",
  Independiente: "#2563EB",
  Desempleado: "#EF4444",
  Estudiando: "#F59E0B",
  Emprendedor: "#6366F1",
};

type CountRow = { total: number };
type DashboardCounts = {
  totalEgresados: number;
  totalEmpresas: number;
  totalOfertas: number;
  ofertasActivas: number;
  totalPostulaciones: number;
  totalEncuestas: number;
};

export type AdminDashboardFilters = {
  facultad?: string;
  carrera?: string;
  anio?: number;
  estadoLaboral?: string;
};

type QueryParts = {
  whereSql: string;
  params: (string | number)[];
};

async function count(sql: string, params: (string | number)[] = []): Promise<number> {
  const [rows] = await pool.query(sql, params);
  return Number((rows as CountRow[])[0]?.total ?? 0);
}

function buildWhere(conditions: string[], params: (string | number)[]): QueryParts {
  return {
    whereSql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function egresadoWhere(filters: AdminDashboardFilters): QueryParts {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.facultad) {
    conditions.push("f.nombre_facultad = ?");
    params.push(filters.facultad);
  }
  if (filters.carrera) {
    conditions.push("c.nombre_carrera = ?");
    params.push(filters.carrera);
  }
  if (filters.anio) {
    conditions.push("YEAR(e.fecha_egreso) = ?");
    params.push(filters.anio);
  }
  if (filters.estadoLaboral) {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM seguimiento_egresado se_estado
         INNER JOIN encuesta_seguimiento es_estado ON es_estado.id_encuesta = se_estado.id_encuesta
         WHERE se_estado.id_egresado = e.id_usuario
           AND es_estado.estado_laboral = ?
       )`
    );
    params.push(filters.estadoLaboral);
  }

  return buildWhere(conditions, params);
}

function encuestaWhere(filters: AdminDashboardFilters): QueryParts {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.facultad) {
    conditions.push("f.nombre_facultad = ?");
    params.push(filters.facultad);
  }
  if (filters.carrera) {
    conditions.push("c.nombre_carrera = ?");
    params.push(filters.carrera);
  }
  if (filters.anio) {
    conditions.push("YEAR(es.fecha_registro) = ?");
    params.push(filters.anio);
  }
  if (filters.estadoLaboral) {
    conditions.push("es.estado_laboral = ?");
    params.push(filters.estadoLaboral);
  }

  return buildWhere(conditions, params);
}

function postulacionWhere(filters: AdminDashboardFilters): QueryParts {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.facultad) {
    conditions.push("f.nombre_facultad = ?");
    params.push(filters.facultad);
  }
  if (filters.carrera) {
    conditions.push("c.nombre_carrera = ?");
    params.push(filters.carrera);
  }
  if (filters.anio) {
    conditions.push("YEAR(p.fecha_postulacion) = ?");
    params.push(filters.anio);
  }
  if (filters.estadoLaboral) {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM seguimiento_egresado se_estado
         INNER JOIN encuesta_seguimiento es_estado ON es_estado.id_encuesta = se_estado.id_encuesta
         WHERE se_estado.id_egresado = e.id_usuario
           AND es_estado.estado_laboral = ?
       )`
    );
    params.push(filters.estadoLaboral);
  }

  return buildWhere(conditions, params);
}

function ofertaWhere(filters: AdminDashboardFilters): QueryParts & { needsGraduateJoin: boolean } {
  const needsGraduateJoin = Boolean(filters.facultad || filters.carrera || filters.estadoLaboral);
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.facultad) {
    conditions.push("f.nombre_facultad = ?");
    params.push(filters.facultad);
  }
  if (filters.carrera) {
    conditions.push("c.nombre_carrera = ?");
    params.push(filters.carrera);
  }
  if (filters.anio) {
    conditions.push("YEAR(o.fecha_publicacion) = ?");
    params.push(filters.anio);
  }
  if (filters.estadoLaboral) {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM seguimiento_egresado se_estado
         INNER JOIN encuesta_seguimiento es_estado ON es_estado.id_encuesta = se_estado.id_encuesta
         WHERE se_estado.id_egresado = e.id_usuario
           AND es_estado.estado_laboral = ?
       )`
    );
    params.push(filters.estadoLaboral);
  }

  return { ...buildWhere(conditions, params), needsGraduateJoin };
}

function ofertaFrom(needsGraduateJoin: boolean): string {
  if (!needsGraduateJoin) return "FROM oferta_laboral o";
  return `FROM oferta_laboral o
          INNER JOIN postulacion p ON p.id_oferta = o.id_oferta
          INNER JOIN egresado e ON e.id_usuario = p.id_egresado
          INNER JOIN carrera c ON c.id_carrera = e.id_carrera
          INNER JOIN facultad f ON f.id_facultad = c.id_facultad`;
}

export async function getAdminDashboard(filters: AdminDashboardFilters = {}) {
  const egresado = egresadoWhere(filters);
  const encuesta = encuestaWhere(filters);
  const postulacion = postulacionWhere(filters);
  const oferta = ofertaWhere(filters);
  const hasOfertaScope = oferta.needsGraduateJoin || Boolean(filters.anio);
  const ofertaCountExpression = oferta.needsGraduateJoin ? "COUNT(DISTINCT o.id_oferta)" : "COUNT(*)";

  const [
    totalEgresados,
    totalEmpresas,
    totalOfertas,
    ofertasActivas,
    totalPostulaciones,
    totalEncuestas,
  ] = await Promise.all([
    count(
      `SELECT COUNT(*) AS total
       FROM egresado e
       INNER JOIN carrera c ON c.id_carrera = e.id_carrera
       INNER JOIN facultad f ON f.id_facultad = c.id_facultad
       ${egresado.whereSql}`,
      egresado.params
    ),
    hasOfertaScope
      ? count(
          `SELECT COUNT(DISTINCT em.id_usuario) AS total
           ${ofertaFrom(oferta.needsGraduateJoin)}
           INNER JOIN empresa em ON em.id_usuario = o.id_empresa
           ${oferta.whereSql}`,
          oferta.params
        )
      : count("SELECT COUNT(*) AS total FROM empresa"),
    count(
      `SELECT ${ofertaCountExpression} AS total
       ${ofertaFrom(oferta.needsGraduateJoin)}
       ${oferta.whereSql}`,
      oferta.params
    ),
    count(
      `SELECT ${ofertaCountExpression} AS total
       ${ofertaFrom(oferta.needsGraduateJoin)}
       ${oferta.whereSql ? `${oferta.whereSql} AND` : "WHERE"} o.estado_oferta = 'Activa'`,
      oferta.params
    ),
    count(
      `SELECT COUNT(*) AS total
       FROM postulacion p
       INNER JOIN egresado e ON e.id_usuario = p.id_egresado
       INNER JOIN carrera c ON c.id_carrera = e.id_carrera
       INNER JOIN facultad f ON f.id_facultad = c.id_facultad
       ${postulacion.whereSql}`,
      postulacion.params
    ),
    count(
      `SELECT COUNT(*) AS total
       FROM encuesta_seguimiento es
       INNER JOIN seguimiento_egresado se ON se.id_encuesta = es.id_encuesta
       INNER JOIN egresado e ON e.id_usuario = se.id_egresado
       INNER JOIN carrera c ON c.id_carrera = e.id_carrera
       INNER JOIN facultad f ON f.id_facultad = c.id_facultad
       ${encuesta.whereSql}`,
      encuesta.params
    ),
  ]);

  const counts: DashboardCounts = {
    totalEgresados,
    totalEmpresas,
    totalOfertas,
    ofertasActivas,
    totalPostulaciones,
    totalEncuestas,
  };

  const [carreraRows] = await pool.query(
    `SELECT c.nombre_carrera AS name, COUNT(*) AS egresados
     FROM egresado e
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     INNER JOIN facultad f ON f.id_facultad = c.id_facultad
     ${egresado.whereSql}
     GROUP BY c.nombre_carrera
     ORDER BY egresados DESC
     LIMIT 6`,
    egresado.params
  );

  const [facultadRows] = await pool.query(
    `SELECT f.nombre_facultad AS name, COUNT(*) AS value
     FROM egresado e
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     INNER JOIN facultad f ON f.id_facultad = c.id_facultad
     ${egresado.whereSql}
     GROUP BY f.nombre_facultad
     ORDER BY value DESC
     LIMIT 6`,
    egresado.params
  );

  const [laboralRows] = await pool.query(
    `SELECT es.estado_laboral AS name, COUNT(*) AS total
     FROM encuesta_seguimiento es
     INNER JOIN seguimiento_egresado se ON se.id_encuesta = es.id_encuesta
     INNER JOIN egresado e ON e.id_usuario = se.id_egresado
     INNER JOIN carrera c ON c.id_carrera = e.id_carrera
     INNER JOIN facultad f ON f.id_facultad = c.id_facultad
     ${encuesta.whereSql}
     GROUP BY es.estado_laboral
     ORDER BY total DESC`,
    encuesta.params
  );

  const [ofertasHistRows] = await pool.query(
    `SELECT DATE_FORMAT(mes_fecha, '%b') AS mes, activas, cerradas
     FROM (
       SELECT
         DATE_FORMAT(o.fecha_publicacion, '%Y-%m-01') AS mes_key,
         MIN(o.fecha_publicacion) AS mes_fecha,
         COUNT(DISTINCT CASE WHEN o.estado_oferta = 'Activa' THEN o.id_oferta END) AS activas,
         COUNT(DISTINCT CASE WHEN o.estado_oferta = 'Cerrada' THEN o.id_oferta END) AS cerradas
       ${ofertaFrom(oferta.needsGraduateJoin)}
       ${oferta.whereSql}
       GROUP BY mes_key
       ORDER BY mes_key DESC
       LIMIT 5
     ) ultimos_meses
     ORDER BY mes_fecha`,
    oferta.params
  );

  const [postulacionesRows] = await pool.query(
    `SELECT DATE_FORMAT(mes_fecha, '%b') AS mes, postulaciones
     FROM (
       SELECT
         DATE_FORMAT(p.fecha_postulacion, '%Y-%m-01') AS mes_key,
         MIN(p.fecha_postulacion) AS mes_fecha,
         COUNT(*) AS postulaciones
       FROM postulacion p
       INNER JOIN egresado e ON e.id_usuario = p.id_egresado
       INNER JOIN carrera c ON c.id_carrera = e.id_carrera
       INNER JOIN facultad f ON f.id_facultad = c.id_facultad
       ${postulacion.whereSql}
       GROUP BY mes_key
       ORDER BY mes_key DESC
       LIMIT 5
     ) ultimos_meses
     ORDER BY mes_fecha`,
    postulacion.params
  );

  const totalLaboral = (laboralRows as { total: number }[]).reduce(
    (sum, row) => sum + Number(row.total),
    0
  );

  return {
    counts,
    charts: {
      egresadosPorCarrera: carreraRows,
      egresadosPorFacultad: (facultadRows as { name: string; value: number }[]).map((row, index) => ({
        ...row,
        color: FACULTAD_COLORS[index % FACULTAD_COLORS.length],
      })),
      estadoLaboral: (laboralRows as { name: string; total: number }[]).map((row) => ({
        name: row.name,
        value: totalLaboral > 0 ? Math.round((Number(row.total) / totalLaboral) * 100) : 0,
        color: LABORAL_COLORS[row.name] ?? "#64748B",
      })),
      ofertasHistorial: ofertasHistRows,
      postulacionesEvolucion: postulacionesRows,
    },
  };
}
