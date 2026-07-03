"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { galleryItems } from "@/lib/builderData";
import { getMyAgents, removeMyAgent, onMyAgentsChange } from "@/lib/myAgents";

export function MyAgentsList({ userId }: { userId: string }) {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIds(getMyAgents(userId));
    setLoaded(true);
    return onMyAgentsChange(() => setIds(getMyAgents(userId)));
  }, [userId]);

  const items = ids
    .map((id) => galleryItems.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  if (!loaded) return null;

  if (items.length === 0) {
    return (
      <div className="rise mx-auto mt-12 max-w-md rounded-2xl border border-dashed border-line bg-panel p-8 text-center">
        <p className="mb-2 text-2xl">▣</p>
        <h2 className="mb-2 font-display text-lg font-semibold">
          Nothing here yet
        </h2>
        <p className="mb-4 text-sm text-muted">
          Add any agent or workflow from the gallery and use it on its own —
          no suite required.
        </p>
        <Link
          href="/marketplace"
          className="inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-bg"
        >
          Browse the marketplace →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="rise flex flex-col rounded-2xl border border-line bg-panel p-5"
          style={{ animationDelay: `${80 + i * 50}ms` }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase ${
                item.kind === "workflow"
                  ? "bg-run-soft text-run"
                  : "bg-accent-soft text-accent"
              }`}
            >
              {item.kind === "workflow" ? "◫ workflow" : "◆ agent"}
            </span>
            <button
              onClick={() => setIds(removeMyAgent(userId, item.id))}
              className="rounded p-1 text-xs text-faint hover:bg-err-soft hover:text-err"
              title="Remove from my account"
            >
              ✕
            </button>
          </div>
          <h3 className="font-display text-base font-semibold">{item.name}</h3>
          <p className="mt-1 mb-4 text-sm text-muted">{item.description}</p>
          <Link
            href={`/agents/${item.id}`}
            className="mt-auto rounded-lg bg-ink px-4 py-2.5 text-center text-sm font-semibold text-bg transition-opacity hover:opacity-85"
          >
            {item.kind === "agent" ? "Open chat →" : "Open runner →"}
          </Link>
        </div>
      ))}
    </div>
  );
}
