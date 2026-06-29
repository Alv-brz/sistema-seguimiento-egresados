import { pool } from "../../config/db.js";
import { getAdminDashboard, type AdminDashboardFilters } from "../admin-dashboard/admin-dashboard.service.js";
import { listEncuestasForExport, type EncuestasFilters } from "../encuestas/encuestas.service.js";
import { createPdfReport, createXlsxReport, type DashboardDefinition, type ReportDefinition } from "../../utils/report-export.js";

export type ReportKind = "administrativo" | "encuestas" | "estadisticas";
export type ExportFormat = "pdf" | "excel";

type ExportInput = {
  kind: ReportKind;
  format: ExportFormat;
  userId: number;
  dashboardFilters?: AdminDashboardFilters;
  encuestasFilters?: EncuestasFilters;
};

async function getUserName(userId: number): Promise<string> {
  const [rows] = await pool.query(
    `SELECT nombre_usuario, correo
     FROM usuario
     WHERE id_usuario = ?
     LIMIT 1`,
    [userId]
  );
  const user = (rows as { nombre_usuario: string; correo: string }[])[0];
  if (!user) return `Usuario ${userId}`;
  return `${user.nombre_usuario} (${user.correo})`;
}

async function queryRows<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

function generatedAt(): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "America/Lima",
  }).format(new Date());
}

function cleanFilters(filters: Record<string, string | number | undefined>) {
  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, value === undefined || value === "" ? "Todos" : value])
  ) as Record<string, string | number>;
}

function safeFileBaseName(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function kpiRows(counts: Record<string, number>) {
  return [
    { Indicador: "Total egresados", Valor: counts.totalEgresados },
    { Indicador: "Total empresas", Valor: counts.totalEmpresas },
    { Indicador: "Total ofertas", Valor: counts.totalOfertas },
    { Indicador: "Ofertas activas", Valor: counts.ofertasActivas },
    { Indicador: "Total postulaciones", Valor: counts.totalPostulaciones },
    { Indicador: "Encuestas respondidas", Valor: counts.totalEncuestas },
  ];
}

function percent(value: number, total: number) {
  return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("es-PE", { maximumFractionDigits: 2 }) : "0";
}

function encuestaWhere(filters: EncuestasFilters) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.search) {
    where.push("(ve.egresado LIKE ? OR es.nombre_empresa_actual LIKE ? OR es.cargo_actual LIKE ? OR es.area_trabajo LIKE ?)");
    const q = `%${filters.search}%`;
    params.push(q, q, q, q);
  }
  if (filters.estadoLaboral) {
    where.push("es.estado_laboral = ?");
    params.push(filters.estadoLaboral);
  }
  return {
    whereSql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

const ENCUESTA_AGG_FROM = `FROM encuesta_seguimiento es
  INNER JOIN seguimiento_egresado se ON se.id_encuesta = es.id_encuesta
  INNER JOIN vw_encuestas_egresados ve ON ve.id_seguimiento = se.id_seguimiento
  INNER JOIN egresado e ON e.id_usuario = se.id_egresado`;

async function buildEncuestasDashboard(filters: EncuestasFilters): Promise<DashboardDefinition> {
  const where = encuestaWhere(filters);
  const [summary] = await queryRows<{
    total: number;
    empleados: number;
    desempleados: number;
    independientes: number;
    emprendedores: number;
    sueldo_promedio: number | null;
  }>(
    `SELECT
       COUNT(*) AS total,
       SUM(es.estado_laboral = 'Empleado') AS empleados,
       SUM(es.estado_laboral = 'Desempleado') AS desempleados,
       SUM(es.estado_laboral = 'Independiente') AS independientes,
       SUM(es.estado_laboral = 'Emprendedor') AS emprendedores,
       AVG(es.sueldo_mensual) AS sueldo_promedio
     ${ENCUESTA_AGG_FROM}
     ${where.whereSql}`,
    where.params
  );
  const total = Number(summary?.total ?? 0);
  const [
    estadoLaboral,
    tipoContrato,
    areaTrabajo,
    satisfaccion,
    tiempoEmpleo,
    sueldoEstado,
  ] = await Promise.all([
    queryRows<{ label: string; value: number }>(`SELECT COALESCE(es.estado_laboral, 'No registrado') AS label, COUNT(*) AS value ${ENCUESTA_AGG_FROM} ${where.whereSql} GROUP BY label ORDER BY value DESC`, where.params),
    queryRows<{ label: string; value: number }>(`SELECT COALESCE(es.tipo_contrato, 'No registrado') AS label, COUNT(*) AS value ${ENCUESTA_AGG_FROM} ${where.whereSql} GROUP BY label ORDER BY value DESC`, where.params),
    queryRows<{ label: string; value: number }>(`SELECT COALESCE(es.area_trabajo, 'No registrado') AS label, COUNT(*) AS value ${ENCUESTA_AGG_FROM} ${where.whereSql} GROUP BY label ORDER BY value DESC LIMIT 10`, where.params),
    queryRows<{ label: string; value: number }>(`SELECT COALESCE(es.satisfaccion_profesional, 'No registrado') AS label, COUNT(*) AS value ${ENCUESTA_AGG_FROM} ${where.whereSql} GROUP BY label ORDER BY value DESC`, where.params),
    queryRows<{ label: string; value: number }>(`SELECT COALESCE(es.tiempo_conseguir_empleo, 'No registrado') AS label, COUNT(*) AS value ${ENCUESTA_AGG_FROM} ${where.whereSql} GROUP BY label ORDER BY value DESC`, where.params),
    queryRows<{ label: string; value: number }>(`SELECT COALESCE(es.estado_laboral, 'No registrado') AS label, ROUND(AVG(es.sueldo_mensual), 2) AS value ${ENCUESTA_AGG_FROM} ${where.whereSql} GROUP BY label ORDER BY value DESC`, where.params),
  ]);

  return {
    title: "Gestión de Encuestas",
    subtitle: "Dashboard ejecutivo de seguimiento laboral",
    kpis: [
      { label: "Total encuestas", value: total },
      { label: "Empleados", value: Number(summary?.empleados ?? 0), detail: percent(Number(summary?.empleados ?? 0), total) },
      { label: "Desempleados", value: Number(summary?.desempleados ?? 0), detail: percent(Number(summary?.desempleados ?? 0), total) },
      { label: "Independientes", value: Number(summary?.independientes ?? 0), detail: percent(Number(summary?.independientes ?? 0), total) },
      { label: "Emprendedores", value: Number(summary?.emprendedores ?? 0), detail: percent(Number(summary?.emprendedores ?? 0), total) },
      { label: "Sueldo promedio", value: `S/. ${Number(summary?.sueldo_promedio ?? 0).toLocaleString("es-PE", { maximumFractionDigits: 2 })}` },
    ],
    charts: [
      { title: "Estado laboral", type: "pie", rows: estadoLaboral },
      { title: "Tipo de contrato", type: "bar", rows: tipoContrato },
      { title: "Área de trabajo Top 10", type: "column", rows: areaTrabajo },
      { title: "Satisfacción profesional", type: "pie", rows: satisfaccion },
      { title: "Tiempo para conseguir empleo", type: "bar", rows: tiempoEmpleo },
      { title: "Sueldo promedio por estado laboral", type: "column", rows: sueldoEstado },
    ],
  };
}

function reportDataRows(data: Awaited<ReturnType<typeof getAdminDashboard>>) {
  const egresadosPorCarrera = data.charts.egresadosPorCarrera as { name: string; egresados: number }[];
  const egresadosPorFacultad = data.charts.egresadosPorFacultad as { name: string; value: number }[];
  const estadoLaboral = data.charts.estadoLaboral as { name: string; value: number }[];
  const ofertasHistorial = data.charts.ofertasHistorial as { mes: string; activas: number; cerradas: number }[];
  const postulacionesEvolucion = data.charts.postulacionesEvolucion as { mes: string; postulaciones: number }[];

  return [
    ...kpiRows(data.counts).map((row) => ({ Seccion: "KPI", ...row })),
    ...egresadosPorCarrera.map((row) => ({
      Seccion: "Egresados por carrera",
      Nombre: row.name,
      Valor: Number(row.egresados),
    })),
    ...egresadosPorFacultad.map((row) => ({
      Seccion: "Egresados por facultad",
      Nombre: row.name,
      Valor: Number(row.value),
    })),
    ...estadoLaboral.map((row) => ({
      Seccion: "Estado laboral",
      Nombre: row.name,
      Valor: Number(row.value),
      Unidad: "%",
    })),
    ...ofertasHistorial.map((row) => ({
      Seccion: "Ofertas activas vs cerradas",
      Mes: row.mes,
      Activas: Number(row.activas),
      Cerradas: Number(row.cerradas),
    })),
    ...postulacionesEvolucion.map((row) => ({
      Seccion: "Evolucion postulaciones",
      Mes: row.mes,
      Postulaciones: Number(row.postulaciones),
    })),
  ];
}

function dashboardFilterWhere(filters: AdminDashboardFilters, dateColumn: string) {
  const joins: string[] = [];
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.facultad || filters.carrera || filters.estadoLaboral) {
    joins.push("INNER JOIN egresado e ON e.id_usuario = p.id_egresado");
    joins.push("INNER JOIN carrera c ON c.id_carrera = e.id_carrera");
    joins.push("INNER JOIN facultad f ON f.id_facultad = c.id_facultad");
  }
  if (filters.facultad) {
    where.push("f.nombre_facultad = ?");
    params.push(filters.facultad);
  }
  if (filters.carrera) {
    where.push("c.nombre_carrera = ?");
    params.push(filters.carrera);
  }
  if (filters.estadoLaboral) {
    where.push(`EXISTS (
      SELECT 1
      FROM seguimiento_egresado se_filter
      INNER JOIN encuesta_seguimiento es_filter ON es_filter.id_encuesta = se_filter.id_encuesta
      WHERE se_filter.id_egresado = e.id_usuario
        AND es_filter.estado_laboral = ?
    )`);
    params.push(filters.estadoLaboral);
  }
  if (filters.anio) {
    where.push(`YEAR(${dateColumn}) = ?`);
    params.push(filters.anio);
  }
  return {
    joins: joins.join("\n"),
    whereSql: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

async function buildAdministrativoDashboard(filters: AdminDashboardFilters, data: Awaited<ReturnType<typeof getAdminDashboard>>): Promise<DashboardDefinition> {
  const ofertaScope = dashboardFilterWhere(filters, "o.fecha_publicacion");
  const postulacionScope = dashboardFilterWhere(filters, "p.fecha_postulacion");
  const [
    empresasSector,
    ofertasEmpresa,
    estadoPostulaciones,
    salarioCarrera,
  ] = await Promise.all([
    queryRows<{ label: string; value: number }>(
      `SELECT em.sector AS label, COUNT(DISTINCT em.id_usuario) AS value
       FROM empresa em
       LEFT JOIN oferta_laboral o ON o.id_empresa = em.id_usuario
       LEFT JOIN postulacion p ON p.id_oferta = o.id_oferta
       ${ofertaScope.joins}
       ${ofertaScope.whereSql}
       GROUP BY em.sector
       ORDER BY value DESC
       LIMIT 10`,
      ofertaScope.params
    ),
    queryRows<{ label: string; value: number }>(
      `SELECT fn_nombre_empresa(o.id_empresa) AS label, COUNT(*) AS value
       FROM oferta_laboral o
       LEFT JOIN postulacion p ON p.id_oferta = o.id_oferta
       ${ofertaScope.joins}
       ${ofertaScope.whereSql}
       GROUP BY o.id_empresa
       ORDER BY value DESC
       LIMIT 10`,
      ofertaScope.params
    ),
    queryRows<{ label: string; value: number }>(
      `SELECT p.estado_postulacion AS label, COUNT(*) AS value
       FROM postulacion p
       ${postulacionScope.joins}
       ${postulacionScope.whereSql}
       GROUP BY p.estado_postulacion
       ORDER BY value DESC`,
      postulacionScope.params
    ),
    queryRows<{ label: string; value: number }>(
      `SELECT nombre_carrera AS label, ROUND(promedio_salario, 2) AS value
       FROM vw_promedio_salarial_carrera
       ORDER BY value DESC
       LIMIT 10`
    ),
  ]);

  return {
    title: "Reportes Administrativos",
    subtitle: "Dashboard ejecutivo institucional",
    kpis: [
      { label: "Total egresados", value: data.counts.totalEgresados },
      { label: "Total empresas", value: data.counts.totalEmpresas },
      { label: "Total ofertas", value: data.counts.totalOfertas },
      { label: "Postulaciones", value: data.counts.totalPostulaciones },
      { label: "Encuestas", value: data.counts.totalEncuestas },
    ],
    charts: [
      { title: "Egresados por carrera", type: "bar", rows: (data.charts.egresadosPorCarrera as { name: string; egresados: number }[]).map((row) => ({ label: row.name, value: Number(row.egresados) })) },
      { title: "Empresas por sector", type: "bar", rows: empresasSector },
      { title: "Ofertas por empresa Top 10", type: "column", rows: ofertasEmpresa },
      { title: "Estado de postulaciones", type: "pie", rows: estadoPostulaciones },
      { title: "Ofertas activas vs cerradas", type: "column", rows: (data.charts.ofertasHistorial as { mes: string; activas: number; cerradas: number }[]).flatMap((row) => [{ label: `${row.mes} activas`, value: Number(row.activas) }, { label: `${row.mes} cerradas`, value: Number(row.cerradas) }]).slice(-10) },
      { title: "Salario promedio por carrera", type: "column", rows: salarioCarrera },
    ],
  };
}

async function buildEstadisticasDashboard(filters: AdminDashboardFilters): Promise<DashboardDefinition> {
  const egresadoScope = dashboardFilterWhere(filters, "e.fecha_egreso");
  const postulacionScope = dashboardFilterWhere(filters, "p.fecha_postulacion");
  const [
    promedioSalarialRows,
    empleabilidadRows,
    empresaContratacionesRows,
    tiempoPromedioRows,
    evolucion,
    insercion,
    salarioCarrera,
    empresasContratan,
    modalidades,
  ] = await Promise.all([
    queryRows<{ value: number }>(`SELECT ROUND(AVG(salario), 2) AS value FROM historial_laboral WHERE salario IS NOT NULL`),
    queryRows<{ label: string; value: number }>(
      `SELECT c.nombre_carrera AS label, COUNT(DISTINCT e.id_usuario) AS value
       FROM egresado e
       INNER JOIN carrera c ON c.id_carrera = e.id_carrera
       INNER JOIN facultad f ON f.id_facultad = c.id_facultad
       INNER JOIN seguimiento_egresado se ON se.id_egresado = e.id_usuario
       INNER JOIN encuesta_seguimiento es ON es.id_encuesta = se.id_encuesta AND es.estado_laboral = 'Empleado'
       ${egresadoScope.whereSql}
       GROUP BY c.nombre_carrera
       ORDER BY value DESC
       LIMIT 1`,
      egresadoScope.params
    ),
    queryRows<{ label: string; value: number }>(
      `SELECT em.razon_social AS label, COUNT(*) AS value
       FROM postulacion p
       INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
       INNER JOIN empresa em ON em.id_usuario = o.id_empresa
       ${postulacionScope.joins}
       ${postulacionScope.whereSql ? `${postulacionScope.whereSql} AND` : "WHERE"} p.estado_postulacion = 'Aceptado'
       GROUP BY em.id_usuario
       ORDER BY value DESC
       LIMIT 1`,
      postulacionScope.params
    ),
    queryRows<{ value: number }>(
      `SELECT ROUND(AVG(CASE
        WHEN es.tiempo_conseguir_empleo LIKE 'Menos%' THEN 2
        WHEN es.tiempo_conseguir_empleo LIKE '3%' THEN 4.5
        WHEN es.tiempo_conseguir_empleo LIKE '6%' THEN 9
        WHEN es.tiempo_conseguir_empleo LIKE 'Más%' THEN 18
        ELSE NULL END), 2) AS value
       FROM encuesta_seguimiento es`
    ),
    queryRows<{ label: string; value: number }>(
      `SELECT YEAR(e.fecha_egreso) AS label, COUNT(*) AS value
       FROM egresado e
       INNER JOIN carrera c ON c.id_carrera = e.id_carrera
       INNER JOIN facultad f ON f.id_facultad = c.id_facultad
       ${egresadoScope.whereSql}
       GROUP BY YEAR(e.fecha_egreso)
       ORDER BY label`,
      egresadoScope.params
    ),
    queryRows<{ label: string; value: number }>(
      `SELECT c.nombre_carrera AS label, COUNT(DISTINCT e.id_usuario) AS value
       FROM egresado e
       INNER JOIN carrera c ON c.id_carrera = e.id_carrera
       INNER JOIN facultad f ON f.id_facultad = c.id_facultad
       INNER JOIN seguimiento_egresado se ON se.id_egresado = e.id_usuario
       INNER JOIN encuesta_seguimiento es ON es.id_encuesta = se.id_encuesta AND es.estado_laboral = 'Empleado'
       ${egresadoScope.whereSql}
       GROUP BY c.nombre_carrera
       ORDER BY value DESC
       LIMIT 10`,
      egresadoScope.params
    ),
    queryRows<{ label: string; value: number }>("SELECT nombre_carrera AS label, ROUND(promedio_salario, 2) AS value FROM vw_promedio_salarial_carrera ORDER BY value DESC LIMIT 10"),
    queryRows<{ label: string; value: number }>(
      `SELECT em.razon_social AS label, COUNT(*) AS value
       FROM postulacion p
       INNER JOIN oferta_laboral o ON o.id_oferta = p.id_oferta
       INNER JOIN empresa em ON em.id_usuario = o.id_empresa
       ${postulacionScope.joins}
       ${postulacionScope.whereSql}
       GROUP BY em.id_usuario
       ORDER BY value DESC
       LIMIT 10`,
      postulacionScope.params
    ),
    queryRows<{ label: string; value: number }>(
      `SELECT modalidad AS label, COUNT(*) AS value
       FROM historial_laboral
       GROUP BY modalidad
       ORDER BY value DESC`
    ),
  ]);

  return {
    title: "Estadísticas Analíticas",
    subtitle: "Dashboard analítico institucional",
    kpis: [
      { label: "Promedio salarial", value: `S/. ${Number(promedioSalarialRows[0]?.value ?? 0).toLocaleString("es-PE", { maximumFractionDigits: 2 })}` },
      { label: "Mayor empleabilidad", value: empleabilidadRows[0]?.label ?? "Sin datos", detail: formatNumber(Number(empleabilidadRows[0]?.value ?? 0)) },
      { label: "Más contrataciones", value: empresaContratacionesRows[0]?.label ?? "Sin datos", detail: formatNumber(Number(empresaContratacionesRows[0]?.value ?? 0)) },
      { label: "Tiempo promedio", value: `${Number(tiempoPromedioRows[0]?.value ?? 0).toFixed(1)} meses` },
    ],
    charts: [
      { title: "Evolución de egresados por año", type: "column", rows: evolucion },
      { title: "Inserción laboral por carrera", type: "bar", rows: insercion },
      { title: "Salario promedio por carrera", type: "column", rows: salarioCarrera },
      { title: "Empresas que más contratan", type: "bar", rows: empresasContratan },
      { title: "Distribución de modalidades laborales", type: "pie", rows: modalidades },
      { title: "Comparativo carrera vs salario", type: "column", rows: salarioCarrera },
    ],
  };
}

async function buildAdministrativoReport(userId: number, filters: AdminDashboardFilters): Promise<ReportDefinition> {
  const data = await getAdminDashboard(filters);
  const user = await getUserName(userId);
  const filterSummary = cleanFilters({
    Facultad: filters.facultad,
    Carrera: filters.carrera,
    Anio: filters.anio,
    "Estado laboral": filters.estadoLaboral,
  });
  const dataRows = reportDataRows(data);

  return {
    title: "Reportes Administrativos",
    generatedAt: generatedAt(),
    generatedBy: user,
    filters: filterSummary,
    recordCount: dataRows.length,
    dashboard: await buildAdministrativoDashboard(filters, data),
    sheets: [
      {
        name: "Resumen",
        rows: [
          { Campo: "Nombre del reporte", Valor: "Reportes Administrativos" },
          { Campo: "Fecha", Valor: generatedAt() },
          { Campo: "Usuario", Valor: user },
          ...Object.entries(filterSummary).map(([Campo, Valor]) => ({ Campo: `Filtro - ${Campo}`, Valor })),
          ...kpiRows(data.counts).map((row) => ({ Campo: `KPI - ${row.Indicador}`, Valor: row.Valor })),
        ],
      },
      {
        name: "Datos",
        rows: dataRows,
      },
    ],
  };
}

function encuestaExportRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    ID: Number(row.id_encuesta),
    Egresado: String(row.egresado ?? ""),
    "Estado laboral": String(row.estado_laboral ?? ""),
    "Empresa actual": String(row.nombre_empresa_actual ?? ""),
    "Cargo actual": String(row.cargo_actual ?? ""),
    "Area de trabajo": String(row.area_trabajo ?? ""),
    "Sueldo mensual": row.sueldo_mensual == null ? "" : Number(row.sueldo_mensual),
    "Tipo de contrato": String(row.tipo_contrato ?? ""),
    "Satisfaccion profesional": String(row.satisfaccion_profesional ?? ""),
    "Tiempo para conseguir empleo": String(row.tiempo_conseguir_empleo ?? ""),
    "Fecha de registro": String(row.fecha_registro ?? ""),
    "Fecha de asociacion": String(row.fecha_asociacion ?? ""),
    Observaciones: String(row.observaciones ?? ""),
  }));
}

async function buildEncuestasReport(userId: number, filters: EncuestasFilters): Promise<ReportDefinition> {
  const rows = encuestaExportRows(await listEncuestasForExport(filters));
  const user = await getUserName(userId);
  const filterSummary = cleanFilters({
    Búsqueda: filters.search,
    "Estado laboral": filters.estadoLaboral,
  });

  return {
    title: "Gestión de Encuestas",
    generatedAt: generatedAt(),
    generatedBy: user,
    filters: filterSummary,
    recordCount: rows.length,
    dashboard: await buildEncuestasDashboard(filters),
    sheets: [
      {
        name: "Resumen",
        rows: [
          { Campo: "Nombre del reporte", Valor: "Gestión de Encuestas" },
          { Campo: "Fecha", Valor: generatedAt() },
          { Campo: "Usuario", Valor: user },
          ...Object.entries(filterSummary).map(([Campo, Valor]) => ({ Campo: `Filtro - ${Campo}`, Valor })),
          { Campo: "KPI - Encuestas respondidas", Valor: rows.length },
        ],
      },
      {
        name: "Datos",
        rows,
      },
    ],
  };
}

async function buildEstadisticasReport(userId: number, filters: AdminDashboardFilters): Promise<ReportDefinition> {
  const user = await getUserName(userId);
  const filterSummary = cleanFilters({
    Facultad: filters.facultad,
    Carrera: filters.carrera,
    Anio: filters.anio,
    "Estado laboral": filters.estadoLaboral,
  });
  const dashboard = await buildEstadisticasDashboard(filters);
  const dataRows = dashboard.charts.flatMap((chart) =>
    chart.rows.map((row) => ({
      Seccion: chart.title,
      Nombre: row.label,
      Valor: row.value,
    }))
  );

  return {
    title: "Estadísticas Analíticas",
    generatedAt: generatedAt(),
    generatedBy: user,
    filters: filterSummary,
    recordCount: dataRows.length,
    dashboard,
    sheets: [
      {
        name: "Resumen",
        rows: [
          { Campo: "Nombre del reporte", Valor: "Estadísticas Analíticas" },
          { Campo: "Fecha", Valor: generatedAt() },
          { Campo: "Usuario", Valor: user },
          ...Object.entries(filterSummary).map(([Campo, Valor]) => ({ Campo: `Filtro - ${Campo}`, Valor })),
          ...dashboard.kpis.map((kpi) => ({ Campo: `KPI - ${kpi.label}`, Valor: kpi.value })),
        ],
      },
      {
        name: "Datos",
        rows: dataRows,
      },
    ],
  };
}

export async function exportAdminReport(input: ExportInput) {
  const report = input.kind === "encuestas"
    ? await buildEncuestasReport(input.userId, input.encuestasFilters ?? {})
    : input.kind === "estadisticas"
      ? await buildEstadisticasReport(input.userId, input.dashboardFilters ?? {})
      : await buildAdministrativoReport(input.userId, input.dashboardFilters ?? {});
  const buffer = input.format === "pdf" ? createPdfReport(report) : createXlsxReport(report);
  const extension = input.format === "pdf" ? "pdf" : "xlsx";
  const contentType = input.format === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const safeName = safeFileBaseName(report.title);

  return {
    buffer,
    contentType,
    filename: `${safeName}-${Date.now()}.${extension}`,
  };
}
