import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";

type ReportRow = Record<string, string | number | null | undefined>;

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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function excelDateSerial(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Math.floor(utc / 86400000) + 25569;
}

function styleForCell(column: string, rowIndex: number, isHeader: boolean, sheetName: string) {
  if (sheetName === "Resumen" && rowIndex < 5) return rowIndex === 0 ? 1 : 2;
  if (isHeader) return 4;
  if (isCurrencyColumn(column)) return rowIndex % 2 === 0 ? 8 : 9;
  if (isDateColumn(column)) return rowIndex % 2 === 0 ? 10 : 11;
  return rowIndex % 2 === 0 ? 6 : 7;
}

function worksheetXml(sheet: SheetDefinition, index: number, includeDrawing: boolean): string {
  const logoOffset = sheet.name === "Resumen" ? 8 : 0;
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
  const drawing = includeDrawing && sheet.name === "Resumen" ? `<drawing r:id="rId1"/>` : "";

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
  <numFmts count="2"><numFmt numFmtId="164" formatCode='"S/." #,##0.00'/><numFmt numFmtId="165" formatCode="yyyy-mm-dd"/></numFmts>
  <fonts count="3">
    <font><sz val="10"/><color rgb="FF1F2937"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FF00694A"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF00694A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF7F1"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CD"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD2E1DA"/></left><right style="thin"><color rgb="FFD2E1DA"/></right><top style="thin"><color rgb="FFD2E1DA"/></top><bottom style="thin"><color rgb="FFD2E1DA"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
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
  const sheets = report.sheets.slice(0, 2);
  const workbookSheets = sheets
    .map((sheet, index) => `<sheet name="${xmlEscape(sheet.name).slice(0, 31)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  const workbookRels = [
    ...sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`),
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
  ].join("");
  const sheetOverrides = sheets
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");
  const logoOverrides = logo
    ? `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Default Extension="${logo.kind === "jpeg" ? "jpg" : "png"}" ContentType="${logo.kind === "jpeg" ? "image/jpeg" : "image/png"}"/>`
    : "";

  return zipFiles([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${logoOverrides}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
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
