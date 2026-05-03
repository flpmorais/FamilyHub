import type { PackingStatus } from "../types/packing.types";

const PRIMARY_MAP: Record<PackingStatus, PackingStatus> = {
  new: "buy",
  buy: "ready",
  ready: "packed",
  issue: "ready",
  last_minute: "packed",
  packed: "packed",
};

const SECONDARY_MAP: Record<PackingStatus, PackingStatus | null> = {
  new: "buy",
  ready: "issue",
  buy: "issue",
  issue: null,
  last_minute: null,
  packed: null,
};

/** Primary swipe-left action: advance to the next logical status. */
export function nextStatus(current: PackingStatus): PackingStatus {
  return PRIMARY_MAP[current];
}

/** Secondary swipe-right action: flag as buy or issue. Returns null if no secondary action. */
export function secondaryStatus(current: PackingStatus): PackingStatus | null {
  return SECONDARY_MAP[current];
}
