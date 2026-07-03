"use client";

// Which gallery items the current user has added to their account,
// persisted in localStorage. Seeded with two items for the demo.

const KEY = "ruh_my_agents";
const SEED = ["ticket-summariser", "escalation-flow"];

export function getMyAgents(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  if (raw === null) {
    localStorage.setItem(KEY, JSON.stringify(SEED));
    return [...SEED];
  }
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function addMyAgent(id: string): string[] {
  const cur = getMyAgents();
  const next = cur.includes(id) ? cur : [...cur, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function removeMyAgent(id: string): string[] {
  const next = getMyAgents().filter((x) => x !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
