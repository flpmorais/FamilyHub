import type { Vacation, VacationLifecycle } from "../types/vacation.types";

export const LIFECYCLE_LABEL: Record<VacationLifecycle, string> = {
  planning: "Planeamento",
  upcoming: "Próxima",
  active: "Em curso",
  packing: "Embalamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const LIFECYCLE_COLOR: Record<VacationLifecycle, string> = {
  planning: "#888888",
  upcoming: "#E67E22",
  active: "#27AE60",
  packing: "#795548",
  completed: "#6A1B9A",
  cancelled: "#9E9E9E",
};

/** Sort order for vacation lists: active first, then packing, upcoming, planning, completed/cancelled last. */
export const LIFECYCLE_ORDER: VacationLifecycle[] = [
  "active",
  "packing",
  "upcoming",
  "planning",
  "completed",
  "cancelled",
];

export function formatDatePt(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Sort vacations by lifecycle order, then departure date newest first. */
export function sortVacations(vacations: Vacation[]): Vacation[] {
  return [...vacations].sort((a, b) => {
    const orderA = LIFECYCLE_ORDER.indexOf(a.lifecycle);
    const orderB = LIFECYCLE_ORDER.indexOf(b.lifecycle);
    if (orderA !== orderB) return orderA - orderB;
    return b.departureDate.localeCompare(a.departureDate);
  });
}
