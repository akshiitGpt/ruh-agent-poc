"use client";

// Lovable-style build view: builder-agent log on the left, the suite
// assembling itself live in a fake Daytona sandbox on the right.

import { useEffect, useRef, useState } from "react";
import { buildLog } from "@/lib/builderData";

const PHASES = ["Scaffold", "UI", "Backend", "Database", "Agents", "Tests"] as const;

export function BuildSimulator({
  suiteName,
  hue,
  onDone,
}: {
  suiteName: string;
  hue: string;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0); // how many log lines are visible
  const [tweak, setTweak] = useState("");
  const [accent, setAccent] = useState(hue);
  const [toast, setToast] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const done = idx >= buildLog.length;

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setIdx((i) => Math.min(i + 1, buildLog.length)), 950);
    return () => clearInterval(t);
  }, [done]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [idx]);

  const visible = buildLog.slice(0, idx);
  const currentPhase = done
    ? "Tests"
    : (buildLog[Math.min(idx, buildLog.length - 1)]?.phase ?? "Scaffold");
  const pct = Math.round((idx / buildLog.length) * 100);
  // preview assembles in stages tied to log progress
  const stage = Math.floor((idx / buildLog.length) * 6); // 0..6

  function requestTweak(e: React.FormEvent) {
    e.preventDefault();
    if (!tweak.trim()) return;
    const q = tweak.toLowerCase();
    if (q.includes("purple")) setAccent("#7C6CF0");
    else if (q.includes("green")) setAccent("#4E937A");
    else if (q.includes("orange")) setAccent("#E8933A");
    setToast(`✓ Applied in sandbox — "${tweak}" (hot-reloaded)`);
    setTweak("");
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div>
      {/* progress rail */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-1.5">
          {PHASES.map((p) => {
            const phaseDone =
              PHASES.indexOf(p) < PHASES.indexOf(currentPhase as typeof PHASES[number]) || done;
            const active = p === currentPhase && !done;
            return (
              <span
                key={p}
                className={`rounded-full px-2.5 py-1 font-mono text-[10px] ${
                  phaseDone
                    ? "bg-ok-soft text-ok"
                    : active
                      ? "bg-run-soft text-run"
                      : "bg-panel2 text-faint"
                }`}
              >
                {phaseDone ? "✓ " : active ? "● " : ""}
                {p}
              </span>
            );
          })}
        </div>
        <span className="font-mono text-xs text-faint">{pct}%</span>
      </div>
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* agent log */}
        <div className="overflow-hidden rounded-2xl border border-line bg-panel">
          <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span
              className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
              style={{ background: accent }}
            >
              ر
            </span>
            <span className="font-display text-xs font-semibold">Builder agent</span>
            <span className="ml-auto font-mono text-[10px] text-faint">
              {done ? "build complete" : "building…"}
            </span>
          </header>
          <div ref={logRef} className="h-[380px] space-y-2.5 overflow-y-auto p-4">
            {visible.map((l, i) => (
              <div key={i} className="drawer-in">
                <p className="flex items-start gap-2 text-sm">
                  <span className={i === visible.length - 1 && !done ? "text-run" : "text-ok"}>
                    {i === visible.length - 1 && !done ? "●" : "✓"}
                  </span>
                  <span className="text-muted">{l.text}</span>
                </p>
                {l.file && (
                  <p className="mt-1 ml-6 inline-block rounded bg-panel2 px-2 py-0.5 font-mono text-[10px] text-faint">
                    {l.file}
                  </p>
                )}
              </div>
            ))}
            {!done && (
              <p className="flex items-center gap-2 pl-6 font-mono text-[10px] text-faint">
                <span className="caret" /> pi session · temperature 0 · tools: fs, bash, daytona
              </p>
            )}
            {done && (
              <div className="drawer-in rounded-xl border border-line bg-ok-soft p-3 font-mono text-xs text-ok">
                ✓ Sandbox ready — 24 tests passed. Iterate below or continue to deploy.
              </div>
            )}
          </div>
        </div>

        {/* sandbox preview */}
        <div className="overflow-hidden rounded-2xl border border-line bg-[#17150f]">
          <div className="flex items-center gap-1.5 border-b border-[#2a2721] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#4a443a]" />
            <span className="h-2 w-2 rounded-full bg-[#4a443a]" />
            <span className="h-2 w-2 rounded-full bg-[#4a443a]" />
            <span className="ml-2 flex-1 truncate rounded bg-[#211e17] px-2 py-0.5 text-center font-mono text-[10px] text-[#8a8175]">
              https://3000-jira-suite.daytona.dev
            </span>
            <span className="rounded-full bg-[#211e17] px-2 py-0.5 font-mono text-[9px] text-[#9BC4A0]">
              ● live
            </span>
          </div>

          <div className="flex h-[352px]">
            {stage >= 1 ? (
              <div className="drawer-in w-1/4 border-r border-[#2a2721] p-2.5">
                <div className="mb-3 flex items-center gap-1.5">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white"
                    style={{ background: accent }}
                  >
                    {suiteName[0]}
                  </span>
                  <span className="truncate text-[9px] text-[#b3a996]">{suiteName}</span>
                </div>
                {["Sprint summariser", "Bug triager", "Sprint report"].map((t, i) => (
                  <div
                    key={t}
                    className={`mb-1.5 h-2 rounded-sm bg-[#39342a] ${stage >= 3 ? "" : "animate-pulse"}`}
                    style={{ width: `${85 - i * 12}%` }}
                  />
                ))}
              </div>
            ) : (
              <div className="w-1/4 border-r border-[#2a2721] p-2.5">
                <div className="h-full animate-pulse rounded bg-[#211e17]" />
              </div>
            )}

            <div className="min-w-0 flex-1 p-3">
              {stage >= 2 ? (
                <div className="drawer-in mb-3">
                  <p className="text-sm font-semibold text-[#ece7db]">{suiteName}</p>
                  <p className="mt-0.5 text-[10px] text-[#8a8175]">
                    Sprint intelligence — summaries, triage, Friday reports.
                  </p>
                </div>
              ) : (
                <div className="mb-3 h-8 animate-pulse rounded bg-[#211e17]" />
              )}

              {stage >= 3 ? (
                <div className="drawer-in mb-3 grid grid-cols-3 gap-2">
                  {[
                    ["◆ agent", "Sprint summariser"],
                    ["◆ agent", "Bug triager"],
                    ["◫ workflow", "Sprint report"],
                  ].map(([k, t]) => (
                    <div key={t} className="rounded-lg border border-[#2a2721] bg-[#1d1a14] p-2">
                      <span className="text-[8px]" style={{ color: accent }}>{k}</span>
                      <p className="mt-1 text-[10px] text-[#ece7db]">{t}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-[#211e17]" />
                  ))}
                </div>
              )}

              {stage >= 4 ? (
                <div className="drawer-in rounded-lg border border-[#2a2721] bg-[#1d1a14] p-2">
                  <p className="mb-1.5 text-[9px] text-[#b3a996]">Recent activity</p>
                  {[
                    ["#a1f4", "Bug triager", "3 bugs labelled, 1 duplicate closed", "succeeded"],
                    ["#77c2", "Sprint summariser", "Sprint 42 — 78% done, 2 at risk", "succeeded"],
                  ].map(([id, task, sum, st]) => (
                    <div key={id} className="flex items-center gap-2 py-1 text-[9px]">
                      <span className="font-mono text-[#6b645a]">{id}</span>
                      <span className="text-[#ece7db]">{task}</span>
                      <span className="min-w-0 flex-1 truncate text-[#8a8175]">{sum}</span>
                      <span className="rounded-full bg-[#1d2b1f] px-1.5 text-[8px] text-[#9BC4A0]">{st}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-20 animate-pulse rounded-lg bg-[#211e17]" />
              )}

              {stage >= 5 && (
                <div className="drawer-in mt-3 ml-auto flex w-fit items-center gap-1.5 rounded-full border border-[#2a2721] bg-[#1d1a14] px-3 py-1.5">
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                    style={{ background: accent }}
                  >
                    {suiteName[0]}
                  </span>
                  <span className="text-[9px] text-[#b3a996]">Ask {suiteName.replace(" Suite", "")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* iterate + continue */}
      <div className="mt-4 flex items-center gap-3">
        <form onSubmit={requestTweak} className="flex flex-1 gap-2">
          <input
            value={tweak}
            onChange={(e) => setTweak(e.target.value)}
            disabled={!done}
            placeholder={
              done
                ? 'Request a tweak — try "make the accent purple"'
                : "You can iterate once the sandbox is ready…"
            }
            className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent disabled:opacity-50"
          />
          <button
            disabled={!done}
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            Apply in sandbox
          </button>
        </form>
        <button
          onClick={onDone}
          disabled={!done}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          Looks good — deploy →
        </button>
      </div>
      {toast && (
        <p className="drawer-in mt-2 font-mono text-xs text-ok">{toast}</p>
      )}
    </div>
  );
}
