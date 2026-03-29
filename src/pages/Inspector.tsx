import { useState, useEffect, useRef } from "react";
import { ShieldCheck, RefreshCw, FileDown, FileSpreadsheet, CalendarDays, Upload } from "lucide-react";
import logoImg from "@/assets/logo-pycseca.jpg";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV, type TimeEntry } from "@/lib/time-clock";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const WORK_POSTS = [
  "Logística Guadalajara",
  "Planta Industrial Castilla",
  "Centro Comercial Azuqueca",
  "Sede PYCSECA",
];

const INSPECTOR_PASSWORD = "admin123";

export default function Inspector() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const scheduleFileRef = useRef<HTMLInputElement>(null);

  const handleScheduleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        await processScheduleRows(jsonRows.map((r) => ({
          employee_name: r["nombre"] || r["Nombre"] || r["employee_name"] || "",
          badge_id: String(r["dni"] || r["DNI"] || r["badge_id"] || r["DNI/Placa"] || ""),
          work_post: r["puesto"] || r["Puesto"] || r["work_post"] || WORK_POSTS[0],
          schedule_date: r["fecha"] || r["Fecha"] || r["schedule_date"] || "",
          shift_start: r["hora_inicio"] || r["Hora Inicio"] || r["shift_start"] || "08:00",
          shift_end: r["hora_fin"] || r["Hora Fin"] || r["shift_end"] || "20:00",
          notes: r["notas"] || r["Notas"] || r["notes"] || null,
        })));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) { toast.error("CSV vacío o sin datos"); return; }
        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
          if (cols.length < 4) continue;
          rows.push({
            employee_name: cols[0],
            badge_id: cols[1],
            work_post: cols[2] || WORK_POSTS[0],
            schedule_date: cols[3],
            shift_start: cols[4] || "08:00",
            shift_end: cols[5] || "20:00",
            notes: cols[6] || null,
          });
        }
        await processScheduleRows(rows);
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const processScheduleRows = async (rows: any[]) => {
    const valid = rows.filter((r) => r.employee_name && r.badge_id && r.schedule_date);
    if (valid.length === 0) { toast.error("No se encontraron filas válidas"); return; }
    const { error } = await supabase.from("monthly_schedule").upsert(valid, {
      onConflict: "badge_id,schedule_date",
    });
    if (error) {
      toast.error("Error al importar: " + error.message);
    } else {
      toast.success(`${valid.length} asignaciones importadas al cuadrante`);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("time_entries")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(500);

    if (data) {
      setEntries(
        data.map((r: any) => ({
          id: r.id,
          employeeName: r.employee_name,
          badgeId: r.badge_id,
          workPost: r.work_post ?? "",
          type: r.type as "entrada" | "salida",
          timestamp: r.timestamp,
          location: { lat: r.latitude, lng: r.longitude },
          notes: r.notes ?? undefined,
          signature: r.signature ?? undefined,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === INSPECTOR_PASSWORD) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-lg text-center">
          <img src={logoImg} alt="PYCSECA" className="mx-auto mb-4 h-16 w-auto object-contain" />
          <h1 className="text-lg font-bold text-primary mb-1">Panel del Inspector</h1>
          <p className="text-xs text-muted-foreground mb-6">Introduce la contraseña para acceder</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
            placeholder="Contraseña"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-3"
          />
          {passwordError && <p className="text-xs text-destructive mb-3">Contraseña incorrecta</p>}
          <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Acceder
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="PYCSECA" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary">Panel del Inspector</h1>
              <p className="text-xs text-muted-foreground">PYCSECA - Control de Presencia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              ← Volver a fichaje
            </Link>
            <Link
              to="/cuadrante"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Cuadrante
            </Link>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            {entries.length > 0 && (
              <>
                <button
                  onClick={() => exportToCSV(entries)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Exportar CSV
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const weekEntries = entries.filter((e) => new Date(e.timestamp) >= weekAgo);
                    const rows = (weekEntries.length > 0 ? weekEntries : entries).map((e) => {
                      const d = new Date(e.timestamp);
                      return {
                        Tipo: e.type === "entrada" ? "Entrada" : "Salida",
                        Nombre: e.employeeName,
                        "DNI/Placa": e.badgeId,
                        Puesto: e.workPost || "",
                        Fecha: d.toLocaleDateString("es-ES"),
                        Hora: d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                        Incidencia: e.notes || "",
                        Firma: e.signature ? "Sí" : "No",
                      };
                    });
                    const ws = XLSX.utils.json_to_sheet(rows);
                    ws["!cols"] = [{ wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 6 }];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Fichajes");
                    XLSX.writeFile(wb, `informe_fichajes_${now.toISOString().slice(0, 10)}.xlsx`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Descargar informe en Excel
                </button>
              </>
            )}
          </div>
        </header>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total fichajes", value: entries.length },
            { label: "Entradas", value: entries.filter((e) => e.type === "entrada").length },
            { label: "Salidas", value: entries.filter((e) => e.type === "salida").length },
            { label: "Con incidencia", value: entries.filter((e) => e.notes).length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">DNI/Placa</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Puesto</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Hora</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Incidencia</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Firma</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando fichajes…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No hay fichajes registrados
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const d = new Date(e.timestamp);
                  return (
                    <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            e.type === "entrada"
                              ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {e.type === "entrada" ? "Entrada" : "Salida"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{e.employeeName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.badgeId}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.workPost || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                        {e.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.signature ? "✅" : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
