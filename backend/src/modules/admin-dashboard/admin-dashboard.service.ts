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

async function count(sql: string): Promise<number> {
  const [rows] = await pool.query(sql);
  return Number((rows as CountRow[])[0]?.total ?? 0);
}

export async function getAdminDashboard() {
  const [
    totalEgresados,
    totalEmpresas,
    totalOfertas,
    ofertasActivas,
    totalPostulaciones,
    totalEncuestas,
  ] = await Promise.all([
    count("SELECT COUNT(*) AS total FROM egresado"),
    count("SELECT COUNT(*) AS total FROM empresa"),
    count("SELECT COUNT(*) AS total FROM oferta_laboral"),
    count("SELECT COUNT(*) AS total FROM oferta_laboral WHERE estado_oferta = 'Activa'"),
    count("SELECT COUNT(*) AS total FROM postulacion"),
    count("SELECT COUNT(*) AS total FROM encuesta_seguimiento"),
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
    `SELECT nombre_carrera AS name, COUNT(*) AS egresados
     FROM vw_egresados_carrera_facultad
     GROUP BY nombre_carrera
     ORDER BY egresados DESC
     LIMIT 6`
  );

  const [facultadRows] = await pool.query(
    `SELECT nombre_facultad AS name, COUNT(*) AS value
     FROM vw_egresados_carrera_facultad
     GROUP BY nombre_facultad
     ORDER BY value DESC
     LIMIT 6`
  );

  const [laboralRows] = await pool.query(
    `SELECT estado_laboral AS name, COUNT(*) AS total
     FROM encuesta_seguimiento
     GROUP BY estado_laboral
     ORDER BY total DESC`
  );

  const [ofertasHistRows] = await pool.query(
    `SELECT DATE_FORMAT(mes_fecha, '%b') AS mes, activas, cerradas
     FROM (
       SELECT
         DATE_FORMAT(fecha_publicacion, '%Y-%m-01') AS mes_key,
         MIN(fecha_publicacion) AS mes_fecha,
         SUM(CASE WHEN estado_oferta = 'Activa' THEN 1 ELSE 0 END) AS activas,
         SUM(CASE WHEN estado_oferta = 'Cerrada' THEN 1 ELSE 0 END) AS cerradas
       FROM oferta_laboral
       GROUP BY mes_key
       ORDER BY mes_key DESC
       LIMIT 5
     ) ultimos_meses
     ORDER BY mes_fecha`
  );

  const [postulacionesRows] = await pool.query(
    `SELECT DATE_FORMAT(mes_fecha, '%b') AS mes, postulaciones
     FROM (
       SELECT
         DATE_FORMAT(fecha_postulacion, '%Y-%m-01') AS mes_key,
         MIN(fecha_postulacion) AS mes_fecha,
         COUNT(*) AS postulaciones
       FROM postulacion
       GROUP BY mes_key
       ORDER BY mes_key DESC
       LIMIT 5
     ) ultimos_meses
     ORDER BY mes_fecha`
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
