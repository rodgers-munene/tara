import type { SaleCreate } from "./api";

export interface QueuedSale {
  id: string;
  payload: SaleCreate;
  timestamp: number;
  cashier_name: string;
}

const QUEUE_KEY = "tara_offline_queue";

export function getQueue(): QueuedSale[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function enqueueSale(payload: SaleCreate, cashier_name: string): QueuedSale {
  const entry: QueuedSale = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    payload,
    timestamp: Date.now(),
    cashier_name,
  };
  const queue = getQueue();
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
}

export function dequeueItem(id: string) {
  const queue = getQueue().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(QUEUE_KEY);
  }
}
