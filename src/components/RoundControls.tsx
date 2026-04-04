import { useState, useEffect } from "react";
import { Shield, MapPin, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requestLocation } from "@/lib/time-clock";
import { useAuth } from "@/contexts/AuthContext";
import { GUARDS } from "@/lib/guards";
import { toast } from "sonner";

interface Round {
  id: string;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  status: string;
}

export default function RoundControls() {
  const { user, badgeId: authBadgeId } = useAuth();
  const guard = GUARDS.find((g) => g.badgeId === authBadgeId);
  const name = guard?.name ?? "";
  const badgeId = guard?.badgeId ?? authBadgeId ?? "";

  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [roundNotes, setRoundNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchActiveRound = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("security_rounds")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (data) {
      setActiveRound(data as any);
      setRoundNotes((data as any).notes ?? "");
    } else {
      setActiveRound(null);
    }
  };

  useEffect(() => {
    fetchActiveRound();
  }, [user]);

  const handleStartRound = async () => {
    setLoading(true);
    const location = await requestLocation();
    if (!location) {
      toast.error("Geolocalización obligatoria para iniciar ronda");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("security_rounds")
      .insert({
        badge_id: badgeId,
        employee_name: name,
        start_latitude: location.lat,
        start_longitude: location.lng,
        user_id: user!.id,
        status: "active",
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Error al iniciar ronda");
    } else {
      setActiveRound(data as any);
      setRoundNotes("");
      toast.success("Ronda iniciada");
    }
    setLoading(false);
  };

  const handleEndRound = async () => {
    if (!activeRound) return;
    setLoading(true);
    const location = await requestLocation();
    if (!location) {
      toast.error("Geolocalización obligatoria para finalizar ronda");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("security_rounds")
      .update({
        end_time: new Date().toISOString(),
        end_latitude: location.lat,
        end_longitude: location.lng,
        notes: roundNotes.trim() || null,
        status: "completed",
      } as any)
      .eq("id", activeRound.id);

    if (error) {
      toast.error("Error al finalizar ronda");
    } else {
      setActiveRound(null);
      setRoundNotes("");
      toast.success("Ronda finalizada");
    }
    setLoading(false);
  };

  const handleSaveNotes = async () => {
    if (!activeRound) return;
    await supabase
      .from("security_rounds")
      .update({ notes: roundNotes.trim() || null } as any)
      .eq("id", activeRound.id);
    toast.success("Notas guardadas");
  };

  const elapsed = activeRound
    ? Math.floor((Date.now() - new Date(activeRound.start_time).getTime()) / 60000)
    : 0;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
        <Shield className="h-4 w-4 text-primary" />
        Rondas de Seguridad
      </h3>

      {!activeRound ? (
        <button
          onClick={handleStartRound}
          disabled={loading}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          {loading ? "Iniciando…" : "Iniciar Ronda"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/30 px-3 py-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
              Ronda en curso
            </span>
            <span className="text-sm font-mono text-muted-foreground">
              {elapsed} min
            </span>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Notas / Incidencias de ronda
            </label>
            <textarea
              value={roundNotes}
              onChange={(e) => setRoundNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Añade notas o incidencias durante la ronda…"
              rows={2}
              maxLength={1000}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/40 outline-none ring-ring/20 transition-shadow focus:ring-2 focus:border-foreground/20 resize-none"
            />
          </div>

          <button
            onClick={handleEndRound}
            disabled={loading}
            className="w-full rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            {loading ? "Finalizando…" : "Finalizar Ronda"}
          </button>
        </div>
      )}
    </div>
  );
}
