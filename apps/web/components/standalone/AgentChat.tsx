"use client";

// Standalone agent chat — ChatGPT-style: conversation list on the left
// (persisted in localStorage), streaming chat on the right. No suite, no
// task page — just the agent on the shared runtime.

import { useEffect, useRef, useState } from "react";
import type { GalleryItem } from "@/lib/builderData";
import type { ToolCallSpec } from "@/lib/data";
import { renderLite } from "@/components/suite/renderLite";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

interface Convo {
  id: string;
  title: string;
  messages: Msg[];
  updatedAt: number;
}

export function AgentChat({
  item,
  userId,
  streamChunks,
  toolCalls,
}: {
  item: GalleryItem;
  userId: string;
  streamChunks: string[];
  toolCalls: ToolCallSpec[];
}) {
  const KEY = `ruh_convos_${userId}_${item.id}`;
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // load + persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Convo[];
        setConvos(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
      }
    } catch {}
    setLoaded(true);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [KEY]);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(convos));
  }, [convos, loaded, KEY]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [convos, activeId]);

  const active = convos.find((c) => c.id === activeId) ?? null;

  function buildScript(): string {
    const frags: string[] = [];
    streamChunks.forEach((chunk, i) => {
      for (const tc of toolCalls.filter((t) => t.afterChunk === i))
        frags.push(`⚙ ${tc.name} ${tc.detail}\n`);
      frags.push(chunk);
    });
    return frags.join("") || `(${item.name} has no canned reply in this PoC.)`;
  }

  function send(e?: React.FormEvent, override?: string) {
    e?.preventDefault();
    const text = (override ?? input).trim();
    if (!text || busy) return;
    setInput("");

    let convoId = activeId;
    if (!convoId || !convos.some((c) => c.id === convoId)) {
      convoId = `c${Date.now().toString(36)}`;
      const fresh: Convo = {
        id: convoId,
        title: text.length > 42 ? text.slice(0, 42) + "…" : text,
        messages: [],
        updatedAt: Date.now(),
      };
      setConvos((cs) => [fresh, ...cs]);
      setActiveId(convoId);
    }

    const id = convoId;
    setConvos((cs) =>
      cs.map((c) =>
        c.id === id
          ? {
              ...c,
              messages: [...c.messages, { role: "user", text }, { role: "assistant", text: "" }],
              updatedAt: Date.now(),
            }
          : c
      )
    );

    const words = buildScript().split(/(?<=\s)/);
    let i = 0;
    setBusy(true);
    timer.current = setInterval(() => {
      i += 3;
      const done = i >= words.length;
      const textNow = words.slice(0, i).join("");
      setConvos((cs) =>
        cs.map((c) =>
          c.id === id
            ? {
                ...c,
                messages: c.messages.map((m, mi) =>
                  mi === c.messages.length - 1 ? { ...m, text: textNow } : m
                ),
                updatedAt: Date.now(),
              }
            : c
        )
      );
      if (done) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setBusy(false);
      }
    }, 40);
  }

  function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConvos((cs) => cs.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="flex h-[76vh] overflow-hidden rounded-2xl border border-line bg-panel">
      {/* conversation list */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-line">
        <div className="border-b border-line p-3">
          <button
            onClick={() => setActiveId(null)}
            className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-85"
          >
            + New chat
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {convos.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                c.id === activeId ? "bg-panel2 font-medium" : "text-muted hover:bg-panel2/60"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              <span
                onClick={(e) => remove(c.id, e)}
                className="hidden shrink-0 rounded p-0.5 text-[10px] text-faint group-hover:block hover:text-err"
                title="Delete conversation"
              >
                ✕
              </span>
            </button>
          ))}
          {loaded && convos.length === 0 && (
            <p className="px-3 py-4 text-xs text-faint">
              No conversations yet. They're saved to your account automatically.
            </p>
          )}
        </div>
        <p className="border-t border-line px-3 py-2.5 font-mono text-[10px] text-faint">
          {convos.length} saved conversation{convos.length === 1 ? "" : "s"}
        </p>
      </aside>

      {/* chat pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-6">
          {!active && (
            <div className="mx-auto mt-16 max-w-md text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft font-display text-lg font-bold text-accent">
                {item.name[0]}
              </span>
              <h2 className="mb-2 font-display text-xl font-semibold tracking-tight">
                Chat with {item.name}
              </h2>
              <p className="mb-5 text-sm text-muted">{item.description}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestFor(item).map((s) => (
                  <button
                    key={s}
                    onClick={() => send(undefined, s)}
                    className="rounded-full border border-line bg-bg px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {active?.messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft font-display text-[11px] font-bold text-accent">
                  {item.name[0]}
                </span>
              )}
              {m.role === "user" ? (
                <div className="max-w-[75%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-bg">
                  {m.text}
                </div>
              ) : (
                <div className="min-w-0 max-w-[85%] text-muted">
                  {m.text ? renderLite(m.text, `${active.id}-${i}`) : null}
                  {busy && i === active.messages.length - 1 && <span className="caret ml-0.5" />}
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${item.name}…`}
            className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none placeholder:text-faint focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}

function suggestFor(item: GalleryItem): string[] {
  switch (item.id) {
    case "ticket-summariser":
      return ["Summarise AB-284", "What's blocking AB-291?"];
    case "pr-reviewer":
      return ["Review gateway#1142", "Any risky changes in this PR?"];
    case "channel-digest":
      return ["Digest #platform-eng for today"];
    case "answer-bot":
      return ["How do suite subdomains authenticate?"];
    case "meeting-notes":
      return ["Here's today's standup transcript — summarise it"];
    case "issue-triager":
      return ["Triage the new issues"];
    case "update-notifier":
      return ["What changed in my inbox?"];
    default:
      return [`Try ${item.name}`];
  }
}
