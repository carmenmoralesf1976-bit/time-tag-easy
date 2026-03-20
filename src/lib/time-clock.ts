export interface TimeEntry {
  id: string;
  employeeName: string;
  badgeId: string;
  type: "entrada" | "salida";
  timestamp: string;
  location: { lat: number; lng: number };
  notes?: string;
  signature?: string;
}

const STORAGE_KEY = "time-clock-entries";

export function getEntries(): TimeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addEntry(entry: TimeEntry): TimeEntry[] {
  const entries = [entry, ...getEntries()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries;
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
  const header = "Tipo,Empleado,Placa/DNI,Fecha,Hora,Latitud,Longitud,Incidencia,Firma";
  const rows = entries.map((e) => {
    const d = new Date(e.timestamp);
    return [
      e.type,
      `"${e.employeeName}"`,
      `"${e.badgeId}"`,
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
