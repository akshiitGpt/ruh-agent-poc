"use client";

import { useEffect, useRef, useState } from "react";
import type { Run, RunEvent, Task } from "@/lib/data";
import { StatusPill } from "@/components/StatusPill";
import { renderLite } from "@/components/suite/renderLite";
import { WorkflowViewer } from "@/components/suite/WorkflowViewer";

type Block =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; detail: string };

type Seg =
  | { kind: "text"; words: string[] }
  | { kind: "tool"; name: string; detail: string };

interface LiveRun {
  phase: "streaming" | "nodes" | "done" | "stopped";
  blocks: Block[];
  nodeStates: ("pending" | "active" | "done")[];
  log: string[];
  startedAt: number;
  finishedAt?: number;
}

function nowClock(ts: number) {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function buildSegs(task: Task): Seg[] {
  const segs: Seg[] = [];
  task.streamChunks.forEach((chunk, i) => {
    for (const tc of task.toolCalls.filter((t) => t.afterChunk === i)) {
      segs.push({ kind: "tool", name: tc.name, detail: tc.detail });
    }
    segs.push({ kind: "text", words: chunk.split(/(?<=\s)/) });
  });
  return segs;
}

export function TaskWorkbench({
  task,
  seeded,
  user,
}: {
  task: Task;
  seeded: Run[];
  user: string;
}) {
  const [runs, setRuns] = useState<Run[]>(seeded);
  const [form, setForm] = useState<Record<string, string>>({});
  const [live, setLive] = useState<LiveRun | null>(null);
  const [drawerRun, setDrawerRun] = useState<Run | null>(null);
  const [enabled, setEnabled] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => stopTimer(), []);
  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [live?.blocks, live?.log]);

  function stopTimer() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  function finishRun(liveRun: LiveRun, status: Run["status"], summary: string) {
    const finishedAt = Date.now();
    let output: string;
    if (task.kind === "workflow" && task.nodes) {
      const lines = task.nodes
        .map((n, i) =>
          liveRun.nodeStates[i] === "done" ? `- ✓ **${n.label}** — ${n.result}` : null
        )
        .filter(Boolean) as string[];
      if (status !== "succeeded") lines.push(`\n**${summary}** — remaining nodes were skipped.`);
      else lines.push(`\n**Outcome:** all ${task.nodes.length} nodes completed.`);
      output = lines.join("\n");
    } else {
      output = liveRun.blocks
        .filter((b): b is Extract<Block, { kind: "text" }> => b.kind === "text")
        .map((b) => b.text)
        .join("");
      if (status !== "succeeded") output += `\n\n**${summary}.**`;
    }
    const durSec = Math.max(1, Math.round((finishedAt - liveRun.startedAt) / 1000));
    const events: RunEvent[] = [
      { at: nowClock(liveRun.startedAt), type: "started", label: "Run started", detail: task.kind },
    ];
    for (const b of liveRun.blocks) {
      if (b.kind === "tool")
        events.push({ at: nowClock(liveRun.startedAt), type: "tool", label: b.name, detail: b.detail });
    }
    if (task.kind === "workflow" && task.nodes) {
      task.nodes.forEach((n, i) => {
        if (liveRun.nodeStates[i] === "done")
          events.push({
            at: nowClock(liveRun.startedAt + i * 1000),
            type: "node",
            label: `${n.label} completed`,
            detail: n.kind === "llm" ? "LLM node · Pi session" : "action node",
          });
      });
    }
    events.push({
      at: nowClock(finishedAt),
      type: status === "succeeded" ? "finished" : "error",
      label: status === "succeeded" ? "Run succeeded" : "Run stopped",
      detail: summary,
    });

    const run: Run = {
      id: `live_${finishedAt}`,
      display: `#${(finishedAt % 0xffff).toString(16).padStart(4, "0")}`,
      suite: "",
      task: task.slug,
      user,
      status,
      startedAt: liveRun.startedAt,
      duration: durSec >= 60 ? `${Math.floor(durSec / 60)}m ${durSec % 60}s` : `${durSec}s`,
      input: { ...form },
      summary,
      output,
      events,
    };
    setRuns((r) => [run, ...r]);
  }

  const progress = useRef<{
    segs: Seg[];
    segIdx: number;
    wordIdx: number;
    toolPause: number;
    blocks: Block[];
    nodeIdx: number;
    nodeStates: ("pending" | "active" | "done")[];
    log: string[];
    startedAt: number;
  } | null>(null);

  function runAgent() {
    stopTimer();
    const startedAt = Date.now();
    progress.current = {
      segs: buildSegs(task),
      segIdx: 0,
      wordIdx: 0,
      toolPause: 0,
      blocks: [],
      nodeIdx: 0,
      nodeStates: [],
      log: [],
      startedAt,
    };
    setLive({ phase: "streaming", blocks: [], nodeStates: [], log: [], startedAt });

    timer.current = setInterval(() => {
      const p = progress.current;
      if (!p) return;
      if (p.toolPause > 0) {
        p.toolPause--;
        return;
      }
      const seg = p.segs[p.segIdx];
      if (!seg) {
        stopTimer();
        const finished: LiveRun = {
          phase: "done",
          blocks: [...p.blocks],
          nodeStates: [],
          log: [],
          startedAt: p.startedAt,
          finishedAt: Date.now(),
        };
        setLive(finished);
        finishRun(finished, "succeeded", firstLine(task.streamChunks.join("")));
        return;
      }
      if (seg.kind === "tool") {
        p.blocks.push({ kind: "tool", name: seg.name, detail: seg.detail });
        p.segIdx++;
        p.toolPause = 9;
      } else {
        const take = 3;
        const words = seg.words.slice(p.wordIdx, p.wordIdx + take).join("");
        const last = p.blocks[p.blocks.length - 1];
        if (last?.kind === "text") last.text += words;
        else p.blocks.push({ kind: "text", text: words });
        p.wordIdx += take;
        if (p.wordIdx >= seg.words.length) {
          p.segIdx++;
          p.wordIdx = 0;
        }
      }
      setLive((prev) =>
        prev ? { ...prev, blocks: p.blocks.map((b) => ({ ...b })) } : prev
      );
    }, 42);
  }

  function runWorkflow() {
    stopTimer();
    const nodes = task.nodes ?? [];
    const startedAt = Date.now();
    progress.current = {
      segs: [],
      segIdx: 0,
      wordIdx: 0,
      toolPause: 0,
      blocks: [],
      nodeIdx: 0,
      nodeStates: nodes.map((_, idx) => (idx === 0 ? "active" : "pending")),
      log: [`${nowClock(startedAt)}  workflow started on queue suite:${task.slug}`],
      startedAt,
    };
    setLive({
      phase: "nodes",
      blocks: [],
      nodeStates: [...progress.current.nodeStates],
      log: [...progress.current.log],
      startedAt,
    });

    timer.current = setInterval(() => {
      const p = progress.current;
      if (!p) return;
      const i = p.nodeIdx;
      p.nodeStates[i] = "done";
      p.log.push(
        `${nowClock(Date.now())}  ✓ ${nodes[i].label} ${nodes[i].kind === "llm" ? "(LLM node · Pi session)" : "(action)"}`
      );
      p.nodeIdx++;
      if (p.nodeIdx >= nodes.length) {
        stopTimer();
        const finished: LiveRun = {
          phase: "done",
          blocks: [],
          nodeStates: [...p.nodeStates],
          log: [...p.log],
          startedAt: p.startedAt,
          finishedAt: Date.now(),
        };
        setLive(finished);
        finishRun(finished, "succeeded", `All ${nodes.length} nodes completed`);
        return;
      }
      p.nodeStates[p.nodeIdx] = "active";
      p.log.push(`${nowClock(Date.now())}  ▸ ${nodes[p.nodeIdx].label} started`);
      setLive((prev) =>
        prev
          ? { ...prev, nodeStates: [...p.nodeStates], log: [...p.log] }
          : prev
      );
    }, 1200);
  }

  function stopRun() {
    stopTimer();
    const p = progress.current;
    if (!p) return;
    const stopped: LiveRun = {
      phase: "stopped",
      blocks: p.blocks.map((b) => ({ ...b })),
      nodeStates: [...p.nodeStates],
      log: [...p.log],
      startedAt: p.startedAt,
      finishedAt: Date.now(),
    };
    setLive(stopped);
    finishRun(stopped, "failed", "Stopped by user");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (task.kind === "workflow") runWorkflow();
    else runAgent();
  }

  const busy = live?.phase === "streaming" || live?.phase === "nodes";
  const isAutomation = Boolean(task.schedule || task.trigger);

  return (
    <div className="max-w-4xl">
      <header className="rise mb-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-wide text-faint uppercase">
            {task.kind === "workflow" ? "◫ workflow" : "◆ agent"}
          </span>
          {task.schedule && (
            <span className="rounded-full bg-ok-soft px-2.5 py-0.5 font-mono text-[10px] text-ok">
              {task.scheduleHuman}
            </span>
          )}
          {task.trigger && (
            <span className="rounded-full bg-run-soft px-2.5 py-0.5 font-mono text-[10px] text-run">
              {task.trigger}
            </span>
          )}
        </div>
        <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">
          {task.name}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{task.description}</p>
      </header>

      {task.kind === "workflow" && task.nodes && (
        <WorkflowViewer nodes={task.nodes} />
      )}

      {isAutomation && (
        <section
          className="rise mb-5 flex items-center gap-4 rounded-2xl border border-line bg-panel px-5 py-4"
          style={{ animationDelay: "70ms" }}
        >
          <div className="flex-1">
            <p className="text-sm font-medium">
              {task.schedule ? `Runs ${task.scheduleHuman?.toLowerCase()}` : task.trigger}
            </p>
            <p className="mt-0.5 font-mono text-xs text-faint">
              {task.schedule ? `cron ${task.schedule}` : "event trigger"}
              {task.channels ? ` → ${task.channels.join(", ")}` : ""}
            </p>
          </div>
          <button
            onClick={() => setEnabled((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-ok" : "bg-panel2"}`}
            aria-label="Toggle schedule"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg transition-all ${enabled ? "left-5.5" : "left-0.5"}`}
            />
          </button>
          <button
            onClick={() => (task.kind === "workflow" ? runWorkflow() : runAgent())}
            disabled={busy}
            className="rounded-lg border border-line bg-panel2 px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Run now
          </button>
        </section>
      )}

      {task.fields.length > 0 && (
        <form
          onSubmit={submit}
          className="rise mb-5 rounded-2xl border border-line bg-panel p-5"
          style={{ animationDelay: "110ms" }}
        >
          <div className="flex flex-wrap items-end gap-3">
            {task.fields.map((f) => (
              <label
                key={f.key}
                className={f.type === "textarea" ? "w-full" : "min-w-56 flex-1"}
              >
                <span className="mb-1.5 block text-xs font-medium tracking-wide text-faint uppercase">
                  {f.label}
                </span>
                {f.type === "textarea" ? (
                  <textarea
                    rows={3}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
                  />
                ) : f.type === "select" ? (
                  <select
                    value={form[f.key] ?? f.options?.[0]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
                  >
                    {f.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 font-mono text-sm outline-none placeholder:font-body placeholder:text-faint focus:border-accent"
                  />
                )}
              </label>
            ))}
            {busy ? (
              <button
                type="button"
                onClick={stopRun}
                className="rounded-lg border border-err bg-err-soft px-6 py-2.5 text-sm font-medium text-err"
              >
                ■ Stop
              </button>
            ) : (
              <button
                type="submit"
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-85"
              >
                {task.kind === "workflow" ? "Start workflow" : "Submit"}
              </button>
            )}
          </div>
        </form>
      )}

      {live && (
        <section
          className="rise mb-5 overflow-hidden rounded-2xl border border-line bg-panel"
          style={{ animationDelay: "0ms" }}
        >
          <header className="flex items-center gap-2.5 border-b border-line px-5 py-3">
            <span
              className={`h-2 w-2 rounded-full ${busy ? "pulse-dot bg-run" : live.phase === "stopped" ? "bg-err" : "bg-ok"}`}
            />
            <span className="font-mono text-xs text-muted">
              {busy
                ? task.kind === "workflow"
                  ? "workflow executing"
                  : "streaming via SSE"
                : live.phase === "stopped"
                  ? "stopped by user"
                  : `completed in ${Math.max(1, Math.round(((live.finishedAt ?? 0) - live.startedAt) / 1000))}s`}
            </span>
            {busy && task.kind !== "workflow" && (
              <button
                onClick={stopRun}
                className="ml-auto rounded-md border border-line px-2.5 py-1 font-mono text-[10px] text-muted hover:border-err hover:text-err"
              >
                ■ STOP
              </button>
            )}
          </header>

          {task.kind === "workflow" && task.nodes ? (
            <div className="p-5">
              <div className="mb-5 flex items-center">
                {task.nodes.map((n, i) => (
                  <div key={n.id} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-xs transition-all ${
                          live.nodeStates[i] === "done"
                            ? "border-ok bg-ok-soft text-ok"
                            : live.nodeStates[i] === "active"
                              ? "pulse-dot border-run bg-run-soft text-run"
                              : "border-line bg-panel2 text-faint"
                        }`}
                      >
                        {live.nodeStates[i] === "done" ? "✓" : i + 1}
                      </span>
                      <span className="w-20 text-[11px] leading-tight text-muted">
                        {n.label}
                      </span>
                      <span className="font-mono text-[9px] text-faint uppercase">
                        {n.kind}
                      </span>
                    </div>
                    {i < task.nodes.length - 1 && (
                      <div
                        className={`mx-1 mb-8 h-px flex-1 ${live.nodeStates[i] === "done" ? "bg-ok" : "bg-line"}`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div
                ref={outRef}
                className="max-h-44 overflow-y-auto rounded-lg bg-bg/70 p-4 font-mono text-xs leading-loose text-muted"
              >
                {live.log.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>
            </div>
          ) : (
            <div ref={outRef} className="max-h-105 overflow-y-auto p-5 text-muted">
              {live.blocks.map((b, i) =>
                b.kind === "tool" ? (
                  <div
                    key={i}
                    className="drawer-in my-2.5 inline-flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-1.5 font-mono text-xs"
                  >
                    <span className="text-accent">⚙</span>
                    <span className="text-ink">{b.name}</span>
                    <span className="text-faint">{b.detail}</span>
                    <span className="text-ok">✓</span>
                  </div>
                ) : (
                  <div key={i}>{renderLite(b.text, String(i))}</div>
                )
              )}
              {live.phase === "streaming" && <span className="caret ml-0.5" />}
            </div>
          )}
        </section>
      )}

      <section
        className="rise overflow-hidden rounded-2xl border border-line bg-panel"
        style={{ animationDelay: "170ms" }}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold">Recent activity</h2>
          <span className="font-mono text-[10px] text-faint">
            {runs.length} runs · entries are clickable
          </span>
        </header>
        <div className="p-3">
          {runs.map((r) => (
            <button
              key={r.id}
              onClick={() => setDrawerRun(r)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-panel2"
            >
              <span className="w-14 font-mono text-xs text-faint">{r.display}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted">
                {Object.values(r.input)[0] ? (
                  <span className="mr-2 font-mono text-xs text-ink">
                    {Object.values(r.input)[0]}
                  </span>
                ) : null}
                {r.summary}
              </span>
              <StatusPill status={r.status} />
              <span className="w-14 text-right font-mono text-xs text-faint">
                {r.duration}
              </span>
            </button>
          ))}
        </div>
      </section>

      {drawerRun && <RunDrawer run={drawerRun} onClose={() => setDrawerRun(null)} />}
    </div>
  );
}

function firstLine(text: string): string {
  const clean = text
    .split("\n")
    .map((l) => l.replace(/^##\s*/, "").replaceAll("**", "").trim())
    .filter(Boolean);
  return clean[1] ?? clean[0] ?? "Completed.";
}

function RunDrawer({ run, onClose }: { run: Run; onClose: () => void }) {
  const icon: Record<RunEvent["type"], { glyph: string; cls: string }> = {
    started: { glyph: "▸", cls: "text-muted" },
    tool: { glyph: "⚙", cls: "text-accent" },
    node: { glyph: "◫", cls: "text-accent" },
    text: { glyph: "✎", cls: "text-muted" },
    finished: { glyph: "✓", cls: "text-ok" },
    error: { glyph: "✕", cls: "text-err" },
  };

  const startedLabel = new Date(run.startedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <section className="drawer-in relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="font-mono text-xs text-faint">
              run {run.display} · started {startedLabel}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-semibold tracking-tight">
              Run detail
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:text-ink"
          >
            ✕ Close
          </button>
        </header>

        <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_260px]">
          <div className="min-w-0">
            {Object.keys(run.input).length > 0 && (
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-medium tracking-wide text-faint uppercase">
                  Input
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(run.input).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-lg border border-line bg-bg/70 px-3 py-1.5 font-mono text-xs"
                    >
                      <span className="text-faint">{k}:</span>{" "}
                      <span className="text-ink">{v || "—"}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="mb-1.5 text-xs font-medium tracking-wide text-faint uppercase">
              Output
            </p>
            <div className="rounded-xl border border-line bg-bg/70 p-4 text-muted">
              {run.output ? (
                renderLite(run.output, run.id)
              ) : (
                <p className="text-sm text-faint">No output recorded.</p>
              )}
            </div>
          </div>

          <aside className="min-w-0">
            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <Meta label="Status">
                <StatusPill status={run.status} />
              </Meta>
              <Meta label="Duration">
                <span className="font-mono text-sm">{run.duration}</span>
              </Meta>
            </div>

            <p className="mb-2 text-xs font-medium tracking-wide text-faint uppercase">
              Event timeline
            </p>
            <div className="relative space-y-0 border-l border-line pl-5">
              {run.events.map((e, i) => (
                <div key={i} className="relative pb-4 last:pb-0">
                  <span
                    className={`absolute top-0.5 -left-[27px] flex h-4 w-4 items-center justify-center rounded-full border border-line bg-panel text-[9px] ${icon[e.type].cls}`}
                  >
                    {icon[e.type].glyph}
                  </span>
                  <p className="font-mono text-[10px] text-faint">{e.at}</p>
                  <p className="text-sm font-medium break-words">{e.label}</p>
                  {e.detail && (
                    <p className="mt-0.5 text-xs break-words text-muted">
                      {e.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-bg/50 px-3.5 py-2.5">
      <p className="mb-1 text-[10px] font-medium tracking-wide text-faint uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}
