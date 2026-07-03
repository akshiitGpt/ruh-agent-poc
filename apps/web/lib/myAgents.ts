"use client";

// Which gallery items the current user has added to their account,
// persisted in localStorage. Seeded with two items for the demo.

// Namespaced per user id — the PoC has two demo identities sharing one
// browser (Akshit/John), so an unscoped key would leak one user's
// additions into the other's sidebar.
const SEED: Record<string, string[]> = {
  akshit: ["ticket-summariser", "escalation-flow"],
};
export const MY_AGENTS_EVENT = "ruh:my-agents-changed";

function key(userId: string) {
  return `ruh_my_agents_${userId}`;
}

function notify() {
  window.dispatchEvent(new Event(MY_AGENTS_EVENT));
}

export function getMyAgents(userId: string): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key(userId));
  if (raw === null) {
    const seed = SEED[userId] ?? [];
    localStorage.setItem(key(userId), JSON.stringify(seed));
    return [...seed];
  }
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function addMyAgent(userId: string, id: string): string[] {
  const cur = getMyAgents(userId);
  const next = cur.includes(id) ? cur : [...cur, id];
  localStorage.setItem(key(userId), JSON.stringify(next));
  notify();
  return next;
}

export function removeMyAgent(userId: string, id: string): string[] {
  const next = getMyAgents(userId).filter((x) => x !== id);
  localStorage.setItem(key(userId), JSON.stringify(next));
  notify();
  return next;
}

// Subscribe to changes made by any component (same tab). Returns an
// unsubscribe function.
export function onMyAgentsChange(cb: () => void): () => void {
  window.addEventListener(MY_AGENTS_EVENT, cb);
  return () => window.removeEventListener(MY_AGENTS_EVENT, cb);
}
