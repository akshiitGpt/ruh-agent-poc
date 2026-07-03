"use client";

import { useEffect, useRef, useState } from "react";
import type { Suite, Task } from "@/lib/data";
import { renderLite } from "@/components/suite/renderLite";

interface ChatMsg {
  id: number;
  role: "user" | "assistant";
  text: string;
  run?: { taskName: string; kind: string; status: "running" | "succeeded" };
  chips?: string[];
}

let msgId = 0;

function matchTask(text: string, suite: Suite): Task | undefined {
  const q = text.toLowerCase();
  let best: Task | undefined;
  let bestScore = 0;
  for (const task of suite.tasks) {
    let score = 0;
    for (const word of task.name.toLowerCase().split(/\s+/)) {
      if (word.length > 3 && q.includes(word)) score += 2;
    }
    for (const word of task.slug.split("-")) {
      if (word.length > 3 && q.includes(word)) score += 1;
    }
    if (task.kind === "workflow" && /\b(run|start|kick|trigger)\b/.test(q)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = task;
    }
  }
  // strong hints
  if (!best || bestScore < 2) {
    if (/\b[A-Z]{1,5}-\d+\b/i.test(text) && suite.slug === "linear")
      return suite.tasks.find((t) => t.slug === "summarize-ticket");
    if (/\bpr\b|pull request|review/i.test(q) && suite.slug === "github")
      return suite.tasks.find((t) => t.slug === "pr-reviewer");
    if (/digest|channel/.test(q) && suite.slug === "slack")
      return suite.tasks.find((t) => t.slug === "channel-digest");
  }
  return bestScore >= 2 ? best : undefined;
}

function buildScript(task: Task): string[] {
  // sequence of markdown fragments appended over time
  if (task.kind === "workflow" && task.nodes) {
    return [
      `Starting **${task.name}**…\n\n`,
      ...task.nodes.map((n) => `- ✓ **${n.label}** — ${n.result}\n`),
      `\n**Done.** All ${task.nodes.length} nodes completed.`,
    ];
  }
  const frags: string[] = [`On it — running **${task.name}**.\n\n`];
  task.streamChunks.forEach((chunk, i) => {
    for (const tc of task.toolCalls.filter((t) => t.afterChunk === i)) {
      frags.push(`⚙ ${tc.name} ${tc.detail}\n`);
    }
    frags.push(chunk);
  });
  return frags;
}

export function SuiteChat({
  suite,
  userInitials,
}: {
  suite: Suite;
  userInitials: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => stop(), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  function stop() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  const suggestions =
    suite.slug === "linear"
      ? ["Summarise ticket AB-284", "Run ticket to code for rate limiting", "Any new updates?"]
      : suite.slug === "github"
        ? ["Review PR gateway#1142", "Run release notes for v0.4.0", "Triage new issues"]
        : ["Digest #platform-eng for today", "Run standup now", "How do subdomains authenticate?"];

  function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { id: ++msgId, role: "user", text }]);

    const task = matchTask(text, suite);
    if (!task) {
      setMessages((m) => [
        ...m,
        {
          id: ++msgId,
          role: "assistant",
          text: `I can run any task in the **${suite.name}** for you — just describe what you need, or pick one:`,
          chips: suite.tasks.map((t) => `Run ${t.name.toLowerCase()}`),
        },
      ]);
      return;
    }

    const script = buildScript(task);
    const id = ++msgId;
    setBusy(true);
    setMessages((m) => [
      ...m,
      {
        id,
        role: "assistant",
        text: "",
        run: { taskName: task.name, kind: task.kind, status: "running" },
      },
    ]);

    // word-level reveal across the whole script
    const words = script.join("").split(/(?<=\s)/);
    let idx = 0;
    const pace = task.kind === "workflow" ? 6 : 3;
    timer.current = setInterval(() => {
      idx += pace;
      const done = idx >= words.length;
      const textNow = words.slice(0, idx).join("");
      setMessages((m) =>
        m.map((msg) =>
          msg.id === id
            ? {
                ...msg,
                text: textNow,
                run: msg.run && { ...msg.run, status: done ? "succeeded" : "running" },
              }
            : msg
        )
      );
      if (done) {
        stop();
        setBusy(false);
      }
    }, 50);
  }

  return (
    <>
      {open && (
        <div className="drawer-in fixed right-6 bottom-24 z-40 flex max-h-[70vh] w-[380px] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
          <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg font-display text-xs font-bold text-white"
              style={{ background: suite.hue }}
            >
              {suite.glyph}
            </span>
            <div className="flex-1 leading-tight">
              <p className="font-display text-sm font-semibold">
                Ask {suite.name}
              </p>
              <p className="font-mono text-[10px] text-faint">
                chat triggers the same agents &amp; workflows
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-xs text-faint hover:bg-panel2 hover:text-ink"
              aria-label="Close chat"
            >
              ✕
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div>
                <p className="mb-3 text-sm text-muted">
                  Tell me what to do in plain language — I&apos;ll run the right
                  task and stream the result here.
                </p>
                <div className="flex flex-col items-start gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-line bg-panel2/60 px-3.5 py-1.5 text-left text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-2.5">
                {msg.role === "assistant" ? (
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-display text-[10px] font-bold text-white"
                    style={{ background: suite.hue }}
                  >
                    {suite.glyph}
                  </span>
                ) : (
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-[10px] font-semibold text-accent">
                    {userInitials}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {msg.run && (
                    <span
                      className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] ${
                        msg.run.status === "running"
                          ? "bg-run-soft text-run"
                          : "bg-ok-soft text-ok"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full bg-current ${msg.run.status === "running" ? "pulse-dot" : ""}`}
                      />
                      {msg.run.kind} · {msg.run.taskName} ·{" "}
                      {msg.run.status === "running" ? "running" : "succeeded"}
                    </span>
                  )}
                  <div className="text-muted">
                    {msg.text ? renderLite(msg.text, String(msg.id)) : null}
                    {msg.run?.status === "running" && <span className="caret ml-0.5" />}
                  </div>
                  {msg.chips && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.chips.map((c) => (
                        <button
                          key={c}
                          onClick={() => send(c)}
                          className="rounded-full border border-line bg-panel2/60 px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${suite.name}…`}
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => {
                  stop();
                  setBusy(false);
                  setMessages((m) =>
                    m.map((msg) =>
                      msg.run?.status === "running"
                        ? { ...msg, run: { ...msg.run, status: "succeeded" } }
                        : msg
                    )
                  );
                }}
                className="rounded-lg border border-err bg-err-soft px-3 py-2 font-mono text-xs text-err"
              >
                ■
              </button>
            ) : (
              <button
                type="submit"
                className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-85"
              >
                ↑
              </button>
            )}
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-6 bottom-6 z-40 flex items-center gap-2.5 rounded-full border border-line bg-panel py-2.5 pr-5 pl-2.5 shadow-2xl transition-transform hover:-translate-y-0.5"
        aria-label={`Ask ${suite.name}`}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold text-white"
          style={{ background: suite.hue }}
        >
          {suite.glyph}
        </span>
        <span className="text-sm font-medium">
          {open ? "Close" : `Ask ${suite.name.replace(" Suite", "")}`}
        </span>
        {!open && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />}
      </button>
    </>
  );
}
