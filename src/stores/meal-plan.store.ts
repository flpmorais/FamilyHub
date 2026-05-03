import { create } from "zustand";

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toLocalDateString(d);
}

function addWeeks(dateStr: string, weeks: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + weeks * 7);
  return toLocalDateString(date);
}

interface MealPlanState {
  currentWeekStart: string;
  setCurrentWeekStart: (date: string) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToCurrentWeek: () => void;
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  currentWeekStart: getMonday(new Date()),
  setCurrentWeekStart: (date) => set({ currentWeekStart: date }),
  goToNextWeek: () =>
    set({ currentWeekStart: addWeeks(get().currentWeekStart, 1) }),
  goToPreviousWeek: () =>
    set({ currentWeekStart: addWeeks(get().currentWeekStart, -1) }),
  goToCurrentWeek: () => set({ currentWeekStart: getMonday(new Date()) }),
}));

export { getMonday, addWeeks };
