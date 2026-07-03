"use client";

import { useState } from "react";
import { suiteUrl } from "@/lib/data";

interface Card {
  slug: string;
  name: string;
  tagline: string;
  hue: string;
  glyph: string;
  tasks: number;
  installed: boolean;
}

export function MarketplaceGrid({
  cards,
  userId,
  canInstall,
}: {
  cards: Card[];
  userId: string;
  canInstall: boolean;
}) {
  const [justInstalled, setJustInstalled] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  function install(card: Card) {
    setJustInstalled((s) => [...s, card.slug]);
    setToast(`${card.name} installed for ${userId} — access at /suite/${card.slug}/${userId}`);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, i) => {
          const installed = c.installed || justInstalled.includes(c.slug);
          return (
            <div
              key={c.slug}
              className="rise group rounded-2xl border border-line bg-panel p-5 shadow-[0_10px_30px_-24px_rgba(33,29,22,0.5)] transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: `${80 + i * 60}ms` }}
            >
              <div className="mb-4 flex items-start justify-between">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
                  style={{ background: c.hue }}
                >
                  {c.glyph}
                </span>
                <span className="rounded-full border border-line bg-bg px-2.5 py-1 font-mono text-[10px] text-faint">
                  {c.tasks} tasks
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight">
                {c.name}
              </h3>
              <p className="mt-1 mb-5 text-sm text-muted">{c.tagline}</p>
              {installed ? (
                <div className="flex items-center gap-2">
                  <a
                    href={suiteUrl(c.slug, userId)}
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
                  onClick={() => install(c)}
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
        })}
      </div>

      {toast && (
        <div className="drawer-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-line bg-ink px-5 py-2.5 font-mono text-xs text-bg shadow-xl">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
