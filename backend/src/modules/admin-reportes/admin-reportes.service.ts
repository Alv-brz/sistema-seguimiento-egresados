import { pool } from "../../config/db.js";
import { getAdminDashboard, type AdminDashboardFilters } from "../admin-dashboard/admin-dashboard.service.js";
import { listEncuestasForExport, type EncuestasFilters } from "../encuestas/encuestas.service.js";
import { createPdfReport, createXlsxReport, type ReportDefinition } from "../../utils/report-export.js";

export type ReportKind = "administrativo" | "encuestas";
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

export async function exportAdminReport(input: ExportInput) {
  const report = input.kind === "encuestas"
    ? await buildEncuestasReport(input.userId, input.encuestasFilters ?? {})
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
