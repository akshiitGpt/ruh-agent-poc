"use client";

// Sidebar sections for standalone agents/workflows the user has added from
// the marketplace. Lives in localStorage, so this refreshes on the shared
// change event fired by addMyAgent/removeMyAgent — no reload needed.

import { useEffect, useState } from "react";
import Link from "next/link";
import { galleryItems } from "@/lib/builderData";
import { getMyAgents, onMyAgentsChange } from "@/lib/myAgents";

export function MyAgentsSidebar({ userId }: { userId: string }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getMyAgents(userId));
    return onMyAgentsChange(() => setIds(getMyAgents(userId)));
  }, [userId]);

  const items = ids
    .map((id) => galleryItems.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));
  const agents = items.filter((i) => i.kind === "agent");
  const workflows = items.filter((i) => i.kind === "workflow");

  if (items.length === 0) return null;

  return (
    <>
      {agents.length > 0 && <Section label="Agents" items={agents} glyph="◆" />}
      {workflows.length > 0 && (
        <Section label="Workflows" items={workflows} glyph="◫" />
      )}
      <Link
        href="/agents"
        className="mt-1 block px-3 py-1 font-mono text-[10px] text-faint hover:text-accent"
      >
        Manage my agents →
      </Link>
    </>
  );
}

function Section({
  label,
  items,
  glyph,
}: {
  label: string;
  items: { id: string; name: string }[];
  glyph: string;
}) {
  return (
    <>
      <p className="mt-6 mb-2 px-3 text-xs font-medium tracking-wide text-faint uppercase">
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map((i) => (
          <Link
            key={i.id}
            href={`/agents/${i.id}`}
            className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-panel2 hover:text-ink"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-panel2 font-mono text-[10px] text-muted">
              {glyph}
            </span>
            <span className="flex-1 truncate">{i.name}</span>
            <span className="text-xs text-faint opacity-0 transition-opacity group-hover:opacity-100">
              ↗
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
