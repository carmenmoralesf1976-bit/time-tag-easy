import { useState, useEffect } from "react";
import { Clock, User } from "lucide-react";
import ClockButtons from "@/components/ClockButtons";
import HistoryTable from "@/components/HistoryTable";
import { getEntries, addEntry, requestLocation, type TimeEntry } from "@/lib/time-clock";
import { toast } from "sonner";

export default function Index() {
  const [name, setName] = useState(() => localStorage.getItem("employee-name") ?? "");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleClock = async (type: "entrada" | "salida") => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Introduce tu nombre antes de fichar");
      return;
    }
    setLoading(true);
    localStorage.setItem("employee-name", trimmed);

    const location = await requestLocation();

    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      employeeName: trimmed,
      type,
      timestamp: new Date().toISOString(),
      location,
    };

    const updated = addEntry(entry);
    setEntries(updated);
    setLoading(false);

    toast.success(
      type === "entrada" ? `¡Entrada registrada, ${trimmed}!` : `¡Salida registrada, ${trimmed}!`
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        {/* Header */}
        <header
          className="mb-8 text-center"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards" }}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Clock className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
            Control de Fichaje
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
            {now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </header>

        {/* Name input */}
        <div
          className="mb-6"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards", opacity: 0 }}
        >
          <label htmlFor="employee-name" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4" />
            Nombre del empleado
          </label>
          <input
            id="employee-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: María García"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base font-medium placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20"
          />
        </div>

        {/* Clock buttons */}
        <div style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 200ms forwards", opacity: 0 }}>
          <ClockButtons onClock={handleClock} loading={loading} />
        </div>

        {/* History */}
        <div
          className="mt-10"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 350ms forwards", opacity: 0 }}
        >
          <h2 className="mb-4 text-lg font-semibold">Últimos fichajes</h2>
          <HistoryTable entries={entries} />
        </div>
      </div>
    </div>
  );
}
