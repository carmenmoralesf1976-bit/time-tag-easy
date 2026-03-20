import type { TimeEntry } from "@/lib/time-clock";
import { MapPin, FileSignature, MessageSquare } from "lucide-react";

interface HistoryTableProps {
  entries: TimeEntry[];
}

export default function HistoryTable({ entries }: HistoryTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground text-sm">Sin fichajes todavía</p>
        <p className="text-muted-foreground/60 mt-1 text-xs">Pulsa Entrada o Salida para registrar tu primer fichaje</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empleado</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Placa/DNI</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hora</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">GPS</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Info</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 20).map((entry, i) => {
              const d = new Date(entry.timestamp);
              return (
                <tr
                  key={entry.id}
                  className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30"
                  style={{ animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms forwards`, opacity: 0 }}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        entry.type === "entrada"
                          ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {entry.type === "entrada" ? "Entrada" : "Salida"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.employeeName}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{entry.badgeId}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    {entry.location ? (
                      <a
                        href={`https://maps.google.com/?q=${entry.location.lat},${entry.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MapPin className="h-3 w-3" />
                        Ver
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {entry.notes && (
                        <span title={entry.notes} className="text-muted-foreground hover:text-foreground cursor-help">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {entry.signature && (
                        <span title="Fichaje firmado" className="text-[hsl(var(--success))]">
                          <FileSignature className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
