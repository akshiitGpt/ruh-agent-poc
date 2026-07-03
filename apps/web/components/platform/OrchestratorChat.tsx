"use client";

// The orchestrator agent on the ruh.ai dashboard: one chat across every
// installed suite. Ask for status ("what's the update on linear?"), find
// failures, or trigger any suite's task without leaving the dashboard.

import { useEffect, useRef, useState } from "react";
import { runsFor, timeAgo, suiteUrl, type Suite, type Task } from "@/lib/data";
import { renderLite } from "@/components/suite/renderLite";

interface ChatMsg {
  id: number;
  role: "user" | "assistant";
  text: string;
  run?: { suiteName: string; hue: string; taskName: string; status: "running" | "succeeded" };
  chips?: string[];
  link?: { href: string; label: string };
}

type ChatView = "drawer" | "modal" | "panel";

let mid = 0;

function findSuite(q: string, suites: Suite[]): Suite | undefined {
  return suites.find((s) =>
    q.includes(s.slug) || q.includes(s.name.toLowerCase().replace(" suite", ""))
  );
}

function findTask(q: string, suite: Suite): Task | undefined {
  let best: Task | undefined;
  let score = 0;
  for (const t of suite.tasks) {
    let sc = 0;
    for (const w of t.name.toLowerCase().split(/\s+/)) if (w.length > 3 && q.includes(w)) sc += 2;
    for (const w of t.slug.split("-")) if (w.length > 3 && q.includes(w)) sc += 1;
    if (sc > score) { score = sc; best = t; }
  }
  return score >= 2 ? best : undefined;
}

function statusSummary(suite: Suite): string {
  const runs = runsFor(suite.slug).slice(0, 3);
  const lines = runs.map((r) => {
    const task = suite.tasks.find((t) => t.slug === r.task);
    return `- ${r.status === "failed" ? "✕" : "✓"} **${task?.name ?? r.task}** — ${r.summary} (${timeAgo(r.startedAt)})`;
  });
  const scheduled = suite.tasks.filter((t) => t.schedule);
  return [
    `Here's where **${suite.name}** stands:\n`,
    ...lines,
    scheduled.length
      ? `\n${scheduled.length} schedule${scheduled.length > 1 ? "s" : ""} active: ${scheduled.map((t) => `${t.name} (${t.scheduleHuman ?? t.schedule})`).join(", ")}.`
      : "",
  ].join("\n");
}

function taskScript(task: Task, suite: Suite): string[] {
  if (task.kind === "workflow" && task.nodes) {
    return [
      `Routing to **${suite.name}** → starting **${task.name}**…\n\n`,
      ...task.nodes.map((n) => `- ✓ **${n.label}** — ${n.result}\n`),
      `\n**Done.** All ${task.nodes.length} nodes completed.`,
    ];
  }
  const frags = [`Routing to **${suite.name}** → running **${task.name}**.\n\n`];
  task.streamChunks.forEach((chunk, i) => {
    for (const tc of task.toolCalls.filter((t) => t.afterChunk === i))
      frags.push(`⚙ ${tc.name} ${tc.detail}\n`);
    frags.push(chunk);
  });
  return frags;
}

export function OrchestratorChat({
  suites,
  userId,
  userInitials,
}: {
  suites: Suite[];
  userId: string;
  userInitials: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ChatView>("drawer");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open, view]);

  const suggestions = [
    "What's the update on Linear?",
    "Any failed runs today?",
    "Run the Slack standup now",
    "Triage new GitHub issues",
  ].filter((s) => {
    const q = s.toLowerCase();
    const referenced = findSuite(q, suites);
    return !/linear|slack|github/.test(q) || Boolean(referenced);
  });

  function reply(msg: Omit<ChatMsg, "id" | "role">) {
    setMessages((m) => [...m, { id: ++mid, role: "assistant", ...msg }]);
  }

  function stream(script: string[], run?: ChatMsg["run"], link?: ChatMsg["link"]) {
    const id = ++mid;
    setBusy(true);
    setMessages((m) => [...m, { id, role: "assistant", text: "", run, link }]);
    const words = script.join("").split(/(?<=\s)/);
    let i = 0;
    timer.current = setInterval(() => {
      i += 4;
      const done = i >= words.length;
      setMessages((m) =>
        m.map((msg) =>
          msg.id === id
            ? {
                ...msg,
                text: words.slice(0, i).join(""),
                run: msg.run && { ...msg.run, status: done ? "succeeded" : "running" },
              }
            : msg
        )
      );
      if (done) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        setBusy(false);
      }
    }, 45);
  }

  function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { id: ++mid, role: "user", text }]);
    const q = text.toLowerCase();

    // 1 — failed runs across all suites
    if (/fail|error|broke|wrong/.test(q)) {
      const failed = suites
        .flatMap((s) =>
          runsFor(s.slug)
            .filter((r) => r.status === "failed")
            .slice(0, 2)
            .map((r) => ({ s, r }))
        )
        .slice(0, 4);
      reply({
        text:
          failed.length === 0
            ? "No failed runs across your suites today. All green."
            : `${failed.length} failed run${failed.length > 1 ? "s" : ""} across your suites:\n\n` +
              failed
                .map(
                  ({ s, r }) =>
                    `- ✕ **${s.name}** · ${s.tasks.find((t) => t.slug === r.task)?.name ?? r.task} — ${r.summary} (${timeAgo(r.startedAt)})`
                )
                .join("\n") +
              "\n\nOpen the run from the suite's activity table for the full event timeline.",
      });
      return;
    }

    const suite = findSuite(q, suites);

    // 2 — status / update intent
    if (/update|status|standing|happening|summary|progress/.test(q)) {
      if (suite) {
        stream([statusSummary(suite)], undefined, {
          href: suiteUrl(suite.slug, userId),
          label: `Open ${suite.name} ↗`,
        });
      } else {
        const overall = suites
          .map((s) => {
            const last = runsFor(s.slug)[0];
            return `- **${s.name}** — last run: ${last?.summary ?? "no runs yet"} (${last ? timeAgo(last.startedAt) : "—"})`;
          })
          .join("\n");
        stream([`Across your ${suites.length} suites:\n\n${overall}\n\nAsk about any one of them for details.`]);
      }
      return;
    }

    // 3 — trigger a task
    if (suite) {
      const task = findTask(q, suite);
      if (task) {
        stream(
          taskScript(task, suite),
          { suiteName: suite.name, hue: suite.hue, taskName: task.name, status: "running" },
          { href: suiteUrl(suite.slug, userId, `/tasks/${task.slug}`), label: "Open task ↗" }
        );
        return;
      }
      reply({
        text: `**${suite.name}** has these tasks — which one?`,
        chips: suite.tasks.map((t) => `Run ${t.name.toLowerCase()} on ${suite.slug}`),
      });
      return;
    }

    // 4 — fallback
    reply({
      text: `I orchestrate across your ${suites.length} installed suites — ask for status, failures, or trigger any task by name:`,
      chips: suggestions,
    });
  }

  const shellClass =
    view === "drawer"
      ? "drawer-in fixed right-4 bottom-24 left-4 z-40 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl sm:right-6 sm:left-auto sm:w-[400px]"
      : view === "modal"
        ? "drawer-in fixed inset-x-4 top-8 bottom-8 z-50 mx-auto flex w-auto max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
        : "drawer-in fixed inset-y-0 right-0 z-50 flex w-full max-w-[540px] flex-col overflow-hidden border-l border-line bg-panel shadow-2xl sm:my-3 sm:mr-3 sm:rounded-2xl sm:border";

  return (
    <>
      {open && view !== "drawer" && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[45] bg-black/25 backdrop-blur-[1px]"
          aria-label="Close orchestrator chat overlay"
        />
      )}
      {open && (
        <div className={shellClass}>
          <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink font-display text-xs font-bold text-bg">
              ر
            </span>
            <div className="flex-1 leading-tight">
              <p className="font-display text-sm font-semibold">Ask Ruh</p>
              <p className="font-mono text-[10px] text-faint">
                orchestrates across {suites.map((s) => s.name.replace(" Suite", "")).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {view !== "drawer" && (
                <button
                  type="button"
                  onClick={() => setView("drawer")}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-xs text-faint transition-colors hover:border-line hover:bg-panel2 hover:text-ink"
                  aria-label="Return orchestrator chat to compact view"
                  title="Compact view"
                >
                  -
                </button>
              )}
              <button
                type="button"
                onClick={() => setView("modal")}
                className={`flex h-7 w-7 items-center justify-center rounded-md border text-[11px] transition-colors hover:border-line hover:bg-panel2 hover:text-ink ${
                  view === "modal"
                    ? "border-line bg-panel2 text-ink"
                    : "border-transparent text-faint"
                }`}
                aria-label="Open orchestrator chat as modal"
                title="Open as modal"
              >
                ⤢
              </button>
              <button
                type="button"
                onClick={() => setView("panel")}
                className={`flex h-7 w-7 items-center justify-center rounded-md border text-[11px] transition-colors hover:border-line hover:bg-panel2 hover:text-ink ${
                  view === "panel"
                    ? "border-line bg-panel2 text-ink"
                    : "border-transparent text-faint"
                }`}
                aria-label="Open orchestrator chat as right panel"
                title="Open as right panel"
              >
                ▐
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-xs text-faint transition-colors hover:border-line hover:bg-panel2 hover:text-ink"
                aria-label="Close orchestrator chat"
                title="Close"
              >
                ✕
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div>
                <p className="mb-3 text-sm text-muted">
                  One chat for everything — I route to the right suite&apos;s
                  agent, pull status across all of them, and trigger tasks
                  without you leaving the dashboard.
                </p>
                <div className="flex flex-col items-start gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-line bg-bg px-3.5 py-1.5 text-left text-xs text-muted transition-colors hover:border-accent hover:text-accent"
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
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink font-display text-[10px] font-bold text-bg">
                    ر
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
                        msg.run.status === "running" ? "bg-run-soft text-run" : "bg-ok-soft text-ok"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full bg-current ${msg.run.status === "running" ? "pulse-dot" : ""}`} />
                      {msg.run.suiteName} · {msg.run.taskName} · {msg.run.status}
                    </span>
                  )}
                  <div className="text-muted">
                    {msg.text ? renderLite(msg.text, String(msg.id)) : null}
                    {msg.run?.status === "running" && <span className="caret ml-0.5" />}
                  </div>
                  {msg.link && msg.run?.status !== "running" && (
                    <a
                      href={msg.link.href}
                      className="mt-1.5 inline-block rounded-lg border border-line bg-bg px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
                    >
                      {msg.link.label}
                    </a>
                  )}
                  {msg.chips && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.chips.map((c) => (
                        <button
                          key={c}
                          onClick={() => send(c)}
                          className="rounded-full border border-line bg-bg px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
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
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask across all your suites…"
              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              ↑
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-6 bottom-6 z-40 flex items-center gap-2.5 rounded-full border border-line bg-panel py-2.5 pr-5 pl-2.5 shadow-2xl transition-transform hover:-translate-y-0.5"
        aria-label="Ask Ruh orchestrator"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-bg">
          ر
        </span>
        <span className="text-sm font-medium">{open ? "Close" : "Ask Ruh"}</span>
        {!open && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />}
      </button>
    </>
  );
}
