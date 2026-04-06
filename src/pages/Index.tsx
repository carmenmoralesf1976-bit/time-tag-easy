import { useState, useEffect } from "react";
import { User, BadgeCheck, Building2, CalendarDays, LogOut, LogIn, LogOut as LogOutIcon, Flashlight, ClipboardEdit, CheckCircle2, Clock } from "lucide-react";
import logoImg from "@/assets/logo-pycseca.jpg";
import { GUARDS, WORK_POST } from "@/lib/guards";
import SignaturePad from "@/components/SignaturePad";
import RoundControls from "@/components/RoundControls";
import IncidentForm from "@/components/IncidentForm";
import HistoryTable from "@/components/HistoryTable";
import { supabase } from "@/integrations/supabase/client";
import { getEntries, addEntry, requestLocation, exportToCSV, type TimeEntry } from "@/lib/time-clock";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import ServiceStatus from "@/components/ServiceStatus";
import GuardInfo from "@/components/GuardInfo";
import ActionGrid from "@/components/ActionGrid";

export default function Index() {
  const { user, badgeId: authBadgeId, signOut } = useAuth();
  const guard = GUARDS.find((g) => g.badgeId === authBadgeId);
  const name = guard?.name ?? "";
  const badgeId = guard?.badgeId ?? authBadgeId ?? "";
  const workPost = WORK_POST;

  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [showSignature, setShowSignature] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [todayAssignment, setTodayAssignment] = useState<{ work_post: string; shift_start: string; shift_end: string } | null>(null);
  const [hasClockedIn, setHasClockedIn] = useState(false);
  const [activeView, setActiveView] = useState<"main" | "round" | "incident">("main");

  // Check if guard has clocked in today
  useEffect(() => {
    if (!badgeId) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("time_entries")
      .select("id")
      .eq("badge_id", badgeId)
      .eq("type", "entrada")
      .gte("timestamp", `${today}T00:00:00`)
      .lte("timestamp", `${today}T23:59:59`)
      .limit(1)
      .then(({ data }) => setHasClockedIn(!!(data && data.length > 0)));
  }, [badgeId, entries]);

  // Fetch today's assignment
  useEffect(() => {
    if (!badgeId) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("monthly_schedule")
      .select("work_post, shift_start, shift_end")
      .eq("badge_id", badgeId)
      .eq("schedule_date", today)
      .maybeSingle()
      .then(({ data }) => setTodayAssignment(data as any ?? null));
  }, [badgeId]);

  useEffect(() => {
    getEntries().then(setEntries);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleClock = async (type: "entrada" | "salida") => {
    if (!gdprAccepted) {
      toast.error("Debes aceptar la política de protección de datos para fichar");
      return;
    }
    setLoading(true);

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
      employeeName: name,
      badgeId,
      workPost,
      type,
      timestamp: new Date().toISOString(),
      location,
      notes: notes.trim() || undefined,
    };

    const updated = await addEntry(entry);
    setEntries(updated);
    setNotes("");
    setLoading(false);
    toast.success(`¡Entrada registrada, ${name}!`);
  };

  const handleSignatureSave = async (dataUrl: string) => {
    setShowSignature(false);
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      employeeName: name,
      badgeId,
      workPost,
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
    toast.success(`¡Salida registrada y firmada, ${name}!`);
  };

  const myEntries = entries.filter((e) => e.badgeId === badgeId);

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <nav className="sticky top-0 z-30 bg-primary shadow-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="PYCSECA" className="h-9 w-auto rounded-md object-contain bg-white/90 p-0.5" />
            <div>
              <h1 className="text-sm font-bold text-primary-foreground leading-tight">PYCSECA</h1>
              <p className="text-[10px] text-primary-foreground/60 font-medium">Control de Presencia</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/20"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Date & time */}
        <div className="mb-5 text-center" style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}>
          <p className="text-sm text-muted-foreground capitalize">
            {now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="mt-0.5 text-4xl font-bold tabular-nums tracking-tight text-foreground">
            {now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>

        {/* Service status */}
        <ServiceStatus hasClockedIn={hasClockedIn} guardName={name} />

        {/* Today's assignment */}
        {todayAssignment && (
          <div
            className="mb-5 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3"
            style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 80ms forwards", opacity: 0 }}
          >
            <CalendarDays className="h-5 w-5 text-accent-foreground shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">{todayAssignment.work_post}</span>
              <span className="text-muted-foreground ml-2">
                {todayAssignment.shift_start.slice(0, 5)} – {todayAssignment.shift_end.slice(0, 5)}
              </span>
            </div>
          </div>
        )}

        {/* Guard info compact */}
        <GuardInfo name={name} badgeId={badgeId} workPost={workPost} />

        {/* GDPR + GPS compact bar */}
        <div
          className="mb-5 space-y-2"
          style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 160ms forwards", opacity: 0 }}
        >
          <label className="flex items-start gap-3 cursor-pointer select-none rounded-2xl border border-border bg-card px-4 py-3">
            <input
              type="checkbox"
              checked={gdprAccepted}
              onChange={(e) => setGdprAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-2 border-input accent-primary cursor-pointer shrink-0"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              Acepto la <strong className="text-foreground">política de protección de datos</strong> y el registro GPS conforme al RGPD.
            </span>
          </label>
          <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse shrink-0" />
            GPS obligatorio — coordenadas capturadas al fichar
          </div>
        </div>

        {/* Main view toggle */}
        {activeView === "main" && (
          <div style={{ animation: "scale-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            {/* ACTION GRID - Mosaic layout */}
            <ActionGrid
              onEntrada={() => handleClock("entrada")}
              onSalida={() => handleClock("salida")}
              onRonda={() => setActiveView("round")}
              onIncidencia={() => setActiveView("incident")}
              loading={loading}
              disabled={!gdprAccepted}
            />

            {/* Incident notes */}
            <div className="mt-5">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Incidencias al fichar (opcional)…"
                rows={2}
                maxLength={500}
                className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20 resize-none"
              />
            </div>
          </div>
        )}

        {activeView === "round" && (
          <div style={{ animation: "scale-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <button
              onClick={() => setActiveView("main")}
              className="mb-3 text-sm font-medium text-primary hover:underline"
            >
              ← Volver al panel
            </button>
            <RoundControls />
          </div>
        )}

        {activeView === "incident" && (
          <div style={{ animation: "scale-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}>
            <button
              onClick={() => setActiveView("main")}
              className="mb-3 text-sm font-medium text-primary hover:underline"
            >
              ← Volver al panel
            </button>
            <IncidentForm />
          </div>
        )}

        {/* History */}
        <div
          className="mt-8"
          style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 300ms forwards", opacity: 0 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Mis fichajes</h2>
            {myEntries.length > 0 && (
              <button
                onClick={() => exportToCSV(myEntries)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted active:scale-[0.97]"
              >
                Exportar CSV
              </button>
            )}
          </div>
          <HistoryTable entries={myEntries} />
        </div>

        {/* Footer */}
        <footer className="mt-8 pb-6 text-center">
          <p className="text-[11px] leading-relaxed text-muted-foreground/50 max-w-sm mx-auto">
            Al fichar, el trabajador acepta el registro de su ubicación GPS exclusivamente para fines de control laboral según la LOPD.
          </p>
        </footer>
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
