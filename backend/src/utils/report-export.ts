import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

type ReportRow = Record<string, string | number | null | undefined>;

export type DashboardKpi = {
  label: string;
  value: string | number;
  detail?: string;
};

export type DashboardChart = {
  title: string;
  type: "pie" | "bar" | "column";
  rows: { label: string; value: number; secondaryValue?: number }[];
  valueLabel?: string;
  secondaryValueLabel?: string;
};

export type DashboardDefinition = {
  title: string;
  subtitle?: string;
  kpis: DashboardKpi[];
  charts: DashboardChart[];
};

export type SheetDefinition = {
  name: string;
  rows: ReportRow[];
};

export type ReportDefinition = {
  title: string;
  generatedAt: string;
  generatedBy: string;
  filters: Record<string, string | number | undefined>;
  recordCount: number;
  sheets: SheetDefinition[];
  dashboard?: DashboardDefinition;
};

type LogoAsset = {
  data: Buffer;
  kind: "png" | "jpeg";
  width: number;
  height: number;
  rgb?: Buffer;
};

const GREEN = { r: 0, g: 105, b: 74 };
const DARK_GREEN = { r: 0, g: 83, b: 58 };
const LIGHT_GREEN = { r: 236, g: 248, b: 242 };
const GOLD = { r: 220, g: 170, b: 42 };
const BORDER = { r: 210, g: 225, b: 218 };
const TEXT = { r: 31, g: 41, b: 55 };

function valueToText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function splitGeneratedAt(value: string) {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  return {
    date: parts[0] ?? value,
    time: parts.slice(1).join(", ") || "",
  };
}

function formatFilters(filters: ReportDefinition["filters"]): string {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "Sin filtros";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
}

function loadLogo(): LogoAsset | null {
  const candidates = [
    resolve(process.cwd(), "Public", "udh-logo.png"),
    resolve(process.cwd(), "..", "Public", "udh-logo.png"),
    join(process.cwd(), "public", "udh-logo.png"),
    join(process.cwd(), "..", "public", "udh-logo.png"),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) return null;
  const data = readFileSync(file);
  const decodedPng = decodePngRgb(data);
  if (decodedPng) return { data, kind: "png", ...decodedPng };
  const decodedJpeg = decodeJpegSize(data);
  if (decodedJpeg) return { data, kind: "jpeg", ...decodedJpeg };
  return null;
}

function decodeJpegSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    const length = buffer.readUInt16BE(offset);
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

function decodePngRgb(buffer: Buffer): { width: number; height: number; rgb: Buffer } | null {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) return null;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }

  if (!width || !height || bitDepth !== 8 || ![2, 6].includes(colorType)) return null;
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const raw = Buffer.alloc(height * stride);
  let source = 0;
  let target = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[source];
    source += 1;
    const scanline = Buffer.from(inflated.subarray(source, source + stride));
    source += stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? scanline[x - channels] : 0;
      const up = previous[x] ?? 0;
      const upLeft = x >= channels ? previous[x - channels] ?? 0 : 0;
      if (filter === 1) scanline[x] = (scanline[x] + left) & 0xff;
      if (filter === 2) scanline[x] = (scanline[x] + up) & 0xff;
      if (filter === 3) scanline[x] = (scanline[x] + Math.floor((left + up) / 2)) & 0xff;
      if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        scanline[x] = (scanline[x] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 0xff;
      }
    }

    scanline.copy(raw, target);
    previous = scanline;
    target += stride;
  }

  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < raw.length; i += channels, j += 3) {
    const alpha = channels === 4 ? raw[i + 3] / 255 : 1;
    rgb[j] = Math.round(raw[i] * alpha + 255 * (1 - alpha));
    rgb[j + 1] = Math.round(raw[i + 1] * alpha + 255 * (1 - alpha));
    rgb[j + 2] = Math.round(raw[i + 2] * alpha + 255 * (1 - alpha));
  }

  return { width, height, rgb };
}

function pdfColor(color: { r: number; g: number; b: number }) {
  return `${(color.r / 255).toFixed(3)} ${(color.g / 255).toFixed(3)} ${(color.b / 255).toFixed(3)}`;
}

function normalizePdfText(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "");
}

function pdfText(value: string): string {
  return `<${Buffer.from(normalizePdfText(value), "latin1").toString("hex")}>`;
}

function sanitizePdfText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function wrapText(value: string, maxChars: number): string[] {
  const text = sanitizePdfText(valueToText(value));
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text.slice(0, maxChars)];
}

function drawText(text: string, x: number, y: number, size = 10, color = TEXT, font = "F1") {
  return `BT /${font} ${size} Tf ${pdfColor(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfText(text)} Tj ET`;
}

function drawRect(x: number, y: number, w: number, h: number, fill: { r: number; g: number; b: number }, stroke?: { r: number; g: number; b: number }) {
  const strokePart = stroke ? `${pdfColor(stroke)} RG 0.6 w` : "";
  return `q ${pdfColor(fill)} rg ${strokePart} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${stroke ? "B" : "f"} Q`;
}

function drawLine(x1: number, y1: number, x2: number, y2: number, color = BORDER, width = 0.6) {
  return `q ${pdfColor(color)} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q`;
}

function drawLogo(x: number, y: number, w: number, h: number) {
  return `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Logo Do Q`;
}

function compactUserName(value: string) {
  return value.replace(/\s*\(.+\)\s*$/, "").trim() || value;
}

function estimateColumnWidth(column: string, rows: ReportRow[]) {
  const maxText = Math.max(column.length, ...rows.slice(0, 120).map((row) => valueToText(row[column]).length));
  return Math.min(Math.max(maxText * 4.2 + 18, 52), 150);
}

function splitColumns(columns: string[], rows: ReportRow[], maxWidth: number) {
  const chunks: string[][] = [];
  let current: string[] = [];
  let width = 0;
  for (const column of columns) {
    const columnWidth = estimateColumnWidth(column, rows);
    if (current.length > 0 && width + columnWidth > maxWidth) {
      chunks.push(current);
      current = [];
      width = 0;
    }
    current.push(column);
    width += columnWidth;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function chunkWidths(columns: string[], rows: ReportRow[], maxWidth: number) {
  const raw = columns.map((column) => estimateColumnWidth(column, rows));
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => (value / total) * maxWidth);
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("es-PE", { maximumFractionDigits: 2 }) : "0";
}

function formatKpiValue(value: string | number) {
  return typeof value === "number" ? formatNumber(value) : value;
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function drawPieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, color: { r: number; g: number; b: number }) {
  const span = Math.max(0.01, endAngle - startAngle);
  const steps = Math.max(5, Math.ceil(span / (Math.PI / 18)));
  const points = Array.from({ length: steps + 1 }, (_, index) => polarPoint(cx, cy, radius, startAngle + (span * index) / steps));
  const lines = points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)} l`).join(" ");
  return `q ${pdfColor(color)} rg ${cx.toFixed(2)} ${cy.toFixed(2)} m ${lines} h f Q`;
}

function chartColor(index: number) {
  const colors = [
    GREEN,
    GOLD,
    { r: 54, g: 123, b: 96 },
    { r: 42, g: 96, b: 150 },
    { r: 160, g: 72, b: 72 },
    { r: 104, g: 88, b: 151 },
    { r: 74, g: 135, b: 120 },
    { r: 179, g: 132, b: 40 },
  ];
  return colors[index % colors.length];
}

function drawKpiGrid(kpis: DashboardKpi[], x: number, y: number, width: number) {
  const ops: string[] = [];
  const gap = 8;
  const visible = kpis.slice(0, 6);
  const cardWidth = (width - gap * Math.max(visible.length - 1, 0)) / Math.max(visible.length, 1);
  const cardHeight = 52;
  visible.forEach((kpi, index) => {
    const cardX = x + index * (cardWidth + gap);
    ops.push(drawRect(cardX, y - cardHeight, cardWidth, cardHeight, { r: 250, g: 253, b: 251 }, BORDER));
    ops.push(drawText(kpi.label, cardX + 9, y - 15, 6.8, TEXT, "F2"));
    ops.push(drawText(String(formatKpiValue(kpi.value)).slice(0, 18), cardX + 9, y - 36, 13.5, GREEN, "F2"));
    if (kpi.detail) ops.push(drawText(kpi.detail, cardX + 9, y - 47, 6.5, TEXT));
  });
  return ops;
}

function drawBarChart(chart: DashboardChart, x: number, y: number, width: number, height: number) {
  const ops: string[] = [
    drawRect(x, y - height, width, height, { r: 255, g: 255, b: 255 }, BORDER),
    drawText(chart.title, x + 12, y - 16, 8.2, TEXT, "F2"),
  ];
  const rows = chart.rows.slice(0, chart.type === "bar" ? 8 : 10);
  const max = Math.max(1, ...rows.map((row) => Number(row.value) || 0));
  const plotX = x + 84;
  const plotY = y - height + 24;
  const plotW = width - 102;
  const plotH = height - 48;
  const step = plotH / Math.max(rows.length, 1);
  rows.forEach((row, index) => {
    const barValue = Number(row.value) || 0;
    const label = valueToText(row.label);
    const barW = (barValue / max) * plotW;
    const rowY = plotY + plotH - (index + 1) * step + 4;
    ops.push(drawText(label.slice(0, 18), x + 10, rowY + 2, 5.8, TEXT));
    ops.push(drawRect(plotX, rowY, barW, Math.max(6, step - 7), index % 2 === 0 ? GREEN : { r: 54, g: 123, b: 96 }));
    ops.push(drawText(formatNumber(barValue), plotX + Math.min(barW + 4, plotW - 28), rowY + 2, 5.8, TEXT));
  });
  return ops;
}

function drawColumnChart(chart: DashboardChart, x: number, y: number, width: number, height: number) {
  const ops: string[] = [
    drawRect(x, y - height, width, height, { r: 255, g: 255, b: 255 }, BORDER),
    drawText(chart.title, x + 12, y - 16, 8.2, TEXT, "F2"),
  ];
  const rows = chart.rows.slice(0, 8);
  const max = Math.max(1, ...rows.map((row) => Number(row.value) || 0));
  const plotX = x + 22;
  const plotY = y - height + 34;
  const plotW = width - 44;
  const plotH = height - 62;
  const step = plotW / Math.max(rows.length, 1);
  rows.forEach((row, index) => {
    const value = Number(row.value) || 0;
    const label = valueToText(row.label);
    const barH = (value / max) * plotH;
    const barW = Math.max(10, step * 0.52);
    const barX = plotX + index * step + (step - barW) / 2;
    ops.push(drawRect(barX, plotY, barW, barH, index % 2 === 0 ? GREEN : { r: 54, g: 123, b: 96 }));
    ops.push(drawText(formatNumber(value), barX - 2, plotY + barH + 5, 5.6, TEXT));
    ops.push(drawText(label.slice(0, 10), barX - 4, plotY - 12, 5.2, TEXT));
  });
  return ops;
}

function drawPieChart(chart: DashboardChart, x: number, y: number, width: number, height: number) {
  const ops: string[] = [
    drawRect(x, y - height, width, height, { r: 255, g: 255, b: 255 }, BORDER),
    drawText(chart.title, x + 12, y - 16, 8.2, TEXT, "F2"),
  ];
  const rows = chart.rows.slice(0, 6).filter((row) => Number(row.value) > 0);
  const total = rows.reduce((sum, row) => sum + Number(row.value), 0) || 1;
  const cx = x + 62;
  const cy = y - height / 2 - 6;
  let angle = -Math.PI / 2;
  rows.forEach((row, index) => {
    const next = angle + (Number(row.value) / total) * Math.PI * 2;
    ops.push(drawPieSlice(cx, cy, 35, angle, next, chartColor(index)));
    angle = next;
    const legendY = y - 38 - index * 12;
    const label = valueToText(row.label);
    ops.push(drawRect(x + 118, legendY - 5, 6, 6, chartColor(index)));
    ops.push(drawText(`${label.slice(0, 18)} ${Math.round((Number(row.value) / total) * 100)}%`, x + 128, legendY - 4, 5.8, TEXT));
  });
  return ops;
}

function drawDashboardPage(report: ReportDefinition, logo: LogoAsset | null, pageWidth: number, pageHeight: number, margin: number, generated: { date: string; time: string }, pdfUser: string) {
  const dashboard = report.dashboard;
  const ops: string[] = [];
  ops.push(drawRect(0, 0, pageWidth, pageHeight, { r: 255, g: 255, b: 255 }));
  ops.push(drawRect(0, pageHeight - 88, pageWidth, 88, GREEN));
  ops.push(drawRect(0, pageHeight - 96, pageWidth * 0.78, 8, GOLD));
  ops.push(drawRect(pageWidth * 0.78, pageHeight - 96, pageWidth * 0.22, 8, DARK_GREEN));
  if (logo) ops.push(drawLogo(margin + 2, pageHeight - 74, 52, 52));
  ops.push(drawText("Universidad de Huánuco", margin + 66, pageHeight - 42, 18, { r: 255, g: 255, b: 255 }, "F2"));
  ops.push(drawText("Sistema de Seguimiento de Egresados y Bolsa Laboral", margin + 67, pageHeight - 62, 10, { r: 255, g: 255, b: 255 }));
  ops.push(drawText("Dashboard Ejecutivo", margin, pageHeight - 126, 17, DARK_GREEN, "F2"));
  ops.push(drawText(dashboard?.title ?? report.title, margin, pageHeight - 146, 11, TEXT));
  ops.push(drawRect(pageWidth - margin - 210, pageHeight - 154, 210, 50, { r: 250, g: 253, b: 251 }, BORDER));
  ops.push(drawText(`Fecha: ${generated.date}`, pageWidth - margin - 196, pageHeight - 120, 7.2, TEXT));
  ops.push(drawText(`Hora: ${generated.time || "-"}`, pageWidth - margin - 196, pageHeight - 133, 7.2, TEXT));
  ops.push(drawText(`Usuario: ${pdfUser}`, pageWidth - margin - 196, pageHeight - 146, 7.2, TEXT));
  ops.push(drawText(`Total registros: ${report.recordCount.toLocaleString("es-PE")}`, pageWidth - margin - 85, pageHeight - 146, 7.2, GREEN, "F2"));
  if (dashboard) {
    ops.push(...drawKpiGrid(dashboard.kpis, margin, pageHeight - 174, pageWidth - margin * 2));
    const chartY1 = pageHeight - 252;
    const chartY2 = pageHeight - 404;
    const chartW = (pageWidth - margin * 2 - 18) / 3;
    const chartH = 132;
    dashboard.charts.slice(0, 6).forEach((chart, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = margin + col * (chartW + 9);
      const y = row === 0 ? chartY1 : chartY2;
      if (chart.type === "pie") ops.push(...drawPieChart(chart, x, y, chartW, chartH));
      else if (chart.type === "column") ops.push(...drawColumnChart(chart, x, y, chartW, chartH));
      else ops.push(...drawBarChart(chart, x, y, chartW, chartH));
    });
  }
  ops.push(drawRect(0, 0, pageWidth, 28, DARK_GREEN));
  ops.push(drawText(`Fecha: ${generated.date}${generated.time ? ` | Hora: ${generated.time}` : ""}`, margin, 10, 7.5, { r: 255, g: 255, b: 255 }));
  ops.push(drawText(`Usuario: ${pdfUser}`, 290, 10, 7.5, { r: 255, g: 255, b: 255 }));
  ops.push(drawText("Página 1", pageWidth - margin - 58, 10, 7.5, { r: 255, g: 255, b: 255 }));
  return ops;
}

export function createPdfReport(report: ReportDefinition): Buffer {
  const logo = loadLogo();
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 34;
  const tableWidth = pageWidth - margin * 2;
  const generated = splitGeneratedAt(report.generatedAt);
  const pdfUser = compactUserName(report.generatedBy);
  const pages: string[][] = [];
  let ops: string[] = [];
  let pageNumber = 0;
  let y = pageHeight - margin;

  function pageHeader() {
    const header: string[] = [
      drawRect(0, pageHeight - 64, pageWidth, 64, { r: 255, g: 255, b: 255 }),
      drawRect(0, pageHeight - 70, pageWidth, 6, GOLD),
      drawRect(pageWidth - 120, pageHeight - 70, 120, 6, GREEN),
    ];
    if (logo) header.push(drawLogo(margin, pageHeight - 55, 38, 38));
    header.push(drawText("Universidad de Huánuco", margin + 48, pageHeight - 35, 13, GREEN, "F2"));
    header.push(drawText("Sistema de Seguimiento de Egresados", margin + 48, pageHeight - 50, 9, TEXT));
    header.push(drawText(report.title, pageWidth - margin - 235, pageHeight - 38, 14, DARK_GREEN, "F2"));
    return header;
  }

  function pageFooter() {
    return [
      drawRect(0, 0, pageWidth, 28, DARK_GREEN),
      drawText(`Fecha: ${generated.date}${generated.time ? ` | Hora: ${generated.time}` : ""}`, margin, 10, 7.5, { r: 255, g: 255, b: 255 }),
      drawText(`Usuario: ${pdfUser}`, 290, 10, 7.5, { r: 255, g: 255, b: 255 }),
      drawText(`Página ${pageNumber}`, pageWidth - margin - 58, 10, 7.5, { r: 255, g: 255, b: 255 }),
    ];
  }

  function startPage(withHeader = true) {
    if (ops.length > 0) {
      ops.push(...pageFooter());
      pages.push(ops);
    }
    pageNumber += 1;
    ops = [];
    y = withHeader ? pageHeight - 92 : pageHeight - margin;
    if (withHeader) ops.push(...pageHeader());
  }

  function ensureSpace(height: number) {
    if (y - height < 44) startPage();
  }

  function addCover() {
    if (report.dashboard) {
      pageNumber = 1;
      pages.push(drawDashboardPage(report, logo, pageWidth, pageHeight, margin, generated, pdfUser));
      ops = [];
      return;
    }
    startPage(false);
    ops.push(drawRect(0, 0, pageWidth, pageHeight, { r: 255, g: 255, b: 255 }));
    ops.push(drawRect(0, pageHeight - 105, pageWidth, 105, GREEN));
    ops.push(drawRect(0, pageHeight - 115, pageWidth * 0.78, 10, GOLD));
    ops.push(drawRect(pageWidth * 0.78, pageHeight - 115, pageWidth * 0.22, 10, DARK_GREEN));
    if (logo) ops.push(drawLogo(margin + 4, pageHeight - 88, 68, 68));
    ops.push(drawText("Universidad de Huánuco", margin + 88, pageHeight - 55, 24, { r: 255, g: 255, b: 255 }, "F2"));
    ops.push(drawText("Sistema de Seguimiento de Egresados y Bolsa Laboral", margin + 90, pageHeight - 78, 12, { r: 255, g: 255, b: 255 }));
    ops.push(drawText("REPORTE INSTITUCIONAL", margin, pageHeight - 175, 13, GOLD, "F2"));
    ops.push(drawText(report.title, margin, pageHeight - 205, 26, DARK_GREEN, "F2"));
    ops.push(drawRect(margin, pageHeight - 315, pageWidth - margin * 2, 82, { r: 250, g: 253, b: 251 }, BORDER));
    const cards = [
      ["Fecha", generated.date],
      ["Hora", generated.time || "-"],
      ["Usuario", pdfUser],
      ["Total de registros", report.recordCount.toLocaleString("es-PE")],
    ];
    cards.forEach(([label, value], index) => {
      const x = margin + index * ((pageWidth - margin * 2) / 4);
      if (index > 0) ops.push(drawLine(x, pageHeight - 300, x, pageHeight - 250, BORDER));
      ops.push(drawText(label, x + 16, pageHeight - 265, 9, TEXT, "F2"));
      ops.push(drawText(value, x + 16, pageHeight - 288, index === 3 ? 17 : 10, index === 3 ? GREEN : TEXT, index === 3 ? "F2" : "F1"));
    });
    ops.push(drawRect(margin, pageHeight - 405, pageWidth - margin * 2, 58, LIGHT_GREEN, BORDER));
    ops.push(drawText("Filtros aplicados", margin + 16, pageHeight - 370, 11, GREEN, "F2"));
    wrapText(formatFilters(report.filters), 130).slice(0, 2).forEach((line, index) => {
      ops.push(drawText(line, margin + 16, pageHeight - 390 - index * 13, 9, TEXT));
    });
  }

  function addSummary() {
    startPage();
    ops.push(drawText("Resumen del reporte", margin, y, 16, DARK_GREEN, "F2"));
    y -= 28;
    ops.push(drawRect(margin, y - 58, tableWidth, 58, { r: 250, g: 253, b: 251 }, BORDER));
    ops.push(drawText(`Cantidad total: ${report.recordCount.toLocaleString("es-PE")}`, margin + 16, y - 20, 10, GREEN, "F2"));
    ops.push(drawText(`Fecha: ${generated.date}${generated.time ? ` | Hora: ${generated.time}` : ""}`, margin + 230, y - 20, 10, TEXT));
    ops.push(drawText(`Usuario: ${pdfUser}`, margin + 16, y - 42, 9, TEXT));
    y -= 84;
    ops.push(drawRect(margin, y - 52, tableWidth, 52, LIGHT_GREEN, BORDER));
    ops.push(drawText("Filtros usados", margin + 14, y - 18, 10, GREEN, "F2"));
    wrapText(formatFilters(report.filters), 145).slice(0, 2).forEach((line, index) => {
      ops.push(drawText(line, margin + 14, y - 36 - index * 12, 8.5, TEXT));
    });
    y -= 78;
  }

  function addTable(title: string, rows: ReportRow[]) {
    ensureSpace(46);
    ops.push(drawText(title, margin, y, 13, DARK_GREEN, "F2"));
    y -= 22;
    if (rows.length === 0) {
      ops.push(drawRect(margin, y - 28, tableWidth, 28, LIGHT_GREEN, BORDER));
      ops.push(drawText("Sin datos para mostrar.", margin + 12, y - 18, 9, TEXT));
      y -= 42;
      return;
    }

    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const chunks = splitColumns(columns, rows, tableWidth);
    chunks.forEach((chunk, chunkIndex) => {
      const widths = chunkWidths(chunk, rows, tableWidth);
      ensureSpace(54);
      if (chunks.length > 1) {
        ops.push(drawText(`${title} - bloque ${chunkIndex + 1} de ${chunks.length}`, margin, y, 9, GOLD, "F2"));
        y -= 16;
      }
      ops.push(drawRect(margin, y - 24, tableWidth, 24, GREEN));
      let x = margin;
      chunk.forEach((column, index) => {
        ops.push(drawText(column, x + 5, y - 15, 7.3, { r: 255, g: 255, b: 255 }, "F2"));
        x += widths[index];
      });
      y -= 24;

      rows.forEach((row, rowIndex) => {
        const lineCounts = chunk.map((column, index) => wrapText(valueToText(row[column]), Math.max(8, Math.floor(widths[index] / 4.5))).slice(0, 2).length);
        const rowHeight = Math.max(22, Math.max(...lineCounts) * 10 + 8);
        ensureSpace(rowHeight + 4);
        ops.push(drawRect(margin, y - rowHeight, tableWidth, rowHeight, rowIndex % 2 === 0 ? { r: 255, g: 255, b: 255 } : LIGHT_GREEN, BORDER));
        x = margin;
        chunk.forEach((column, index) => {
          wrapText(valueToText(row[column]), Math.max(8, Math.floor(widths[index] / 4.5))).slice(0, 2).forEach((line, lineIndex) => {
            ops.push(drawText(line, x + 5, y - 12 - lineIndex * 9, 6.8, TEXT));
          });
          x += widths[index];
        });
        y -= rowHeight;
      });
      y -= 18;
    });
  }

  addCover();
  addSummary();
  report.sheets.forEach((sheet) => addTable(sheet.name, sheet.rows));
  ops.push(...pageFooter());
  pages.push(ops);

  const objects: (string | Buffer)[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [] /Count 0 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let logoObjectId = 0;
  if (logo) {
    logoObjectId = objects.length + 1;
    if (logo.kind === "jpeg") {
      objects.push(Buffer.concat([
        Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >>\nstream\n`, "utf8"),
        logo.data,
        Buffer.from("\nendstream", "utf8"),
      ]));
    } else if (logo.rgb) {
      const compressedLogo = deflateSync(logo.rgb);
      objects.push(Buffer.concat([
        Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressedLogo.length} >>\nstream\n`, "utf8"),
        compressedLogo,
        Buffer.from("\nendstream", "utf8"),
      ]));
    }
  }

  const pageObjectIds: number[] = [];
  pages.forEach((pageOps) => {
    const content = pageOps.join("\n");
    const contentObjectId = objects.length + 1;
    const pageObjectId = objects.length + 2;
    const xObject = logoObjectId ? `/XObject << /Logo ${logoObjectId} 0 R >>` : "";
    objects.push(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xObject} >> /Contents ${contentObjectId} 0 R >>`);
    pageObjectIds.push(pageObjectId);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  return assemblePdf(objects);
}

function assemblePdf(objects: (string | Buffer)[]): Buffer {
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n", "utf8")];
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(parts.reduce((sum, part) => sum + part.length, 0));
    parts.push(Buffer.from(`${index + 1} 0 obj\n`, "utf8"));
    parts.push(Buffer.isBuffer(object) ? object : Buffer.from(object, "utf8"));
    parts.push(Buffer.from("\nendobj\n", "utf8"));
  });
  const body = Buffer.concat(parts);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF`;
  return Buffer.concat([body, Buffer.from(xref, "utf8")]);
}

function xmlEscape(value: unknown): string {
  return valueToText(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeWorksheetName(value: string): string {
  const cleaned = valueToText(value).replace(/[\[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "Hoja").slice(0, 31);
}

function columnName(index: number): string {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function isDateColumn(column: string) {
  return /fecha/i.test(column);
}

function isCurrencyColumn(column: string) {
  return /sueldo|salario|monto|importe/i.test(column);
}

function isCurrencyMetric(value: string) {
  return /sueldo|salario|monto|importe|remuneraci[oó]n/i.test(value);
}

function excelNumberFormat(value: string) {
  return isCurrencyMetric(value) ? `"S/." #,##0.00` : "#,##0";
}

function abbreviateChartLabel(value: string, chartType: DashboardChart["type"]): string {
  const text = valueToText(value).replace(/\s+/g, " ").trim();
  const maxLength = chartType === "bar" ? 32 : chartType === "pie" ? 24 : 18;
  if (text.length <= maxLength) return text;

  const words = text.split(" ").filter(Boolean);
  if (words.length > 1) {
    const compact = words
      .slice(0, chartType === "column" ? 2 : 3)
      .map((word, index) => (index === 0 ? word : word.length > 8 ? word.slice(0, 8) : word))
      .join(" ");
    if (compact.length <= maxLength - 3) return `${compact}...`;
  }

  return `${text.slice(0, Math.max(4, maxLength - 3)).trim()}...`;
}

function excelDateSerial(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Math.floor(utc / 86400000) + 25569;
}

function styleForCell(column: string, rowIndex: number, isHeader: boolean, sheetName: string) {
  if ((sheetName === "Resumen" || sheetName === "Resumen Ejecutivo") && rowIndex < 5) return rowIndex === 0 ? 1 : 2;
  if (isHeader) return 4;
  if (isCurrencyColumn(column)) return rowIndex % 2 === 0 ? 8 : 9;
  if (isDateColumn(column)) return rowIndex % 2 === 0 ? 10 : 11;
  return rowIndex % 2 === 0 ? 6 : 7;
}

function worksheetXml(sheet: SheetDefinition, index: number, includeDrawing: boolean): string {
  const logoOffset = sheet.name === "Resumen" || sheet.name === "Resumen Ejecutivo" ? 8 : 0;
  const columns = Array.from(new Set(sheet.rows.flatMap((row) => Object.keys(row))));
  const allRows = [columns, ...sheet.rows.map((row) => columns.map((column) => row[column]))];
  const widths = columns.map((column, colIndex) => {
    const max = Math.max(column.length, ...sheet.rows.map((row) => valueToText(row[column]).length));
    return `<col min="${colIndex + 1}" max="${colIndex + 1}" width="${Math.min(Math.max(max + 2, 12), 48)}" customWidth="1"/>`;
  });
  const rowsXml = allRows.map((row, rowIndex) => {
    const excelRow = rowIndex + 1 + logoOffset;
    const cells = row.map((value, colIndex) => {
      const column = columns[colIndex] ?? "";
      const ref = `${columnName(colIndex)}${excelRow}`;
      const style = styleForCell(column, rowIndex, rowIndex === 0, sheet.name);
      const dateSerial = rowIndex > 0 && isDateColumn(column) ? excelDateSerial(value) : null;
      if (dateSerial !== null) {
        return `<c r="${ref}" s="${style}"><v>${dateSerial}</v></c>`;
      }
      if (rowIndex > 0 && typeof value === "number" && Number.isFinite(value)) {
        return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
      }
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
    });
    return `<row r="${excelRow}" ht="${rowIndex === 0 ? 22 : 18}" customHeight="1">${cells.join("")}</row>`;
  });
  const endRef = `${columnName(Math.max(columns.length - 1, 0))}${Math.max(allRows.length + logoOffset, logoOffset + 1)}`;
  const autoFilter = sheet.rows.length > 0 ? `<autoFilter ref="A${logoOffset + 1}:${endRef}"/>` : "";
  const freeze = `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${logoOffset + 1}" topLeftCell="A${logoOffset + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
  const drawing = includeDrawing && (sheet.name === "Resumen" || sheet.name === "Resumen Ejecutivo") ? `<drawing r:id="rId1"/>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${freeze}
  <cols>${widths.join("")}</cols>
  <sheetData>${rowsXml.join("")}</sheetData>
  ${autoFilter}
  ${drawing}
</worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3"><numFmt numFmtId="164" formatCode='"S/." #,##0.00'/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/><numFmt numFmtId="166" formatCode="#,##0"/></numFmts>
  <fonts count="5">
    <font><sz val="10"/><color rgb="FF1F2937"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FF00694A"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="15"/><color rgb="FF00694A"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF00694A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF7F1"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CD"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FCFA"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7E8B6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD2E1DA"/></left><right style="thin"><color rgb="FFD2E1DA"/></right><top style="thin"><color rgb="FFD2E1DA"/></top><bottom style="thin"><color rgb="FFD2E1DA"/></bottom><diagonal/></border>
    <border><left style="thin"><color rgb="FFE5EEE9"/></left><right style="thin"><color rgb="FFE5EEE9"/></right><top style="thin"><color rgb="FFE5EEE9"/></top><bottom style="thin"><color rgb="FFE5EEE9"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="18">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="166" fontId="4" fillId="5" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment horizontal="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function excelLogoSize(logo: LogoAsset) {
  const maxWidthPx = 150;
  const maxHeightPx = 88;
  const aspect = logo.width / logo.height;
  let widthPx = maxHeightPx * aspect;
  let heightPx = maxHeightPx;

  if (widthPx > maxWidthPx) {
    widthPx = maxWidthPx;
    heightPx = widthPx / aspect;
  }

  return {
    cx: Math.round(widthPx * 9525),
    cy: Math.round(heightPx * 9525),
  };
}

function drawingXml(logo: LogoAsset) {
  const { cx, cy } = excelLogoSize(logo);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:oneCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>120000</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>120000</xdr:rowOff></xdr:from>
    <xdr:ext cx="${cx}" cy="${cy}"/>
    <xdr:pic>
      <xdr:nvPicPr><xdr:cNvPr id="1" name="Logo UDH"/><xdr:cNvPicPr/></xdr:nvPicPr>
      <xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
      <xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;
}

function drawingRelsXml(logo: LogoAsset) {
  const target = logo.kind === "jpeg" ? "../media/udh-logo.jpg" : "../media/udh-logo.png";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/>
</Relationships>`;
}

function worksheetRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
}

function dashboardSheetName() {
  return "Dashboard";
}

function dashboardDataSheetName() {
  return "DashboardData";
}

function dashboardDataLayout(dashboard: DashboardDefinition) {
  let row = 1;
  return dashboard.charts.map((chart, index) => {
    const startRow = row;
    row += Math.max(chart.rows.length, 1) + 3;
    return {
      chart,
      index,
      startRow,
      endRow: startRow + Math.max(chart.rows.length, 1),
      labelCol: 1,
      valueCol: 2,
    };
  });
}

function dashboardWorksheetXml(report: ReportDefinition): string {
  const dashboard = report.dashboard;
  if (!dashboard) return worksheetXml({ name: dashboardSheetName(), rows: [] }, 2, false);
  const rows = new Map<number, string[]>();
  const drawing = dashboard.charts.length > 0 ? `<drawing r:id="rId1"/>` : "";
  const merges: string[] = ["A1:L1", "A2:L2", "A3:L3"];

  function addCell(rowNumber: number, cellXml: string) {
    const current = rows.get(rowNumber) ?? [];
    current.push(cellXml);
    rows.set(rowNumber, current);
  }

  addCell(1, `<c r="A1" s="16" t="inlineStr"><is><t>${xmlEscape("Dashboard Ejecutivo")}</t></is></c>`);
  addCell(2, `<c r="A2" s="17" t="inlineStr"><is><t>${xmlEscape(dashboard.title)}</t></is></c>`);
  if (dashboard.subtitle) {
    addCell(3, `<c r="A3" s="15" t="inlineStr"><is><t>${xmlEscape(dashboard.subtitle)}</t></is></c>`);
  }
  dashboard.kpis.slice(0, 6).forEach((kpi, index) => {
    const startCol = index * 2;
    const endCol = startCol + 1;
    const labelRef = `${columnName(startCol)}4`;
    const valueRef = `${columnName(startCol)}5`;
    const value = kpi.value;
    merges.push(`${columnName(startCol)}4:${columnName(endCol)}4`, `${columnName(startCol)}5:${columnName(endCol)}5`);
    addCell(4, `<c r="${labelRef}" s="12" t="inlineStr"><is><t>${xmlEscape(kpi.label)}</t></is></c>`);
    addCell(
      5,
      typeof value === "number"
        ? `<c r="${valueRef}" s="13"><v>${Math.round(value)}</v></c>`
        : `<c r="${valueRef}" s="14" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`
    );
  });
  const rowsXml = Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([rowNumber, cells]) => {
      const height = rowNumber === 1 ? 24 : rowNumber === 2 ? 19 : rowNumber === 3 ? 16 : rowNumber === 4 ? 25 : 28;
      return `<row r="${rowNumber}" ht="${height}" customHeight="1">${cells.join("")}</row>`;
    });
  const mergeXml = `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols><col min="1" max="16" width="14.5" customWidth="1"/></cols>
  <sheetData>${rowsXml.join("")}</sheetData>
  ${mergeXml}
  ${drawing}
</worksheet>`;
}

function dashboardDataWorksheetXml(dashboard: DashboardDefinition, layouts: ReturnType<typeof dashboardDataLayout>): string {
  const rows: string[] = [];
  for (const layout of layouts) {
    rows.push(`<row r="${layout.startRow}"><c r="A${layout.startRow}" s="4" t="inlineStr"><is><t>${xmlEscape(layout.chart.title)}</t></is></c><c r="B${layout.startRow}" s="4" t="inlineStr"><is><t>${xmlEscape(layout.chart.valueLabel ?? "Valor")}</t></is></c></row>`);
    const sourceRows = layout.chart.rows.length > 0 ? layout.chart.rows : [{ label: "Sin datos", value: 0 }];
    sourceRows.forEach((item, itemIndex) => {
      const rowNumber = layout.startRow + itemIndex + 1;
      const label = abbreviateChartLabel(item.label, layout.chart.type);
      rows.push(`<row r="${rowNumber}"><c r="A${rowNumber}" s="${itemIndex % 2 === 0 ? 6 : 7}" t="inlineStr"><is><t>${xmlEscape(label)}</t></is></c><c r="B${rowNumber}" s="${itemIndex % 2 === 0 ? 6 : 7}"><v>${Number(item.value) || 0}</v></c></row>`);
    });
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="16" customWidth="1"/></cols>
  <sheetData>${rows.join("")}</sheetData>
</worksheet>`;
}

function chartXml(chart: DashboardChart, startRow: number, endRow: number, index: number) {
  const sheet = dashboardDataSheetName();
  const catRef = `'${sheet}'!$A$${startRow + 1}:$A$${endRow}`;
  const valRef = `'${sheet}'!$B$${startRow + 1}:$B$${endRow}`;
  const title = xmlEscape(chart.title);
  const numberFormat = xmlEscape(excelNumberFormat(`${chart.title} ${chart.valueLabel ?? ""}`));
  const sourceRows = (chart.rows.length > 0 ? chart.rows : [{ label: "Sin datos", value: 0 }]).map((row) => ({
    ...row,
    label: abbreviateChartLabel(row.label, chart.type),
  }));
  const catCache = sourceRows
    .map((row, pointIndex) => `<c:pt idx="${pointIndex}"><c:v>${xmlEscape(row.label)}</c:v></c:pt>`)
    .join("");
  const valCache = sourceRows
    .map((row, pointIndex) => `<c:pt idx="${pointIndex}"><c:v>${Number(row.value) || 0}</c:v></c:pt>`)
    .join("");
  const series = `<c:ser>
      <c:idx val="0"/>
      <c:order val="0"/>
      <c:tx><c:v>${title}</c:v></c:tx>
      <c:cat><c:strRef><c:f>${catRef}</c:f><c:strCache><c:ptCount val="${sourceRows.length}"/>${catCache}</c:strCache></c:strRef></c:cat>
      <c:val><c:numRef><c:f>${valRef}</c:f><c:numCache><c:formatCode>${numberFormat}</c:formatCode><c:ptCount val="${sourceRows.length}"/>${valCache}</c:numCache></c:numRef></c:val>
    </c:ser>`;
  const chartBody = chart.type === "pie"
    ? `<c:pieChart><c:varyColors val="1"/>${series}<c:dLbls><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="850"><a:solidFill><a:srgbClr val="1F2937"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr><c:separator val="&#10;"/><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="1"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showLeaderLines val="1"/></c:dLbls><c:firstSliceAng val="270"/></c:pieChart>`
    : `<c:barChart><c:barDir val="${chart.type === "bar" ? "bar" : "col"}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:dLbls><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800"><a:solidFill><a:srgbClr val="1F2937"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr><c:numFmt formatCode="${numberFormat}" sourceLinked="0"/><c:dLblPos val="${chart.type === "bar" ? "outEnd" : "outEnd"}"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/></c:dLbls><c:axId val="${1000 + index * 2}"/><c:axId val="${1001 + index * 2}"/></c:barChart><c:catAx><c:axId val="${1000 + index * 2}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${chart.type === "bar" ? "l" : "b"}"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:txPr><a:bodyPr${chart.type === "column" ? ' rot="-2700000"' : ""}/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${chart.type === "bar" ? "800" : "650"}"><a:solidFill><a:srgbClr val="1F2937"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr><c:crossAx val="${1001 + index * 2}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="${chart.type === "column" ? "60" : "100"}"/><c:tickLblSkip val="1"/><c:tickMarkSkip val="1"/><c:noMultiLvlLbl val="1"/></c:catAx><c:valAx><c:axId val="${1001 + index * 2}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${chart.type === "bar" ? "b" : "l"}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E5EEE9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${numberFormat}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800"><a:solidFill><a:srgbClr val="6B7280"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr><c:crossAx val="${1000 + index * 2}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="es-PE" sz="1050" b="1"><a:solidFill><a:srgbClr val="00694A"/></a:solidFill></a:rPr><a:t>${title}</a:t></a:r></a:p></c:rich></c:tx></c:title>
    <c:plotArea><c:layout/>${chartBody}</c:plotArea>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="6350"><a:solidFill><a:srgbClr val="D2E1DA"/></a:solidFill></a:ln></c:spPr>
</c:chartSpace>`;
}

function dashboardDrawingXml(chartCount: number) {
  const anchors: string[] = [];
  for (let i = 0; i < chartCount; i += 1) {
    const col = (i % 2) * 8;
    const row = 7 + Math.floor(i / 2) * 16;
    anchors.push(`<xdr:twoCellAnchor>
      <xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>120000</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>120000</xdr:rowOff></xdr:from>
      <xdr:to><xdr:col>${col + 7}</xdr:col><xdr:colOff>740000</xdr:colOff><xdr:row>${row + 15}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
      <xdr:graphicFrame>
        <xdr:nvGraphicFramePr><xdr:cNvPr id="${10 + i}" name="Grafico ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
        <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
        <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${i + 1}"/></a:graphicData></a:graphic>
      </xdr:graphicFrame>
      <xdr:clientData/>
    </xdr:twoCellAnchor>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors.join("")}</xdr:wsDr>`;
}

function dashboardDrawingRelsXml(chartCount: number) {
  const rels = Array.from({ length: chartCount }, (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${index + 1}.xml"/>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`;
}

function dashboardWorksheetRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/dashboard-drawing.xml"/>
</Relationships>`;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function zipFiles(files: { name: string; content: string | Buffer }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const { dosTime, dosDate } = dosDateTime();
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf8");
    const crc = crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, content);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + content.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, central, end]);
}

export function createXlsxReport(report: ReportDefinition): Buffer {
  const logo = loadLogo();
  const sheets = report.sheets.slice(0, 2).map((sheet, index) => ({
    ...sheet,
    name: index === 0 ? "Resumen Ejecutivo" : index === 1 ? "Datos" : sanitizeWorksheetName(sheet.name),
  }));
  const hasDashboard = Boolean(report.dashboard);
  const visibleSheetNames = hasDashboard ? [...sheets.map((sheet) => sheet.name), dashboardSheetName()] : sheets.map((sheet) => sheet.name);
  const allSheetNames = hasDashboard ? [...visibleSheetNames, dashboardDataSheetName()] : visibleSheetNames;
  const workbookSheets = allSheetNames
    .map((sheetName, index) => {
      const state = sheetName === dashboardDataSheetName() ? ` state="hidden"` : "";
      return `<sheet name="${xmlEscape(sanitizeWorksheetName(sheetName))}" sheetId="${index + 1}"${state} r:id="rId${index + 1}"/>`;
    })
    .join("");
  const workbookRels = [
    ...allSheetNames.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`),
    `<Relationship Id="rId${allSheetNames.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
  ].join("");
  const sheetOverrides = allSheetNames
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");
  const dashboard = report.dashboard;
  const chartLayouts = dashboard ? dashboardDataLayout(dashboard).slice(0, 6) : [];
  const chartOverrides = chartLayouts
    .map((_, index) => `<Override PartName="/xl/charts/chart${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`)
    .join("");
  const logoOverrides = logo
    ? `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Default Extension="${logo.kind === "jpeg" ? "jpg" : "png"}" ContentType="${logo.kind === "jpeg" ? "image/jpeg" : "image/png"}"/>`
    : "";
  const dashboardDrawingOverride = chartLayouts.length > 0 ? `<Override PartName="/xl/drawings/dashboard-drawing.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` : "";

  return zipFiles([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${logoOverrides}
  ${dashboardDrawingOverride}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
  ${chartOverrides}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheets}</sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}</Relationships>`,
    },
    { name: "xl/styles.xml", content: stylesXml() },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: worksheetXml(sheet, index, Boolean(logo)),
    })),
    ...(dashboard
      ? [
          { name: "xl/worksheets/sheet3.xml", content: dashboardWorksheetXml(report) },
          { name: "xl/worksheets/sheet4.xml", content: dashboardDataWorksheetXml(dashboard, chartLayouts) },
          ...(chartLayouts.length > 0
            ? [
                { name: "xl/worksheets/_rels/sheet3.xml.rels", content: dashboardWorksheetRelsXml() },
                { name: "xl/drawings/dashboard-drawing.xml", content: dashboardDrawingXml(chartLayouts.length) },
                { name: "xl/drawings/_rels/dashboard-drawing.xml.rels", content: dashboardDrawingRelsXml(chartLayouts.length) },
              ]
            : []),
          ...chartLayouts.map((layout, index) => ({
            name: `xl/charts/chart${index + 1}.xml`,
            content: chartXml(layout.chart, layout.startRow, layout.endRow, index),
          })),
        ]
      : []),
    ...(logo
      ? [
          { name: "xl/worksheets/_rels/sheet1.xml.rels", content: worksheetRelsXml() },
          { name: "xl/drawings/drawing1.xml", content: drawingXml(logo) },
          { name: "xl/drawings/_rels/drawing1.xml.rels", content: drawingRelsXml(logo) },
          { name: `xl/media/udh-logo.${logo.kind === "jpeg" ? "jpg" : "png"}`, content: logo.data },
        ]
      : []),
  ]);
}
