import * as XLSX from "xlsx";

export interface ParsedScheduleRow {
  employee_name: string;
  badge_id: string;
  work_post: string;
  schedule_date: string;
  shift_start: string;
  shift_end: string;
  notes: string | null;
}

interface ParseScheduleOptions {
  workPosts: string[];
  badgeLookup?: Map<string, string>;
}

interface PdfMonthYear {
  month: number;
  year: number;
}

interface PdfToken {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

interface PdfRow {
  y: number;
  items: PdfToken[];
}

const SHIFT_HOURS: Record<"06" | "18", { shift_start: string; shift_end: string }> = {
  "06": { shift_start: "06:00", shift_end: "18:00" },
  "18": { shift_start: "18:00", shift_end: "06:00" },
};

const SPANISH_MONTHS: Record<string, number> = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  SETIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12,
};

const IGNORED_NAME_TERMS = [
  "PYCSECA",
  "CUADRANTE",
  "VIGILANTE",
  "SERVICIO",
  "PUESTO",
  "TURNO",
  "TOTAL",
  "HORAS",
  "LOGISTICA",
  "PLANTA",
  "CENTRO",
  "SEDE",
  "FECHA",
  "MES",
  "AÑO",
  "ANO",
  "DIA",
  "LUN",
  "MAR",
  "MIE",
  "JUE",
  "VIE",
  "SAB",
  "DOM",
];

const HUMAN_NAME_REGEX = /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ' -]*$/;

export async function parseScheduleFile(file: File, options: ParseScheduleOptions): Promise<ParsedScheduleRow[]> {
  const lowerName = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    return parsePdfSchedule(bytes, options);
  }

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    return parseExcelSchedule(bytes, options);
  }

  return parseCsvSchedule(bytes, options);
}

export function normalizePersonName(value: string): string {
  return sanitizeDisplayText(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeDisplayText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\u0000/g, "")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildNotes(base: unknown, generatedBadgeId = false, source?: string): string | null {
  const parts = [sanitizeDisplayText(base), generatedBadgeId ? "DNI/placa generado automáticamente desde el nombre" : "", source ?? ""]
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : null;
}

function resolveBadgeId(name: string, rawBadgeId: unknown, badgeLookup?: Map<string, string>) {
  const explicitBadgeId = sanitizeDisplayText(rawBadgeId);
  if (explicitBadgeId) {
    return { badge_id: explicitBadgeId, generated: false };
  }

  const normalizedName = normalizePersonName(name);
  const knownBadgeId = normalizedName ? badgeLookup?.get(normalizedName) : undefined;
  if (knownBadgeId) {
    return { badge_id: knownBadgeId, generated: false };
  }

  const fallback = `pdf-${normalizedName.toLowerCase().replace(/\s+/g, "-").slice(0, 48) || "sin-id"}`;
  return { badge_id: fallback, generated: true };
}

function detectWorkPost(text: string, workPosts: string[]): string {
  const haystack = normalizePersonName(text);
  return workPosts.find((post) => haystack.includes(normalizePersonName(post))) ?? workPosts[0];
}

function mapFlatRows(rawRows: Record<string, unknown>[], options: ParseScheduleOptions): ParsedScheduleRow[] {
  return dedupeRows(
    rawRows
      .map((row) => {
        const employeeName = sanitizeDisplayText(row["nombre"] ?? row["Nombre"] ?? row["employee_name"] ?? row["Empleado"] ?? row["vigilante"] ?? row["Vigilante"]);
        const scheduleDate = normalizeDateValue(row["fecha"] ?? row["Fecha"] ?? row["schedule_date"]);
        if (!employeeName || !scheduleDate) {
          return null;
        }

        const badge = resolveBadgeId(
          employeeName,
          row["dni"] ?? row["DNI"] ?? row["badge_id"] ?? row["DNI/Placa"] ?? row["placa"],
          options.badgeLookup,
        );

        return {
          employee_name: employeeName,
          badge_id: badge.badge_id,
          work_post: sanitizeDisplayText(row["puesto"] ?? row["Puesto"] ?? row["work_post"]) || options.workPosts[0],
          schedule_date: scheduleDate,
          shift_start: normalizeTimeValue(row["hora_inicio"] ?? row["Hora Inicio"] ?? row["shift_start"], "08:00"),
          shift_end: normalizeTimeValue(row["hora_fin"] ?? row["Hora Fin"] ?? row["shift_end"], "20:00"),
          notes: buildNotes(row["notas"] ?? row["Notas"] ?? row["notes"], badge.generated),
        } satisfies ParsedScheduleRow;
      })
      .filter((row): row is ParsedScheduleRow => Boolean(row)),
  );
}

function parseExcelSchedule(bytes: Uint8Array, options: ParseScheduleOptions): ParsedScheduleRow[] {
  const workbook = XLSX.read(bytes, {
    type: "array",
    cellDates: true,
    cellText: true,
    codepage: 65001,
  });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  return mapFlatRows(jsonRows, options);
}

function parseCsvSchedule(bytes: Uint8Array, options: ParseScheduleOptions): ParsedScheduleRow[] {
  const utf8Text = new TextDecoder("utf-8").decode(bytes);
  const text = utf8Text.includes("�") ? new TextDecoder("iso-8859-1").decode(bytes) : utf8Text;
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return [];
  }

  const rows = lines.slice(1).map((line) => {
    const cols = line.split(/[,;]/).map((col) => sanitizeDisplayText(col.replace(/^"|"$/g, "")));
    return {
      employee_name: cols[0],
      badge_id: cols[1],
      work_post: cols[2],
      schedule_date: cols[3],
      shift_start: cols[4],
      shift_end: cols[5],
      notes: cols[6],
    } satisfies Record<string, unknown>;
  });

  return mapFlatRows(rows, options);
}

async function parsePdfSchedule(bytes: Uint8Array, options: ParseScheduleOptions): Promise<ParsedScheduleRow[]> {
  const pdfjs = await loadPdfJs();
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const allRows: ParsedScheduleRow[] = [];
  let fallbackMonthYear: PdfMonthYear | null = null;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const tokens: PdfToken[] = textContent.items
      .filter((item): item is { str: string; transform: number[]; width?: number; height?: number } => "str" in item)
      .map((item) => ({
        str: sanitizeDisplayText(item.str),
        x: item.transform[4],
        y: item.transform[5],
        width: Number(item.width ?? 0),
        height: Math.abs(Number(item.height ?? item.transform[3] ?? 0)),
        page: pageNumber,
      }))
      .filter((item) => item.str);

    const pageText = tokens.map((token) => token.str).join(" ");
    fallbackMonthYear = detectMonthYear(pageText) ?? fallbackMonthYear;
    const monthYear = detectMonthYear(pageText) ?? fallbackMonthYear ?? getCurrentMonthYear();
    const workPost = detectWorkPost(pageText, options.workPosts);

    allRows.push(...extractAssignmentsFromPage(tokens, monthYear, workPost, options.badgeLookup));
  }

  const legibleLetters = (allRows.map((row) => row.employee_name).join(" ").match(/[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/g) || []).length;
  if (allRows.length === 0 || legibleLetters < 10) {
    throw new Error("No se pudo leer la tabla del PDF. Sube un PDF con texto seleccionable o usa Excel/CSV.");
  }

  return dedupeRows(allRows);
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjs;
}

function detectMonthYear(text: string): PdfMonthYear | null {
  const normalized = normalizePersonName(text);
  const monthEntry = Object.entries(SPANISH_MONTHS).find(([monthName]) => normalized.includes(monthName));
  const yearMatch = normalized.match(/\b20\d{2}\b/);

  if (monthEntry && yearMatch) {
    return { month: monthEntry[1], year: Number(yearMatch[0]) };
  }

  const numericDateMatch = normalized.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/);
  if (numericDateMatch) {
    return { month: Number(numericDateMatch[2]), year: Number(numericDateMatch[3]) };
  }

  return null;
}

function getCurrentMonthYear(): PdfMonthYear {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function clusterRows(tokens: PdfToken[], tolerance = 2.5): PdfRow[] {
  const sorted = [...tokens].sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const rows: PdfRow[] = [];

  for (const token of sorted) {
    const row = rows.find((candidate) => Math.abs(candidate.y - token.y) <= tolerance);
    if (row) {
      row.items.push(token);
      row.y = (row.y + token.y) / 2;
    } else {
      rows.push({ y: token.y, items: [token] });
    }
  }

  return rows
    .map((row) => ({ ...row, items: row.items.sort((a, b) => a.x - b.x) }))
    .sort((a, b) => b.y - a.y);
}

function joinTokensBySpacing(items: PdfToken[]): string {
  return items.reduce((text, item, index) => {
    if (index === 0) {
      return item.str;
    }

    const previous = items[index - 1];
    const gap = item.x - (previous.x + previous.width);
    const separator = gap <= Math.max(1.5, previous.height * 0.18) ? "" : " ";
    return `${text}${separator}${item.str}`;
  }, "");
}

function looksLikeEmployeeName(value: string): boolean {
  const cleaned = sanitizeDisplayText(value).toUpperCase();
  const letters = (cleaned.match(/[A-ZÁÉÍÓÚÑÜ]/g) || []).length;

  if (letters < 4 || cleaned.length < 4 || cleaned.length > 48) {
    return false;
  }

  if (!HUMAN_NAME_REGEX.test(cleaned)) {
    return false;
  }

  return !IGNORED_NAME_TERMS.some((term) => cleaned.includes(term));
}

function findDayHeader(rows: PdfRow[]) {
  const candidates = rows
    .map((row) => {
      const dayItems = row.items
        .filter((item) => /^\d{1,2}$/.test(item.str))
        .map((item) => ({ ...item, day: Number(item.str) }))
        .filter((item) => item.day >= 1 && item.day <= 31)
        .sort((a, b) => a.x - b.x);

      const uniqueDayItems = dayItems.filter((item, index, list) => index === 0 || Math.abs(item.x - list[index - 1].x) > 2);
      return uniqueDayItems.length >= 7 ? { y: row.y, dayItems: uniqueDayItems } : null;
    })
    .filter((candidate): candidate is { y: number; dayItems: Array<PdfToken & { day: number }> } => Boolean(candidate))
    .sort((a, b) => b.dayItems.length - a.dayItems.length || b.y - a.y);

  return candidates[0] ?? null;
}

function extractAssignmentsFromPage(
  tokens: PdfToken[],
  monthYear: PdfMonthYear,
  workPost: string,
  badgeLookup?: Map<string, string>,
): ParsedScheduleRow[] {
  const rows = clusterRows(tokens);
  const header = findDayHeader(rows);
  if (!header) {
    return [];
  }

  const firstDayX = header.dayItems[0]?.x ?? 0;
  const dayGaps = header.dayItems.slice(1).map((item, index) => item.x - header.dayItems[index].x).filter((gap) => gap > 0);
  const averageGap = dayGaps.length > 0 ? dayGaps.reduce((sum, gap) => sum + gap, 0) / dayGaps.length : 18;
  const matchThreshold = Math.max(8, averageGap * 0.55);

  return rows
    .filter((row) => row.y < header.y - 4)
    .flatMap((row) => {
      const nameItems = row.items.filter((item) => item.x < firstDayX - 4);
      const name = sanitizeDisplayText(joinTokensBySpacing(nameItems));
      if (!looksLikeEmployeeName(name)) {
        return [];
      }

      const shifts = row.items
        .filter((item) => item.x >= firstDayX - 2)
        .map((item) => ({ ...item, code: sanitizeDisplayText(item.str) }))
        .filter((item) => item.code === "06" || item.code === "18")
        .map((item) => {
          const nearestDay = header.dayItems
            .map((dayItem) => ({ day: dayItem.day, distance: Math.abs(dayItem.x - item.x) }))
            .sort((a, b) => a.distance - b.distance)[0];

          if (!nearestDay || nearestDay.distance > matchThreshold) {
            return null;
          }

          const badge = resolveBadgeId(name, "", badgeLookup);
          const shiftHours = SHIFT_HOURS[item.code as keyof typeof SHIFT_HOURS];

          return {
            employee_name: name,
            badge_id: badge.badge_id,
            work_post: workPost,
            schedule_date: `${monthYear.year}-${String(monthYear.month).padStart(2, "0")}-${String(nearestDay.day).padStart(2, "0")}`,
            shift_start: shiftHours.shift_start,
            shift_end: shiftHours.shift_end,
            notes: buildNotes(null, badge.generated, `Importado desde PDF (${item.code})`),
          } satisfies ParsedScheduleRow;
        })
        .filter((item): item is ParsedScheduleRow => Boolean(item));

      const seenByDay = new Set<string>();
      return shifts.filter((shift) => {
        const key = `${shift.schedule_date}-${shift.shift_start}`;
        if (seenByDay.has(key)) {
          return false;
        }
        seenByDay.add(key);
        return true;
      });
    });
}

function normalizeDateValue(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = sanitizeDisplayText(value);
  if (!text) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const numericDate = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (numericDate) {
    const day = numericDate[1].padStart(2, "0");
    const month = numericDate[2].padStart(2, "0");
    const rawYear = numericDate[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month}-${day}`;
  }

  return text;
}

function normalizeTimeValue(value: unknown, fallback: string): string {
  const text = sanitizeDisplayText(value);
  if (!text) {
    return fallback;
  }

  const timeMatch = text.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  if (/^\d{1,2}$/.test(text)) {
    return `${text.padStart(2, "0")}:00`;
  }

  return fallback;
}

function dedupeRows(rows: ParsedScheduleRow[]): ParsedScheduleRow[] {
  const uniqueRows = new Map<string, ParsedScheduleRow>();

  rows.forEach((row) => {
    const key = [normalizePersonName(row.employee_name), row.badge_id, row.schedule_date, row.shift_start, row.shift_end].join("|");
    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  });

  return [...uniqueRows.values()].sort((a, b) => {
    if (a.schedule_date !== b.schedule_date) {
      return a.schedule_date.localeCompare(b.schedule_date);
    }
    return a.employee_name.localeCompare(b.employee_name, "es");
  });
}

export const __scheduleImportUtils = {
  extractAssignmentsFromPage,
  normalizePersonName,
};