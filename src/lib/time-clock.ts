import { supabase } from "@/integrations/supabase/client";

export interface TimeEntry {
  id: string;
  employeeName: string;
  badgeId: string;
  workPost: string;
  type: "entrada" | "salida";
  timestamp: string;
  location: { lat: number; lng: number };
  notes?: string;
  signature?: string;
}

/** Save entry to Supabase and return latest entries */
export async function addEntry(entry: TimeEntry): Promise<TimeEntry[]> {
  await supabase.from("time_entries").insert({
    id: entry.id,
    employee_name: entry.employeeName,
    badge_id: entry.badgeId,
    work_post: entry.workPost || null,
    type: entry.type,
    timestamp: entry.timestamp,
    latitude: entry.location.lat,
    longitude: entry.location.lng,
    notes: entry.notes ?? null,
    signature: entry.signature ?? null,
    gdpr_accepted: true,
  });

  // Also keep localStorage as offline fallback
  const local = getLocalEntries();
  const updated = [entry, ...local];
  localStorage.setItem("time-clock-entries", JSON.stringify(updated));

  return getEntries();
}

/** Fetch entries from Supabase, fallback to localStorage */
export async function getEntries(): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) {
    return getLocalEntries();
  }

  return data.map((r) => ({
    id: r.id,
    employeeName: r.employee_name,
    badgeId: r.badge_id,
    workPost: r.work_post ?? "",
    type: r.type as "entrada" | "salida",
    timestamp: r.timestamp,
    location: { lat: r.latitude, lng: r.longitude },
    notes: r.notes ?? undefined,
    signature: r.signature ?? undefined,
  }));
}

function getLocalEntries(): TimeEntry[] {
  try {
    const raw = localStorage.getItem("time-clock-entries");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function requestLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

export function exportToCSV(entries: TimeEntry[]): void {
  const header = "Tipo,Empleado,Placa/DNI,Puesto,Fecha,Hora,Latitud,Longitud,Incidencia,Firma";
  const rows = entries.map((e) => {
    const d = new Date(e.timestamp);
    return [
      e.type,
      `"${e.employeeName}"`,
      `"${e.badgeId}"`,
      `"${e.workPost ?? ""}"`,
      d.toLocaleDateString("es-ES"),
      d.toLocaleTimeString("es-ES"),
      e.location?.lat ?? "",
      e.location?.lng ?? "",
      `"${(e.notes ?? "").replace(/"/g, '""')}"`,
      e.signature ? "Sí" : "No",
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fichajes_${new Date().toISOString().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
