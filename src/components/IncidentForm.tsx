import { useState } from "react";
import { ClipboardList, Camera, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GUARDS } from "@/lib/guards";
import { toast } from "sonner";

const INCIDENT_TYPES = ["Intrusión", "Accidente", "Avería", "Anomalía", "Otro"] as const;

export default function IncidentForm() {
  const { badgeId: authBadgeId } = useAuth();
  const guard = GUARDS.find((g) => g.badgeId === authBadgeId);
  const name = guard?.name ?? "";
  const badgeId = guard?.badgeId ?? authBadgeId ?? "";

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>(INCIDENT_TYPES[0]);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("La descripción es obligatoria");
      return;
    }

    setSending(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
      ).catch(() => null);

      if (!pos) {
        toast.error("No se pudo obtener la ubicación GPS");
        setSending(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      let photoUrl: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop();
        const path = `${Date.now()}_${badgeId}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("incident-photos")
          .upload(path, photo);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("incident-photos")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("incident_reports").insert({
        badge_id: badgeId,
        employee_name: name,
        incident_type: type,
        description: description.trim(),
        photo_url: photoUrl,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        user_id: user?.id ?? null,
      });

      if (error) throw error;

      toast.success("Parte de novedad enviado correctamente");
      setDescription("");
      setPhoto(null);
      setType(INCIDENT_TYPES[0]);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Error al enviar el parte");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <ClipboardList className="h-4 w-4" />
        Nuevo Parte de Novedad
      </button>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <ClipboardList className="h-4 w-4 text-primary" />
        Nuevo Parte de Novedad
      </h3>

      {/* Tipo */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de incidencia</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/20 focus:ring-2"
        >
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe la incidencia..."
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 outline-none ring-ring/20 focus:ring-2 resize-none"
        />
      </div>

      {/* Foto */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Foto adjunta (opcional)</label>
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors">
          <Camera className="h-4 w-4" />
          {photo ? photo.name : "Seleccionar foto"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {/* Botones */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar Parte
        </button>
        <button
          onClick={() => { setOpen(false); setDescription(""); setPhoto(null); }}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
