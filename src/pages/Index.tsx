import { useState, useEffect } from "react";
import { Clock, User, BadgeCheck, FileDown, AlertTriangle } from "lucide-react";
import ClockButtons from "@/components/ClockButtons";
import HistoryTable from "@/components/HistoryTable";
import SignaturePad from "@/components/SignaturePad";
import { getEntries, addEntry, requestLocation, exportToCSV, type TimeEntry } from "@/lib/time-clock";
import { toast } from "sonner";

export default function Index() {
  const [name, setName] = useState(() => localStorage.getItem("employee-name") ?? "");
  const [badgeId, setBadgeId] = useState(() => localStorage.getItem("employee-badge") ?? "");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [showSignature, setShowSignature] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const validate = () => {
    if (!name.trim()) {
      toast.error("Introduce tu nombre antes de fichar");
      return false;
    }
    if (!badgeId.trim()) {
      toast.error("Introduce tu nº de placa o DNI");
      return false;
    }
    return true;
  };

  const handleClock = async (type: "entrada" | "salida") => {
    if (!validate()) return;
    setLoading(true);
    localStorage.setItem("employee-name", name.trim());
    localStorage.setItem("employee-badge", badgeId.trim());

    const location = await requestLocation();
    if (!location) {
      toast.error("Geolocalización obligatoria. Activa el GPS y permite el acceso a ubicación.");
      setLoading(false);
      return;
    }

    if (type === "salida") {
      setPendingLocation(location);
      setShowSignature(true);
      setLoading(false);
      return;
    }

    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      employeeName: name.trim(),
      badgeId: badgeId.trim(),
      type,
      timestamp: new Date().toISOString(),
      location,
      notes: notes.trim() || undefined,
    };

    const updated = addEntry(entry);
    setEntries(updated);
    setNotes("");
    setLoading(false);
    toast.success(`¡Entrada registrada, ${name.trim()}!`);
  };

  const handleSignatureSave = (dataUrl: string) => {
    setShowSignature(false);
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      employeeName: name.trim(),
      badgeId: badgeId.trim(),
      type: "salida",
      timestamp: new Date().toISOString(),
      location: pendingLocation!,
      notes: notes.trim() || undefined,
      signature: dataUrl,
    };

    const updated = addEntry(entry);
    setEntries(updated);
    setNotes("");
    setPendingLocation(null);
    toast.success(`¡Salida registrada y firmada, ${name.trim()}!`);
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
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">Seguridad Privada</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
            {now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </header>

        {/* Employee fields */}
        <div
          className="mb-6 space-y-3"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 100ms forwards", opacity: 0 }}
        >
          <div>
            <label htmlFor="employee-name" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" /> Nombre del vigilante
            </label>
            <input
              id="employee-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carlos López"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base font-medium placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20"
            />
          </div>
          <div>
            <label htmlFor="badge-id" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BadgeCheck className="h-4 w-4" /> Nº Placa / DNI
            </label>
            <input
              id="badge-id"
              type="text"
              value={badgeId}
              onChange={(e) => setBadgeId(e.target.value)}
              placeholder="Ej: 12345678A"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base font-medium placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20"
            />
          </div>
        </div>

        {/* Incident notes */}
        <div
          className="mb-6"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 170ms forwards", opacity: 0 }}
        >
          <label htmlFor="notes" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Incidencias (opcional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Relevo con retraso de 15 min"
            rows={2}
            maxLength={500}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20 resize-none"
          />
        </div>

        {/* GPS indicator */}
        <div
          className="mb-4 flex items-center gap-2 rounded-xl bg-secondary/60 px-4 py-2.5 text-xs text-muted-foreground"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 220ms forwards", opacity: 0 }}
        >
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
          Geolocalización obligatoria — se capturarán las coordenadas GPS al fichar
        </div>

        {/* Clock buttons */}
        <div style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 270ms forwards", opacity: 0 }}>
          <ClockButtons onClock={handleClock} loading={loading} />
        </div>

        {/* History */}
        <div
          className="mt-10"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 400ms forwards", opacity: 0 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimos fichajes</h2>
            {entries.length > 0 && (
              <button
                onClick={() => exportToCSV(entries)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground active:scale-[0.97]"
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            )}
          </div>
          <HistoryTable entries={entries} />
        </div>
      </div>

      {showSignature && (
        <SignaturePad
          onSave={handleSignatureSave}
          onCancel={() => { setShowSignature(false); setPendingLocation(null); }}
        />
      )}
    </div>
  );
}
