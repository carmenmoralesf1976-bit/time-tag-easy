import { useState, useEffect } from "react";
import { Clock, User, BadgeCheck, FileDown, AlertTriangle, ShieldCheck, Building2, CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClockButtons from "@/components/ClockButtons";
import HistoryTable from "@/components/HistoryTable";
import { Link } from "react-router-dom";
import SignaturePad from "@/components/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { getEntries, addEntry, requestLocation, exportToCSV, type TimeEntry } from "@/lib/time-clock";
import { toast } from "sonner";

export default function Index() {
  const [name, setName] = useState(() => localStorage.getItem("employee-name") ?? "");
  const [badgeId, setBadgeId] = useState(() => localStorage.getItem("employee-badge") ?? "");
  const [workPost, setWorkPost] = useState(() => localStorage.getItem("employee-work-post") ?? "");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [showSignature, setShowSignature] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [todayAssignment, setTodayAssignment] = useState<{ work_post: string; shift_start: string; shift_end: string } | null>(null);

  // Fetch today's assignment based on badge_id
  useEffect(() => {
    if (!badgeId.trim()) { setTodayAssignment(null); return; }
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("monthly_schedule")
      .select("work_post, shift_start, shift_end")
      .eq("badge_id", badgeId.trim())
      .eq("schedule_date", today)
      .maybeSingle()
      .then(({ data }) => {
        setTodayAssignment(data as any ?? null);
      });
  }, [badgeId]);

  useEffect(() => {
    getEntries().then(setEntries);
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
    if (!workPost.trim()) {
      toast.error("Introduce tu puesto de trabajo");
      return false;
    }
    if (!gdprAccepted) {
      toast.error("Debes aceptar la política de protección de datos para fichar");
      return false;
    }
    return true;
  };

  const handleClock = async (type: "entrada" | "salida") => {
    if (!validate()) return;
    setLoading(true);
    localStorage.setItem("employee-name", name.trim());
    localStorage.setItem("employee-badge", badgeId.trim());
    localStorage.setItem("employee-work-post", workPost.trim());

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
      workPost: workPost.trim(),
      type,
      timestamp: new Date().toISOString(),
      location,
      notes: notes.trim() || undefined,
    };

    const updated = await addEntry(entry);
    setEntries(updated);
    setNotes("");
    setLoading(false);
    toast.success(`¡Entrada registrada, ${name.trim()}!`);
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setShowSignature(false);
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      employeeName: name.trim(),
      badgeId: badgeId.trim(),
      workPost: workPost.trim(),
      type: "salida",
      timestamp: new Date().toISOString(),
      location: pendingLocation!,
      notes: notes.trim() || undefined,
      signature: dataUrl,
    };

    const updated = await addEntry(entry);
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

        {/* Today's assignment banner */}
        {todayAssignment && (
          <div
            className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3"
            style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 50ms forwards", opacity: 0 }}
          >
            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">Tu servicio de hoy es en {todayAssignment.work_post}</span>
              <span className="text-muted-foreground ml-2">
                ({todayAssignment.shift_start.slice(0, 5)} – {todayAssignment.shift_end.slice(0, 5)})
              </span>
            </div>
          </div>
        )}

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
          <div>
            <label htmlFor="work-post" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" /> Puesto de trabajo
            </label>
            <Select value={workPost} onValueChange={(val) => setWorkPost(val)}>
              <SelectTrigger className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base font-medium ring-ring/20 focus:ring-2 focus:border-foreground/20 h-auto">
                <SelectValue placeholder="Selecciona un puesto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Logística Guadalajara">Logística Guadalajara</SelectItem>
                <SelectItem value="Planta Industrial Castilla">Planta Industrial Castilla</SelectItem>
                <SelectItem value="Centro Comercial Azuqueca">Centro Comercial Azuqueca</SelectItem>
                <SelectItem value="Sede PYCSECA">Sede PYCSECA</SelectItem>
              </SelectContent>
            </Select>
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

        {/* GDPR Checkbox */}
        <div
          className="mb-4 rounded-xl border border-border bg-card p-4"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 210ms forwards", opacity: 0 }}
        >
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={gdprAccepted}
              onChange={(e) => setGdprAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-2 border-input accent-primary cursor-pointer shrink-0"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-[hsl(var(--success))]" />
              He leído y acepto la <strong className="text-foreground">política de protección de datos</strong> y el registro de geolocalización para el control horario, conforme al RGPD y la normativa vigente.
            </span>
          </label>
        </div>

        {/* GPS indicator */}
        <div
          className="mb-4 flex items-center gap-2 rounded-xl bg-secondary/60 px-4 py-2.5 text-xs text-muted-foreground"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 250ms forwards", opacity: 0 }}
        >
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
          Geolocalización obligatoria — se capturarán las coordenadas GPS al fichar
        </div>

        {/* Clock buttons */}
        <div style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 300ms forwards", opacity: 0 }}>
          <ClockButtons onClock={handleClock} onDelay={() => {
            if (!validate()) return;
            const msg = `⚠️ ${name.trim()} (${badgeId.trim()}) avisa de RETRASO en ${workPost.trim()} — ${new Date().toLocaleTimeString("es-ES")}`;
            setNotes((prev) => prev ? `${prev}\n${msg}` : msg);
            toast.warning("Aviso de retraso registrado en incidencias");
          }} loading={loading} disabled={!gdprAccepted} />
        </div>

        {/* History */}
        <div
          className="mt-10"
          style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 430ms forwards", opacity: 0 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimos fichajes</h2>
            <div className="flex items-center gap-2">
              <Link
                to="/inspector"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Panel Inspector
              </Link>
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
