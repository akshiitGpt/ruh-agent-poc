"use client";

// Standalone workflow runner — trigger a gallery workflow directly, no
// suite around it: input form, live node rail, and run history persisted
// in localStorage.

import { useEffect, useRef, useState } from "react";
import type { GalleryItem } from "@/lib/builderData";
import type { FieldSpec, WorkflowNode } from "@/lib/data";
import { renderLite } from "@/components/suite/renderLite";

interface SavedRun {
  id: string;
  at: number;
  input: Record<string, string>;
  status: "succeeded";
  output: string;
  duration: string;
}

type NodeState = "idle" | "active" | "done";

export function WorkflowRunner({
  item,
  nodes,
  fields,
}: {
  item: GalleryItem;
  nodes: WorkflowNode[];
  fields: FieldSpec[];
}) {
  const KEY = `ruh_wfruns_${item.id}`;
  const [form, setForm] = useState<Record<string, string>>({});
  const [nodeStates, setNodeStates] = useState<NodeState[]>(nodes.map(() => "idle"));
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [openRun, setOpenRun] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRuns(JSON.parse(raw));
    } catch {}
    setLoaded(true);
    return () => timers.current.forEach(clearTimeout);
  }, [KEY]);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(runs));
  }, [runs, loaded, KEY]);

  function clock() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function run() {
    if (running) return;
    setRunning(true);
    setNodeStates(nodes.map(() => "idle"));
    setLog([`${clock()} · Run started — ${nodes.length} nodes on the shared workflow runtime`]);
    const startedAt = Date.now();

    nodes.forEach((n, i) => {
      timers.current.push(
        setTimeout(() => {
          setNodeStates((s) => s.map((x, xi) => (xi === i ? "active" : x)));
          setLog((l) => [...l, `${clock()} · ${n.label} started (${n.kind})`]);
        }, i * 1600)
      );
      timers.current.push(
        setTimeout(() => {
          setNodeStates((s) => s.map((x, xi) => (xi === i ? "done" : x)));
          setLog((l) => [...l, `${clock()} · ✓ ${n.label} — done`]);
        }, i * 1600 + 1300)
      );
    });

    timers.current.push(
      setTimeout(() => {
        const durSec = Math.round((Date.now() - startedAt) / 1000);
        const output = [
          ...nodes.map((n) => `- ✓ **${n.label}** — ${n.result}`),
          `\n**Outcome:** all ${nodes.length} nodes completed.`,
        ].join("\n");
        const saved: SavedRun = {
          id: "#" + Math.abs((startedAt % 65536) * 2654435761 % 65536).toString(16).padStart(4, "0"),
          at: startedAt,
          input: { ...form },
          status: "succeeded",
          output,
          duration: `${durSec}s`,
        };
        setRuns((r) => [saved, ...r]);
        setOpenRun(saved.id);
        setLog((l) => [...l, `${clock()} · ✓ Run succeeded — saved to your history`]);
        setRunning(false);
      }, nodes.length * 1600 + 400)
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div>
        {/* trigger */}
        <section className="mb-4 rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-display text-sm font-semibold">Trigger this workflow</h2>
          {fields.length > 0 ? (
            <div className="mb-4 space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-medium tracking-wide text-faint uppercase">
                    {f.label}
                  </label>
                  {f.type === "select" ? (
                    <select
                      value={form[f.key] ?? f.options?.[0] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      className="w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
                    >
                      {f.options?.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-muted">
              No inputs needed — it runs with your connected account context.
            </p>
          )}
          <button
            onClick={run}
            disabled={running}
            className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {running ? "Running…" : "Run workflow"}
          </button>
        </section>

        {/* node rail + log */}
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-4 font-display text-sm font-semibold">
            {nodes.length} nodes · durable via Temporal
          </h2>
          <div className="mb-4 flex items-center">
            {nodes.map((n, i) => (
              <div key={n.id} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-xs transition-all ${
                      nodeStates[i] === "done"
                        ? "border-ok bg-ok-soft text-ok"
                        : nodeStates[i] === "active"
                          ? "border-run bg-run-soft text-run"
                          : "border-line bg-panel2 text-faint"
                    }`}
                  >
                    {nodeStates[i] === "done" ? "✓" : i + 1}
                  </span>
                  <span className={`w-20 text-[11px] leading-tight ${nodeStates[i] === "idle" ? "text-faint" : "text-ink"}`}>
                    {n.label}
                  </span>
                </div>
                {i < nodes.length - 1 && (
                  <div className={`mx-1 mb-6 h-px flex-1 ${nodeStates[i] === "done" ? "bg-ok" : "bg-line"}`} />
                )}
              </div>
            ))}
          </div>
          {log.length > 0 && (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-line bg-bg/70 p-3.5">
              {log.map((l, i) => (
                <p key={i} className="drawer-in font-mono text-[11px] text-muted">
                  {l}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* run history */}
      <section className="h-fit rounded-2xl border border-line bg-panel">
        <header className="border-b border-line px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold">Your runs</h2>
          <p className="mt-0.5 text-xs text-faint">
            Saved to your account — click a run for its output.
          </p>
        </header>
        <div className="p-2">
          {loaded && runs.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-faint">
              No runs yet — trigger it on the left.
            </p>
          )}
          {runs.map((r) => (
            <div key={r.id + r.at} className="rounded-lg hover:bg-panel2/50">
              <button
                onClick={() => setOpenRun(openRun === r.id ? null : r.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
              >
                <span className="font-mono text-xs text-faint">{r.id}</span>
                <span className="flex-1 text-sm text-muted">
                  {new Date(r.at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="rounded-full bg-ok-soft px-2 py-0.5 font-mono text-[10px] text-ok">
                  succeeded
                </span>
                <span className="font-mono text-[10px] text-faint">{r.duration}</span>
              </button>
              {openRun === r.id && (
                <div className="drawer-in mx-3 mb-2.5 rounded-xl border border-line bg-bg/70 p-3.5 text-muted">
                  {Object.keys(r.input).filter((k) => r.input[k]).length > 0 && (
                    <p className="mb-2 font-mono text-[10px] text-faint">
                      input:{" "}
                      {Object.entries(r.input)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(" · ")}
                    </p>
                  )}
                  {renderLite(r.output, r.id + r.at)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
