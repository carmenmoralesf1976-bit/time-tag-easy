import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Upload, RefreshCw, AlertTriangle } from "lucide-react";
import logoImg from "@/assets/logo-pycseca.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const WORK_POSTS = [
  "Logística Guadalajara",
  "Planta Industrial Castilla",
  "Centro Comercial Azuqueca",
  "Sede PYCSECA",
];

const VIGILANTES = [
  { name: "MORALES FRAILE, MARIA DEL CARMEN", badgeId: "5504" },
  { name: "NAVARRO RAPOSO, JOAQUIN", badgeId: "5506" },
  { name: "MORENO GARCIA, OSCAR", badgeId: "5499" },
  { name: "ROTARIU, MARINELA", badgeId: "5505" },
];

interface ScheduleEntry {
  id: string;
  employee_name: string;
  badge_id: string;
  work_post: string;
  schedule_date: string;
  shift_start: string;
  shift_end: string;
  notes: string | null;
}

export default function Schedule() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Form state
  const [formVigilante, setFormVigilante] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formPost, setFormPost] = useState(WORK_POSTS[0]);
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("08:00");
  const [formEnd, setFormEnd] = useState("20:00");
  const [formNotes, setFormNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVigilanteChange = (value: string) => {
    setFormVigilante(value);
    const found = VIGILANTES.find((v) => v.name === value);
    setFormBadge(found ? found.badgeId : "");
  };

  const fetchSchedule = async () => {
    setLoading(true);
    const startDate = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const endDate = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;

    const { data } = await supabase
      .from("monthly_schedule")
      .select("*")
      .gte("schedule_date", startDate)
      .lte("schedule_date", endDate)
      .order("schedule_date", { ascending: true })
      .order("employee_name", { ascending: true });

    if (data) setEntries(data as ScheduleEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchSchedule(); }, [month]);

  const addEntry = async () => {
    if (!formName.trim() || !formBadge.trim() || !formDate) {
      toast.error("Rellena nombre, DNI/placa y fecha");
      return;
    }
    const { error } = await supabase.from("monthly_schedule").upsert(
      {
        employee_name: formName.trim(),
        badge_id: formBadge.trim(),
        work_post: formPost,
        schedule_date: formDate,
        shift_start: formStart,
        shift_end: formEnd,
        notes: formNotes.trim() || null,
      },
      { onConflict: "badge_id,schedule_date" }
    );
    if (error) {
      toast.error("Error al guardar: " + error.message);
      return;
    }
    toast.success("Asignación guardada");
    setFormName(""); setFormBadge(""); setFormDate(""); setFormNotes("");
    fetchSchedule();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("monthly_schedule").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Asignación eliminada");
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { toast.error("CSV vacío o sin datos"); return; }

      // Expected: nombre,dni,puesto,fecha,hora_inicio,hora_fin,notas
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

      if (rows.length === 0) { toast.error("No se encontraron filas válidas"); return; }

      const { error } = await supabase.from("monthly_schedule").upsert(rows, {
        onConflict: "badge_id,schedule_date",
      });

      if (error) {
        toast.error("Error al importar: " + error.message);
      } else {
        toast.success(`${rows.length} asignaciones importadas`);
        fetchSchedule();
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Group by date
  const grouped = entries.reduce<Record<string, ScheduleEntry[]>>((acc, e) => {
    (acc[e.schedule_date] ??= []).push(e);
    return acc;
  }, {});
  // Sort each day's entries by shift_start ascending
  Object.values(grouped).forEach((list) =>
    list.sort((a, b) => a.shift_start.localeCompare(b.shift_start))
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="PYCSECA" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-primary">Cuadrante Mensual</h1>
              <p className="text-xs text-muted-foreground">PYCSECA - Control de Presencia</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/inspector"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              ← Panel Inspector
            </Link>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
            />
            <button
              onClick={fetchSchedule}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Upload className="h-3.5 w-3.5" />
              Importar CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </div>
        </header>

        {/* Add Form */}
        <div className="mb-8 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Añadir asignación</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <input
              placeholder="Nombre del vigilante"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 outline-none focus:ring-2 ring-ring/20"
            />
            <input
              placeholder="DNI / Placa"
              value={formBadge}
              onChange={(e) => setFormBadge(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 outline-none focus:ring-2 ring-ring/20"
            />
            <select
              value={formPost}
              onChange={(e) => setFormPost(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring/20"
            >
              {WORK_POSTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring/20"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Inicio:</label>
              <input
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring/20 flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Fin:</label>
              <input
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 ring-ring/20 flex-1"
              />
            </div>
            <input
              placeholder="Notas (opcional)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 outline-none focus:ring-2 ring-ring/20"
            />
            <button
              onClick={addEntry}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Añadir
            </button>
          </div>
        </div>

        {/* CSV format hint */}
        <div className="mb-6 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
          <strong>Formato CSV:</strong> nombre, dni, puesto, fecha (YYYY-MM-DD), hora_inicio (HH:MM), hora_fin (HH:MM), notas
        </div>

        {/* Schedule Table */}
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Cargando cuadrante…</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay asignaciones para este mes</p>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {new Date(date + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <div className="rounded-xl border border-border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Vigilante</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">DNI/Placa</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Puesto</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Horario</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Notas</th>
                      <th className="px-4 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{s.employee_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.badge_id}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{s.work_post}</td>
                        <td className="px-4 py-2.5 font-mono text-muted-foreground">
                          {s.shift_start.slice(0, 5)} – {s.shift_end.slice(0, 5)}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-[150px] truncate">{s.notes || "—"}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => deleteEntry(s.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
