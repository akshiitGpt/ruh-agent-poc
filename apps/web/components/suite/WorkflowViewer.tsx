"use client";

import { useState } from "react";
import type { WorkflowNode } from "@/lib/data";
import { inlineBold } from "@/components/suite/renderLite";

export function WorkflowViewer({ nodes }: { nodes: WorkflowNode[] }) {
  const [selected, setSelected] = useState(0);
  const node = nodes[selected];

  return (
    <section
      className="rise mb-5 overflow-hidden rounded-2xl border border-line bg-panel"
      style={{ animationDelay: "90ms" }}
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-display text-sm font-semibold">
          How this workflow runs
        </h2>
        <span className="font-mono text-[10px] text-faint">
          {nodes.length} nodes · {nodes.filter((n) => n.kind === "llm").length}{" "}
          LLM · durable via Temporal
        </span>
      </header>

      <div className="p-5">
        <div className="mb-5 flex items-center">
          {nodes.map((n, i) => (
            <div key={n.id} className="flex flex-1 items-center last:flex-none">
              <button
                onClick={() => setSelected(i)}
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-xs transition-all ${
                    i === selected
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line bg-panel2 text-muted group-hover:border-faint"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`w-20 text-[11px] leading-tight ${i === selected ? "text-ink" : "text-muted"}`}
                >
                  {n.label}
                </span>
                <span
                  className={`rounded-full px-1.5 py-px font-mono text-[9px] uppercase ${
                    n.kind === "llm"
                      ? "bg-run-soft text-run"
                      : "bg-panel2 text-faint"
                  }`}
                >
                  {n.kind}
                </span>
              </button>
              {i < nodes.length - 1 && (
                <div className="mx-1 mb-10 h-px flex-1 bg-line" />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-line bg-bg/60 p-4">
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-faint">
              step {selected + 1}/{nodes.length}
            </span>
            <span className="font-display text-sm font-semibold text-ink">
              {node.label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase ${
                node.kind === "llm" ? "bg-run-soft text-run" : "bg-panel2 text-faint"
              }`}
            >
              {node.kind === "llm" ? "LLM node · Pi session" : "action node"}
            </span>
            <span className="ml-auto font-mono text-[10px] text-faint">
              retries ×2 · resumes on crash
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted">{node.description}</p>
          <p className="mt-2.5 border-t border-line pt-2.5 text-xs text-faint">
            Example outcome:{" "}
            <span className="text-muted">{inlineBold(node.result)}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
