"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { suiteUrl } from "@/lib/data";
import { getMyAgents, addMyAgent, onMyAgentsChange } from "@/lib/myAgents";

interface SuiteCard {
  type: "suite";
  slug: string;
  name: string;
  tagline: string;
  hue: string;
  glyph: string;
  tasks: number;
  installed: boolean;
}

interface ComponentCard {
  type: "agent" | "workflow";
  id: string;
  name: string;
  tagline: string;
  tags: string[];
  version: string;
}

type Card = SuiteCard | ComponentCard;

export function MarketplaceGrid({
  cards,
  userId,
  canInstallSuites,
}: {
  cards: Card[];
  userId: string;
  canInstallSuites: boolean;
}) {
  const [tab, setTab] = useState<"all" | "suite" | "agent" | "workflow">("all");
  const [justInstalled, setJustInstalled] = useState<string[]>([]);
  const [mine, setMine] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMine(getMyAgents(userId));
    return onMyAgentsChange(() => setMine(getMyAgents(userId)));
  }, [userId]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function installSuite(card: SuiteCard) {
    setJustInstalled((s) => [...s, card.slug]);
    flash(`${card.name} installed for ${userId} — access at /suite/${card.slug}/${userId}`);
  }

  function addComponent(card: ComponentCard) {
    addMyAgent(userId, card.id);
    flash(
      `✓ ${card.name} added to your account — ${card.type === "agent" ? "chat with it" : "trigger it"} from the sidebar`
    );
  }

  const counts = {
    all: cards.length,
    suite: cards.filter((c) => c.type === "suite").length,
    agent: cards.filter((c) => c.type === "agent").length,
    workflow: cards.filter((c) => c.type === "workflow").length,
  };
  const shown = tab === "all" ? cards : cards.filter((c) => c.type === tab);

  return (
    <div className="relative">
      <div className="rise mb-5 flex flex-wrap gap-2" style={{ animationDelay: "60ms" }}>
        {(
          [
            ["all", `All (${counts.all})`],
            ["suite", `Suites (${counts.suite})`],
            ["agent", `Agents (${counts.agent})`],
            ["workflow", `Workflows (${counts.workflow})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab === key
                ? "bg-ink font-medium text-bg"
                : "border border-line text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c, i) =>
          c.type === "suite" ? (
            <SuiteTile
              key={c.slug}
              card={c}
              index={i}
              installed={c.installed || justInstalled.includes(c.slug)}
              canInstall={canInstallSuites}
              userId={userId}
              onInstall={() => installSuite(c)}
            />
          ) : (
            <ComponentTile
              key={c.id}
              card={c}
              index={i}
              added={mine.includes(c.id)}
              onAdd={() => addComponent(c)}
            />
          )
        )}
      </div>

      {shown.length === 0 && (
        <p className="py-16 text-center text-sm text-faint">Nothing in this category yet.</p>
      )}

      {toast && (
        <div className="drawer-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-ink px-5 py-2.5 font-mono text-xs text-bg shadow-xl">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

function SuiteTile({
  card,
  index,
  installed,
  canInstall,
  userId,
  onInstall,
}: {
  card: SuiteCard;
  index: number;
  installed: boolean;
  canInstall: boolean;
  userId: string;
  onInstall: () => void;
}) {
  return (
    <div
      className="rise group rounded-2xl border border-line bg-panel p-5 shadow-[0_10px_30px_-24px_rgba(33,29,22,0.5)] transition-transform hover:-translate-y-0.5"
      style={{ animationDelay: `${80 + index * 60}ms` }}
    >
      <div className="mb-4 flex items-start justify-between">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
          style={{ background: card.hue }}
        >
          {card.glyph}
        </span>
        <span className="rounded-full border border-line bg-bg px-2.5 py-1 font-mono text-[10px] text-faint">
          {card.tasks} tasks
        </span>
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight">{card.name}</h3>
      <p className="mt-1 mb-5 text-sm text-muted">{card.tagline}</p>
      {installed ? (
        <div className="flex items-center gap-2">
          <a
            href={suiteUrl(card.slug, userId)}
            className="flex-1 rounded-lg bg-ink px-4 py-2 text-center text-sm font-medium text-bg transition-opacity hover:opacity-85"
          >
            Open suite ↗
          </a>
          <span className="rounded-lg bg-ok-soft px-3 py-2 font-mono text-[10px] text-ok">
            INSTALLED
          </span>
        </div>
      ) : canInstall ? (
        <button
          onClick={onInstall}
          className="w-full rounded-lg border border-line bg-bg px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Install to organisation
        </button>
      ) : (
        <button
          disabled
          title="Only org admins can install suites"
          className="w-full cursor-not-allowed rounded-lg border border-dashed border-line bg-bg px-4 py-2 text-sm text-faint"
        >
          🔒 Admins only
        </button>
      )}
    </div>
  );
}

function ComponentTile({
  card,
  index,
  added,
  onAdd,
}: {
  card: ComponentCard;
  index: number;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <div
      className="rise flex flex-col rounded-2xl border border-line bg-panel p-5 shadow-[0_10px_30px_-24px_rgba(33,29,22,0.5)] transition-transform hover:-translate-y-0.5"
      style={{ animationDelay: `${80 + index * 60}ms` }}
    >
      <div className="mb-4 flex items-start justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold text-white ${
            card.type === "workflow" ? "bg-run" : "bg-accent"
          }`}
        >
          {card.type === "workflow" ? "◫" : "◆"}
        </span>
        <span className="rounded-full border border-line bg-bg px-2.5 py-1 font-mono text-[10px] text-faint">
          {card.type} · {card.version}
        </span>
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight">{card.name}</h3>
      <p className="mt-1 mb-3 text-sm text-muted">{card.tagline}</p>
      <div className="mb-5 flex flex-wrap gap-1">
        {card.tags.map((t) => (
          <span key={t} className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {t}
          </span>
        ))}
      </div>
      {added ? (
        <div className="mt-auto flex items-center gap-2">
          <Link
            href={`/agents/${card.id}`}
            className="flex-1 rounded-lg bg-ink px-4 py-2 text-center text-sm font-medium text-bg transition-opacity hover:opacity-85"
          >
            {card.type === "agent" ? "Open chat →" : "Open runner →"}
          </Link>
          <span className="rounded-lg bg-ok-soft px-3 py-2 font-mono text-[10px] text-ok">
            ADDED
          </span>
        </div>
      ) : (
        <button
          onClick={onAdd}
          className="mt-auto w-full rounded-lg border border-line bg-bg px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          ＋ Add to my account
        </button>
      )}
    </div>
  );
}
