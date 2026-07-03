"use client";

// The Agent Builder wizard — simulates the full pipeline for one suite:
// Requirements → Plan → Design → PRD/ERD → Build → Deploy. All canned.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  defaultRequirement,
  jiraPlan,
  extraPlanTask,
  prdSections,
  erd,
  deployChecklist,
  type PlanTask,
} from "@/lib/builderData";
import { DesignCanvas } from "@/components/builder/DesignCanvas";
import { BuildSimulator } from "@/components/builder/BuildSimulator";

const STEPS = ["Requirements", "Plan", "Design", "PRD & ERD", "Build", "Deploy"];

export function BuilderWizard() {
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [suiteName, setSuiteName] = useState(jiraPlan.suiteName);

  function goto(i: number) {
    if (i <= maxStep) setStep(i);
  }
  function advance() {
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
  }

  return (
    <div>
      <header className="rise mb-6">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Agent builder · new suite ·{" "}
          <span className="text-accent">internal PoC — every stage simulated</span>
        </p>
        <h1 className="mt-1 font-display text-[2.2rem] leading-tight font-semibold tracking-tight">
          Build “{suiteName}”
        </h1>
      </header>

      {/* stepper */}
      <div className="rise mb-6 flex items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-panel p-2">
        {STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : i <= maxStep ? "done" : "todo";
          return (
            <button
              key={s}
              onClick={() => goto(i)}
              disabled={i > maxStep}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
                i === step
                  ? "bg-ink font-medium text-bg"
                  : state === "done"
                    ? "text-ok hover:bg-panel2"
                    : "text-faint"
              } ${i > maxStep ? "cursor-not-allowed" : ""}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] ${
                  i === step
                    ? "bg-bg/20"
                    : state === "done"
                      ? "bg-ok-soft"
                      : "bg-panel2"
                }`}
              >
                {state === "done" && i !== step ? "✓" : i + 1}
              </span>
              {s}
            </button>
          );
        })}
      </div>

      {step === 0 && <StepRequirements onDone={advance} />}
      {step === 1 && <StepPlan onDone={advance} />}
      {step === 2 && (
        <div className="rise">
          <StepHint>
            This is the open-design style preview — the suite&apos;s pages as a
            clickable map. Click any element inside a page to request a change
            in place; drag the background to pan.
          </StepHint>
          <DesignCanvas suiteName={suiteName} onRename={setSuiteName} />
          <ApproveBar label="Approve design" onApprove={advance} />
        </div>
      )}
      {step === 3 && <StepPrd onDone={advance} />}
      {step === 4 && (
        <div className="rise">
          <StepHint>
            Development runs inside a Daytona sandbox — the builder agent works
            on the left while the suite assembles live on the right, Lovable-style.
          </StepHint>
          <BuildSimulator suiteName={suiteName} hue={jiraPlan.hue} onDone={advance} />
        </div>
      )}
      {step === 5 && <StepDeploy suiteName={suiteName} />}
    </div>
  );
}

function StepHint({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 max-w-3xl text-sm text-muted">{children}</p>;
}

function ApproveBar({
  label,
  onApprove,
  note,
}: {
  label: string;
  onApprove: () => void;
  note?: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-panel px-5 py-3.5">
      <p className="text-sm text-muted">
        {note ?? "Happy with this stage? Approval moves the build forward — you can come back anytime."}
      </p>
      <button
        onClick={onApprove}
        className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-85"
      >
        {label} →
      </button>
    </div>
  );
}

// ————— step 1: requirements —————

function StepRequirements({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState(defaultRequirement);
  const [thinking, setThinking] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  function generate() {
    setThinking(true);
    const script = [
      "Analysing requirement — 3 tasks detected (2 agents, 1 workflow)…",
      "Searching agentic gallery — 2 reusable matches: Issue triager v1.9, Standup runner v1.3…",
      "Resolving integrations — Jira Cloud via Composio, Slack webhook…",
      "Drafting plan…",
    ];
    script.forEach((l, i) => setTimeout(() => setLines((p) => [...p, l]), 550 * (i + 1)));
    setTimeout(onDone, 550 * (script.length + 1) + 300);
  }

  return (
    <div className="rise grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-1 font-display text-sm font-semibold">
          What should this suite do?
        </h2>
        <p className="mb-3 text-xs text-faint">
          Plain language. The builder resolves tasks, tools and reusable gallery
          components from it.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={13}
          className="w-full resize-none rounded-xl border border-line bg-bg p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-accent"
        />
        <div className="mt-3 flex items-center gap-2">
          {["Jira API docs", "Brand theme tokens", "Existing Linear Suite as reference"].map((c) => (
            <span key={c} className="rounded-full border border-line bg-bg px-3 py-1 text-xs text-muted">
              📎 {c}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-display text-sm font-semibold">Builder agent</h2>
        {lines.length === 0 && !thinking && (
          <p className="text-sm text-muted">
            I&apos;ll turn this into a structured plan: tasks (agent vs
            workflow), tools, schedules — and I&apos;ll reuse anything that
            already exists in the gallery instead of building from scratch.
          </p>
        )}
        <div className="space-y-2.5">
          {lines.map((l, i) => (
            <p key={i} className="drawer-in flex gap-2 text-sm text-muted">
              <span className={i === lines.length - 1 ? "text-run" : "text-ok"}>
                {i === lines.length - 1 ? "●" : "✓"}
              </span>
              {l}
            </p>
          ))}
        </div>
        <button
          onClick={generate}
          disabled={thinking}
          className="mt-auto rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {thinking ? "Generating plan…" : "Generate plan →"}
        </button>
      </div>
    </div>
  );
}

// ————— step 2: plan —————

function StepPlan({ onDone }: { onDone: () => void }) {
  const [tasks, setTasks] = useState<PlanTask[]>(jiraPlan.tasks);
  const [revisions, setRevisions] = useState<string[]>([]);
  const [change, setChange] = useState("");

  function requestChange(e: React.FormEvent) {
    e.preventDefault();
    if (!change.trim()) return;
    if (/add|digest|release/i.test(change) && !tasks.includes(extraPlanTask)) {
      setTasks((t) => [...t, extraPlanTask]);
      setRevisions((r) => [...r, `Added task: Release digest (workflow) — “${change}”`]);
    } else {
      setRevisions((r) => [...r, `Plan updated — “${change}”`]);
    }
    setChange("");
  }

  return (
    <div className="rise">
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {tasks.map((t) => (
          <div key={t.name} className="drawer-in rounded-2xl border border-line bg-panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-wide text-faint uppercase">
                {t.kind === "workflow" ? "◫ workflow" : "◆ agent"}
              </span>
              {t.schedule && (
                <span className="rounded-full bg-ok-soft px-2 py-0.5 font-mono text-[10px] text-ok">
                  {t.schedule}
                </span>
              )}
            </div>
            <h3 className="font-display text-base font-semibold">{t.name}</h3>
            <p className="mt-1 text-sm text-muted">{t.detail}</p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {t.tools.map((tool) => (
                <span key={tool} className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                  {tool}
                </span>
              ))}
            </div>
            {t.fromGallery && (
              <p className="mt-2.5 border-t border-line pt-2 text-xs text-accent">
                ↺ Reused from gallery: {t.fromGallery}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-4">
          <h3 className="mb-2 font-display text-sm font-semibold">Integrations</h3>
          {jiraPlan.integrations.map((x) => (
            <p key={x} className="flex gap-2 py-0.5 text-sm text-muted">
              <span className="text-ok">✓</span>
              {x}
            </p>
          ))}
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4">
          <h3 className="mb-2 font-display text-sm font-semibold">Platform wiring</h3>
          {jiraPlan.platform.map((x) => (
            <p key={x} className="flex gap-2 py-0.5 text-sm text-muted">
              <span className="text-ok">✓</span>
              {x}
            </p>
          ))}
        </div>
      </div>

      {revisions.length > 0 && (
        <div className="mb-4 rounded-2xl border border-line bg-panel p-4">
          <h3 className="mb-1.5 font-display text-sm font-semibold">Revisions</h3>
          {revisions.map((r, i) => (
            <p key={i} className="drawer-in py-0.5 font-mono text-xs text-ok">
              ✓ v1.{i + 1} — {r}
            </p>
          ))}
        </div>
      )}

      <form onSubmit={requestChange} className="mb-4 flex gap-2">
        <input
          value={change}
          onChange={(e) => setChange(e.target.value)}
          placeholder='Request changes — try "add a release digest workflow"'
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
        <button className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:border-accent hover:text-accent">
          Revise plan
        </button>
      </form>

      <ApproveBar
        label="Approve plan"
        onApprove={onDone}
        note={`${tasks.length} tasks · ${tasks.filter((t) => t.fromGallery).length} reused from the gallery · next: design preview.`}
      />
    </div>
  );
}

// ————— step 4: PRD & ERD —————

function StepPrd({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<"prd" | "erd">("prd");
  const [revs, setRevs] = useState<string[]>([]);
  const [change, setChange] = useState("");

  return (
    <div className="rise">
      <div className="mb-4 flex gap-1 rounded-xl border border-line bg-panel p-1">
        {(["prd", "erd"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {t === "prd" ? "PRD — product spec" : "ERD — data model"}
          </button>
        ))}
      </div>

      {tab === "prd" ? (
        <div className="rounded-2xl border border-line bg-panel p-7">
          <p className="mb-1 font-mono text-xs text-faint">
            PRD-JIRA-001 · generated from approved plan + design · v1.{revs.length}
          </p>
          <h2 className="mb-5 font-display text-2xl font-semibold tracking-tight">
            Jira Suite — Product Requirements
          </h2>
          {prdSections.map((s) => (
            <section key={s.title} className="mb-5">
              <h3 className="mb-1.5 font-display text-sm font-semibold text-accent">
                {s.title}
              </h3>
              {s.body.map((p, i) => (
                <p key={i} className="mb-1.5 text-sm leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </section>
          ))}
          {revs.map((r, i) => (
            <p key={i} className="drawer-in font-mono text-xs text-ok">
              ✓ Revision v1.{i + 1} — {r}
            </p>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-panel p-5">
          <svg viewBox="0 0 800 330" className="h-[330px] w-full min-w-[700px]">
            {erd.edges.map(([a, b]) => {
              const ea = erd.entities.find((e) => e.id === a)!;
              const eb = erd.entities.find((e) => e.id === b)!;
              const ax = ea.x + 85, ay = ea.y + 30 + ea.fields.length * 7;
              const bx = eb.x + 85, by = eb.y + 30 + eb.fields.length * 7;
              return (
                <line
                  key={`${a}-${b}`}
                  x1={ax} y1={ay} x2={bx} y2={by}
                  stroke="var(--line)" strokeWidth="1.5" strokeDasharray="4 4"
                />
              );
            })}
            {erd.entities.map((e) => (
              <g key={e.id}>
                <rect
                  x={e.x} y={e.y} width={170} height={26 + e.fields.length * 16}
                  rx={10} fill="var(--bg)" stroke="var(--line)"
                />
                <text x={e.x + 12} y={e.y + 18} className="fill-[var(--accent)] font-mono text-[11px] font-bold">
                  {e.id}
                </text>
                {e.fields.map((f, i) => (
                  <text key={f} x={e.x + 12} y={e.y + 38 + i * 16} className="fill-[var(--muted)] font-mono text-[10px]">
                    {i === 0 ? "🔑 " : ""}{f}
                  </text>
                ))}
              </g>
            ))}
          </svg>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!change.trim()) return;
          setRevs((r) => [...r, change]);
          setChange("");
        }}
        className="mt-4 mb-4 flex gap-2"
      >
        <input
          value={change}
          onChange={(e) => setChange(e.target.value)}
          placeholder='Request changes — try "tighten the token scopes"'
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent"
        />
        <button className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:border-accent hover:text-accent">
          Revise
        </button>
      </form>

      <ApproveBar
        label="Approve PRD & ERD"
        onApprove={onDone}
        note="Approval kicks off development in the Daytona sandbox."
      />
    </div>
  );
}

// ————— step 6: deploy —————

function StepDeploy({ suiteName }: { suiteName: string }) {
  const [done, setDone] = useState(0);
  const [published, setPublished] = useState(false);
  const finished = done >= deployChecklist.length;

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setDone((d) => Math.min(d + 1, deployChecklist.length)), 700);
    return () => clearInterval(t);
  }, [finished]);

  return (
    <div className="rise mx-auto max-w-2xl">
      <div className="rounded-2xl border border-line bg-panel p-6">
        <div className="mb-5 flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
            style={{ background: jiraPlan.hue }}
          >
            {suiteName[0]}
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">{suiteName} — deployment report</h2>
            <p className="font-mono text-xs text-faint">
              dpl_jira_7f3a2 · {finished ? (published ? "LIVE · IN MARKETPLACE" : "READY TO PUBLISH") : "deploying…"}
            </p>
          </div>
          {finished && (
            <span className={`ml-auto rounded-full px-3 py-1 font-mono text-[10px] ${published ? "bg-ok-soft text-ok" : "bg-run-soft text-run"}`}>
              {published ? "● LIVE" : "● STAGED"}
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {deployChecklist.map((c, i) => (
            <p
              key={c}
              className={`flex gap-2.5 text-sm transition-opacity ${i < done ? "opacity-100" : "opacity-25"}`}
            >
              <span className={i < done ? "text-ok" : "text-faint"}>{i < done ? "✓" : "○"}</span>
              <span className="text-muted">{c.replace("{user}", "akshit")}</span>
            </p>
          ))}
        </div>

        {finished && !published && (
          <button
            onClick={() => setPublished(true)}
            className="drawer-in mt-5 w-full rounded-lg bg-ink py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-85"
          >
            Publish to marketplace
          </button>
        )}

        {published && (
          <div className="drawer-in mt-5 rounded-xl border border-line bg-ok-soft p-4">
            <p className="mb-2 font-mono text-xs text-ok">
              ✓ Published. Org admins can now install {suiteName} — every member
              gets jira-{"{user}"}.ruh.ai. Its 4 tasks were saved to the agentic gallery.
            </p>
            <div className="flex gap-2">
              <Link href="/marketplace" className="rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-bg">
                View in marketplace →
              </Link>
              <Link href="/gallery" className="rounded-lg border border-line bg-bg px-4 py-2 text-xs font-medium">
                See gallery entries
              </Link>
              <Link href="/builder" className="rounded-lg border border-line bg-bg px-4 py-2 text-xs font-medium">
                Back to builder
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
