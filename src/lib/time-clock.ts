export interface TimeEntry {
  id: string;
  employeeName: string;
  type: "entrada" | "salida";
  timestamp: string;
  location?: { lat: number; lng: number } | null;
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
      { timeout: 8000, enableHighAccuracy: true }
    );
  });
}
