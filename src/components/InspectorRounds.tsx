import { useState, useEffect } from "react";
import { Shield, FileDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GUARDS } from "@/lib/guards";

interface Round {
  id: string;
  badge_id: string;
  employee_name: string;
  start_time: string;
  end_time: string | null;
  start_latitude: number;
  start_longitude: number;
  end_latitude: number | null;
  end_longitude: number | null;
  notes: string | null;
  status: string;
}

export default function InspectorRounds() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterGuard, setFilterGuard] = useState("");

  const fetchRounds = async () => {
    setLoading(true);
    let query = supabase
      .from("security_rounds")
      .select("*")
      .order("start_time", { ascending: false })
      .limit(200);

    if (filterDate) {
      const start = `${filterDate}T00:00:00`;
      const end = `${filterDate}T23:59:59`;
      query = query.gte("start_time", start).lte("start_time", end);
    }

    if (filterGuard) {
      query = query.eq("badge_id", filterGuard);
    }

    const { data } = await query;
    setRounds((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRounds();
  }, [filterDate, filterGuard]);

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "En curso";
    const mins = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  };

  const exportCSV = () => {
    const header = "Vigilante,Placa,Fecha,Hora Inicio,Hora Fin,Duración,Estado,Notas";
    const rows = rounds.map((r) => {
      const s = new Date(r.start_time);
      const e = r.end_time ? new Date(r.end_time) : null;
      return [
        `"${r.employee_name}"`,
        `"${r.badge_id}"`,
        s.toLocaleDateString("es-ES"),
        s.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        e ? e.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—",
        formatDuration(r.start_time, r.end_time),
        r.status === "active" ? "En curso" : "Completada",
        `"${(r.notes ?? "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rondas_${filterDate || "todas"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Shield className="h-4 w-4 text-primary" />
          Rondas de Seguridad
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
          />
          <select
            value={filterGuard}
            onChange={(e) => setFilterGuard(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Todos los vigilantes</option>
            {GUARDS.map((g) => (
              <option key={g.badgeId} value={g.badgeId}>{g.name}</option>
            ))}
          </select>
          <button
            onClick={fetchRounds}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </button>
          {rounds.length > 0 && (
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              <FileDown className="h-3 w-3" />
              CSV
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Vigilante</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Inicio</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fin</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Duración</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Notas</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Cargando rondas…</td></tr>
            ) : rounds.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay rondas registradas</td></tr>
            ) : (
              rounds.map((r) => {
                const s = new Date(r.start_time);
                const e = r.end_time ? new Date(r.end_time) : null;
                return (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{r.employee_name}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {s.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {e ? e.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDuration(r.start_time, r.end_time)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        r.status === "active"
                          ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {r.status === "active" ? "En curso" : "Completada"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{r.notes || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
