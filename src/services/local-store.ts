import { seedData } from "./mock-data";
import type { AppData } from "@/types";

const STORAGE_KEY = "event-florist-prototype-v1";

export function loadData(): AppData {
  if (typeof window === "undefined") return seedData;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...seedData, ...JSON.parse(stored) as Partial<AppData> } : seedData;
  } catch {
    return seedData;
  }
}

export function saveData(data: AppData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private browsing, disabled cookies, or a full quota).
    // The workspace keeps working in memory for the current session.
  }
}
