import { describe, expect, it } from "vitest";
import { __scheduleImportUtils, type ParsedScheduleRow } from "@/lib/schedule-import";

describe("schedule import utilities", () => {
  it("normaliza correctamente nombres españoles", () => {
    expect(__scheduleImportUtils.normalizePersonName("Muñoz Álvarez")).toBe("MUNOZ ALVAREZ");
  });

  it("extrae nombres y turnos desde tokens de PDF", () => {
    const rows = __scheduleImportUtils.extractAssignmentsFromPage(
      [
        { str: "1", x: 210, y: 700, width: 8, height: 12, page: 1 },
        { str: "2", x: 250, y: 700, width: 8, height: 12, page: 1 },
        { str: "MORALES", x: 16, y: 660, width: 55, height: 12, page: 1 },
        { str: "FRAILE", x: 78, y: 660, width: 45, height: 12, page: 1 },
        { str: "06", x: 210, y: 660, width: 10, height: 12, page: 1 },
        { str: "18", x: 250, y: 660, width: 10, height: 12, page: 1 },
        { str: "NAVARRO", x: 16, y: 640, width: 60, height: 12, page: 1 },
        { str: "RAPOSO", x: 84, y: 640, width: 48, height: 12, page: 1 },
        { str: "18", x: 210, y: 640, width: 10, height: 12, page: 1 },
      ],
      { month: 3, year: 2026 },
      "Sede PYCSECA",
      new Map([
        ["MORALES FRAILE", "MF-01"],
        ["NAVARRO RAPOSO", "NR-02"],
      ]),
    ) as ParsedScheduleRow[];

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          employee_name: "MORALES FRAILE",
          badge_id: "MF-01",
          schedule_date: "2026-03-01",
          shift_start: "06:00",
          shift_end: "18:00",
        }),
        expect.objectContaining({
          employee_name: "MORALES FRAILE",
          badge_id: "MF-01",
          schedule_date: "2026-03-02",
          shift_start: "18:00",
          shift_end: "06:00",
        }),
        expect.objectContaining({
          employee_name: "NAVARRO RAPOSO",
          badge_id: "NR-02",
          schedule_date: "2026-03-01",
          shift_start: "18:00",
          shift_end: "06:00",
        }),
      ]),
    );
  });
});