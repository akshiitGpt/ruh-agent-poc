"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GalleryItem } from "@/lib/builderData";
import { getMyAgents, addMyAgent } from "@/lib/myAgents";

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<"all" | "agent" | "workflow">("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [mine, setMine] = useState<string[]>([]);

  useEffect(() => {
    setMine(getMyAgents());
  }, []);

  function addToAccount(item: GalleryItem) {
    setMine(addMyAgent(item.id));
    setToast(
      `✓ ${item.name} added to your account — ${item.kind === "agent" ? "chat with it" : "trigger it"} from My agents`
    );
    setTimeout(() => setToast(null), 3200);
  }

  const shown = items.filter(
    (i) =>
      (filter === "all" || i.kind === filter) &&
      (q === "" ||
        `${i.name} ${i.description} ${i.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
  );

  function reuse(item: GalleryItem) {
    setToast(`✓ ${item.name} ${item.version} added to the current build's plan`);
    setTimeout(() => setToast(null), 3200);
  }

  return (
    <div>
      <div className="rise mb-5 flex flex-wrap items-center gap-2" style={{ animationDelay: "80ms" }}>
        {(["all", "agent", "workflow"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
              filter === f
                ? "bg-ink font-medium text-bg"
                : "border border-line text-muted hover:text-ink"
            }`}
          >
            {f === "all" ? `All (${items.length})` : `${f}s (${items.filter((i) => i.kind === f).length})`}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search agents & workflows…"
          className="ml-auto w-64 rounded-lg border border-line bg-panel px-3.5 py-2 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((item, i) => (
          <div
            key={item.id}
            className="rise flex flex-col rounded-2xl border border-line bg-panel p-5"
            style={{ animationDelay: `${100 + i * 40}ms` }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase ${
                  item.kind === "workflow" ? "bg-run-soft text-run" : "bg-accent-soft text-accent"
                }`}
              >
                {item.kind === "workflow" ? "◫ workflow" : "◆ agent"}
              </span>
              <span className="font-mono text-[10px] text-faint">
                {item.version}
                {item.status === "draft" && " · draft"}
              </span>
            </div>
            <h3 className="font-display text-base font-semibold">{item.name}</h3>
            <p className="mt-1 mb-3 text-sm text-muted">{item.description}</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {item.tags.map((t) => (
                <span key={t} className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-auto border-t border-line pt-3">
              <p className="mb-2.5 text-xs text-faint">
                {item.usedIn.length > 0 ? (
                  <>Used in {item.usedIn.join(" · ")}</>
                ) : (
                  "Not yet in a suite"
                )}
              </p>
              <div className="flex items-center gap-2">
                {mine.includes(item.id) ? (
                  <Link
                    href={`/agents/${item.id}`}
                    className="flex-1 rounded-lg bg-ink px-3 py-2 text-center text-xs font-semibold text-bg transition-opacity hover:opacity-85"
                  >
                    {item.kind === "agent" ? "Open chat →" : "Open runner →"}
                  </Link>
                ) : (
                  <button
                    onClick={() => addToAccount(item)}
                    className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
                  >
                    ＋ Add to my account
                  </button>
                )}
                <button
                  onClick={() => reuse(item)}
                  title="Reuse this component in an agent-builder plan"
                  className="rounded-lg border border-line px-3 py-2 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
                >
                  ↺ Builder
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="py-16 text-center text-sm text-faint">
          Nothing matches “{q}”.
        </p>
      )}

      {toast && (
        <div className="drawer-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-ink px-5 py-2.5 font-mono text-xs text-bg shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
