import { useState, useEffect } from "react";
import { ClipboardList, FileDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GUARDS } from "@/lib/guards";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type Report = {
  id: string;
  badge_id: string;
  employee_name: string;
  incident_type: string;
  description: string;
  photo_url: string | null;
  status: string;
  created_at: string;
};

const STATUS_OPTIONS = ["Pendiente", "En gestión", "Resuelto"] as const;

export default function InspectorIncidents() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterGuard, setFilterGuard] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("incident_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setReports((data as Report[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = reports.filter((r) => {
    const d = r.created_at.slice(0, 10);
    if (filterDate && d !== filterDate) return false;
    if (filterGuard && r.badge_id !== filterGuard) return false;
    return true;
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("incident_reports")
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Error al actualizar estado"); return; }
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    toast.success("Estado actualizado");
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const header = "Vigilante,Placa,Fecha,Hora,Tipo,Descripción,Estado\n";
    const rows = filtered.map((r) => {
      const d = new Date(r.created_at);
      return [
        `"${r.employee_name}"`, r.badge_id,
        d.toLocaleDateString("es-ES"),
        d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        r.incident_type, `"${r.description.replace(/"/g, '""')}"`, r.status,
      ].join(",");
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `partes_novedad_${filterDate || "todos"}.csv`; a.click();
  };

  const statusColor = (s: string) => {
    if (s === "Resuelto") return "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]";
    if (s === "En gestión") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-destructive/15 text-destructive";
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ClipboardList className="h-4 w-4 text-primary" />
          Partes de Novedad
        </h2>
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-lg border border-input bg-background px-2 py-1 text-xs" />
        <select value={filterGuard} onChange={(e) => setFilterGuard(e.target.value)}
          className="rounded-lg border border-input bg-background px-2 py-1 text-xs">
          <option value="">Todos los vigilantes</option>
          {GUARDS.map((g) => <option key={g.badgeId} value={g.badgeId}>{g.name}</option>)}
        </select>
        <button onClick={fetch} disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
        <button onClick={exportCSV}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">
          <FileDown className="h-3 w-3" /> CSV
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Vigilante</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Fecha/Hora</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tipo</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Descripción</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Foto</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Sin partes para esta fecha</td></tr>
            ) : filtered.map((r) => {
              const d = new Date(r.created_at);
              return (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(r)}>
                  <td className="px-3 py-2 font-medium">{r.employee_name}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {d.toLocaleDateString("es-ES")} {d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-2">{r.incident_type}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[250px] truncate">{r.description}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    {r.photo_url ? (
                      <a href={r.photo_url} target="_blank" rel="noopener noreferrer"
                        className="text-primary underline text-xs">Ver</a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold border-0 outline-none cursor-pointer ${statusColor(r.status)}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Parte</DialogTitle>
            <DialogDescription>Información completa de la incidencia</DialogDescription>
          </DialogHeader>
          {selected && (() => {
            const d = new Date(selected.created_at);
            return (
              <div className="space-y-4">
                {selected.photo_url && (
                  <img src={selected.photo_url} alt="Foto de la incidencia"
                    className="w-full max-h-80 object-contain rounded-lg border border-border" />
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Vigilante</p>
                    <p className="font-semibold">{selected.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Placa</p>
                    <p className="font-semibold">{selected.badge_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha</p>
                    <p className="font-semibold">{d.toLocaleDateString("es-ES")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Hora</p>
                    <p className="font-semibold">{d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tipo</p>
                    <p className="font-semibold">{selected.incident_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Estado</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(selected.status)}`}>
                      {selected.status}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Descripción</p>
                  <p className="text-sm leading-relaxed">{selected.description}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
