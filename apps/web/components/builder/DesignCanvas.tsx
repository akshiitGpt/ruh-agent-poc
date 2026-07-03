"use client";

// Open-design-style canvas: the suite's pages laid out as linked mockups.
// Click any element inside a page → floating input → request a change.
// Pan by dragging the background, zoom with the controls.

import { useRef, useState } from "react";

interface Sel {
  page: string;
  element: string;
  x: number;
  y: number;
}

const ACCENTS: Record<string, string> = {
  orange: "#E8933A",
  blue: "#4B7BE5",
  purple: "#7C6CF0",
  green: "#4E937A",
  pink: "#D26A8C",
};

// page frames on the canvas (world coordinates)
const PAGES = [
  { id: "auth", title: "Auth gate", x: 40, y: 150, w: 200, h: 150 },
  { id: "overview", title: "Suite overview", x: 330, y: 90, w: 300, h: 230 },
  { id: "agent", title: "Sprint summariser · agent", x: 730, y: 20, w: 300, h: 220 },
  { id: "workflow", title: "Sprint report · workflow", x: 730, y: 290, w: 300, h: 220 },
  { id: "settings", title: "Schedules & access", x: 350, y: 400, w: 260, h: 170 },
];

const ARROWS: { from: string; to: string; label: string }[] = [
  { from: "auth", to: "overview", label: "signed in via ruh" },
  { from: "overview", to: "agent", label: "open task" },
  { from: "overview", to: "workflow", label: "run workflow" },
  { from: "overview", to: "settings", label: "manage" },
];

export function DesignCanvas({
  suiteName,
  onRename,
}: {
  suiteName: string;
  onRename: (name: string) => void;
}) {
  const [accent, setAccent] = useState(ACCENTS.blue);
  const [sel, setSel] = useState<Sel | null>(null);
  const [req, setReq] = useState("");
  const [applying, setApplying] = useState(false);
  const [pins, setPins] = useState<string[]>([]); // "page/element"
  const [toast, setToast] = useState<string | null>(null);
  const [changes, setChanges] = useState(0);
  const [pan, setPan] = useState({ x: 10, y: -10 });
  const [zoom, setZoom] = useState(0.94);
  const drag = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  function pick(page: string, element: string, e: React.MouseEvent) {
    e.stopPropagation();
    const rect = boxRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 12), rect.width - 300);
    const y = Math.min(Math.max(e.clientY - rect.top + 14, 12), rect.height - 120);
    setSel({ page, element, x, y });
    setReq("");
  }

  function apply() {
    if (!req.trim() || !sel) return;
    setApplying(true);
    const request = req;
    const target = sel;
    setTimeout(() => {
      const q = request.toLowerCase();
      const colour = Object.keys(ACCENTS).find((c) => q.includes(c));
      const rename = q.match(/(?:rename|call it|name it)\s+(?:to\s+)?["']?([\w -]{2,24})/);
      if (colour) {
        setAccent(ACCENTS[colour]);
        flash(`✓ Theme accent → ${colour} across all ${PAGES.length} pages`);
      } else if (rename) {
        onRename(rename[1].trim());
        flash(`✓ Suite renamed to "${rename[1].trim()}" everywhere`);
      } else {
        setPins((p) => [...p, `${target.page}/${target.element}`]);
        flash(`✓ Applied to ${target.element} on "${title(target.page)}" — “${request}”`);
      }
      setChanges((c) => c + 1);
      setApplying(false);
      setSel(null);
    }, 900);
  }

  function title(id: string) {
    return PAGES.find((p) => p.id === id)?.title ?? id;
  }

  const pinned = (page: string, el: string) => pins.includes(`${page}/${el}`);

  return (
    <div
      ref={boxRef}
      className="relative h-[560px] cursor-grab touch-none overflow-hidden rounded-2xl border border-line active:cursor-grabbing"
      style={{
        background:
          "radial-gradient(circle, #2a2721 1px, transparent 1px) 0 0/22px 22px, #17150f",
      }}
      onPointerDown={(e) => {
        drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setPan({
          x: drag.current.px + (e.clientX - drag.current.sx),
          y: drag.current.py + (e.clientY - drag.current.sy),
        });
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
      onClick={() => setSel(null)}
    >
      {/* world */}
      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: 1100,
          height: 620,
        }}
      >
        {/* arrows */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#6b645a" />
            </marker>
          </defs>
          {ARROWS.map((a) => {
            const f = PAGES.find((p) => p.id === a.from)!;
            const t = PAGES.find((p) => p.id === a.to)!;
            const x1 = f.x + f.w;
            const y1 = f.y + f.h / 2;
            const x2 = t.x - 8;
            const y2 = t.y + t.h / 2;
            const mx = (x1 + x2) / 2;
            return (
              <g key={`${a.from}-${a.to}`}>
                <path
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#6b645a"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                  markerEnd="url(#arr)"
                />
                <text
                  x={mx}
                  y={(y1 + y2) / 2 - 8}
                  textAnchor="middle"
                  className="fill-[#8a8175] font-mono text-[9px]"
                >
                  {a.label}
                </text>
              </g>
            );
          })}
        </svg>

        {PAGES.map((p) => (
          <MiniPage
            key={p.id}
            page={p}
            accent={accent}
            suiteName={suiteName}
            pick={pick}
            pinned={pinned}
          />
        ))}
      </div>

      {/* legend + controls */}
      <div className="pointer-events-none absolute top-3 left-4 font-mono text-[10px] text-[#8a8175]">
        {PAGES.length} pages · click any element to request a change · drag to pan
        {changes > 0 && (
          <span className="ml-2 rounded-full bg-[#2a2721] px-2 py-0.5 text-[#E8C79A]">
            {changes} change{changes > 1 ? "s" : ""} applied
          </span>
        )}
      </div>
      <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-lg border border-[#2a2721] bg-[#1d1a14] p-1 font-mono text-xs text-[#b3a996]">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.5, z - 0.12)); }}
          className="rounded px-2 py-1 hover:bg-[#2a2721]"
        >
          −
        </button>
        <span className="w-10 text-center text-[10px]">{Math.round(zoom * 100)}%</span>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(1.6, z + 0.12)); }}
          className="rounded px-2 py-1 hover:bg-[#2a2721]"
        >
          +
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(0.94); setPan({ x: 10, y: -10 }); }}
          className="rounded px-2 py-1 text-[10px] hover:bg-[#2a2721]"
        >
          fit
        </button>
      </div>

      {/* floating change-request box */}
      {sel && (
        <div
          className="drawer-in absolute z-20 w-72 rounded-xl border border-[#3a352b] bg-[#211e17] p-3 shadow-2xl"
          style={{ left: sel.x, top: sel.y }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="mb-2 font-mono text-[10px] text-[#8a8175]">
            ✎ {sel.element} · <span className="text-[#E8C79A]">{title(sel.page)}</span>
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); apply(); }}
            className="flex gap-1.5"
          >
            <input
              autoFocus
              value={req}
              onChange={(e) => setReq(e.target.value)}
              placeholder="Ask for a change… (try “make it purple”)"
              className="min-w-0 flex-1 rounded-lg border border-[#3a352b] bg-[#17150f] px-2.5 py-1.5 text-xs text-[#ece7db] outline-none placeholder:text-[#6b645a] focus:border-[#E8933A]"
            />
            <button
              disabled={applying}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#17150f]"
              style={{ background: applying ? "#8a8175" : "#E8933A" }}
            >
              {applying ? "…" : "Apply"}
            </button>
          </form>
        </div>
      )}

      {toast && (
        <div className="drawer-in absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#3a352b] bg-[#211e17] px-4 py-2 font-mono text-[11px] whitespace-nowrap text-[#9BC4A0]">
          {toast}
        </div>
      )}
    </div>
  );
}

// ————— mini page mockups —————

function MiniPage({
  page,
  accent,
  suiteName,
  pick,
  pinned,
}: {
  page: (typeof PAGES)[number];
  accent: string;
  suiteName: string;
  pick: (page: string, el: string, e: React.MouseEvent) => void;
  pinned: (page: string, el: string) => boolean;
}) {
  const El = ({
    name,
    className,
    style,
    children,
  }: {
    name: string;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }) => (
    <div
      onClick={(e) => pick(page.id, name, e)}
      onPointerDown={(e) => e.stopPropagation()}
      className={`relative cursor-pointer transition-shadow hover:ring-1 hover:ring-[#E8933A]/70 ${className ?? ""}`}
      style={style}
      title={`Click to edit: ${name}`}
    >
      {children}
      {pinned(page.id, name) && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E8933A] text-[8px] text-[#17150f]">
          ✎
        </span>
      )}
    </div>
  );

  const bar = (w: string, extra = "") => (
    <div className={`h-1.5 rounded-sm bg-[#39342a] ${w} ${extra}`} />
  );

  return (
    <div
      className="absolute overflow-hidden rounded-lg border border-[#39342a] bg-[#1d1a14] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.7)]"
      style={{ left: page.x, top: page.y, width: page.w, height: page.h }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* frame chrome */}
      <div className="flex items-center gap-1.5 border-b border-[#2a2721] px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4a443a]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#4a443a]" />
        <span className="ml-1 truncate font-mono text-[8px] text-[#8a8175]">
          {page.title}
        </span>
      </div>

      <div className="flex h-full">
        {page.id !== "auth" && (
          <El name="sidebar" className="w-1/4 border-r border-[#2a2721] p-1.5">
            <div className="mb-2 flex items-center gap-1">
              <span
                className="flex h-3.5 w-3.5 items-center justify-center rounded text-[7px] font-bold text-white"
                style={{ background: accent }}
              >
                {suiteName[0]}
              </span>
              <span className="truncate text-[7px] text-[#b3a996]">{suiteName}</span>
            </div>
            {bar("w-4/5", "mb-1.5")}
            {bar("w-3/5", "mb-1.5")}
            {bar("w-4/6")}
          </El>
        )}

        <div className="min-w-0 flex-1 p-2">
          {page.id === "auth" && (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 pb-6">
              <El name="logo">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold text-white"
                  style={{ background: accent }}
                >
                  ر
                </span>
              </El>
              <El name="headline" className="text-center text-[8px] text-[#ece7db]">
                Authenticated via Ruh
              </El>
              <El
                name="sign-in button"
                className="rounded px-3 py-1 text-[7px] font-semibold text-[#17150f]"
                style={{ background: accent }}
              >
                Continue with ruh.ai
              </El>
            </div>
          )}

          {page.id === "overview" && (
            <>
              <El name="page title" className="mb-1.5">
                <p className="text-[10px] font-semibold text-[#ece7db]">{suiteName}</p>
                {bar("w-2/3", "mt-1")}
              </El>
              <div className="mb-2 grid grid-cols-3 gap-1.5">
                {["Sprint summariser", "Bug triager", "Sprint report"].map((t) => (
                  <El key={t} name={`task card: ${t}`} className="rounded border border-[#2a2721] bg-[#232019] p-1.5">
                    <span className="text-[6px]" style={{ color: accent }}>
                      {t.includes("report") ? "◫ workflow" : "◆ agent"}
                    </span>
                    <p className="mt-0.5 truncate text-[7px] text-[#ece7db]">{t}</p>
                  </El>
                ))}
              </div>
              <El name="activity table" className="rounded border border-[#2a2721] p-1.5">
                <p className="mb-1 text-[7px] text-[#b3a996]">Latest activity</p>
                {bar("w-full", "mb-1")}
                {bar("w-5/6", "mb-1")}
                {bar("w-4/6")}
              </El>
            </>
          )}

          {page.id === "agent" && (
            <>
              <El name="task heading" className="mb-1.5">
                <p className="text-[9px] font-semibold text-[#ece7db]">Sprint summariser</p>
              </El>
              <El name="trigger form" className="mb-1.5 flex gap-1">
                <div className="h-4 flex-1 rounded border border-[#2a2721] bg-[#17150f]" />
                <div
                  className="flex h-4 items-center rounded px-1.5 text-[6px] font-semibold text-[#17150f]"
                  style={{ background: accent }}
                >
                  Run
                </div>
              </El>
              <El name="streaming output" className="rounded border border-[#2a2721] bg-[#17150f] p-1.5">
                <span
                  className="mb-1 inline-block rounded-full px-1.5 text-[6px]"
                  style={{ background: `${accent}33`, color: accent }}
                >
                  ⚙ jira.get_sprint ✓
                </span>
                {bar("w-full", "mb-1")}
                {bar("w-5/6", "mb-1")}
                {bar("w-11/12", "mb-1")}
                {bar("w-3/6")}
              </El>
            </>
          )}

          {page.id === "workflow" && (
            <>
              <El name="task heading" className="mb-1.5">
                <p className="text-[9px] font-semibold text-[#ece7db]">Sprint report</p>
              </El>
              <El name="node rail" className="mb-2 flex items-center gap-1">
                {["collect", "summarise", "post", "attach"].map((n, i) => (
                  <span key={n} className="flex flex-1 items-center gap-1">
                    <span
                      className="flex h-4 w-full items-center justify-center rounded border text-[6px]"
                      style={{
                        borderColor: i < 2 ? accent : "#2a2721",
                        color: i < 2 ? accent : "#8a8175",
                        background: i < 2 ? `${accent}1f` : "transparent",
                      }}
                    >
                      {n}
                    </span>
                  </span>
                ))}
              </El>
              <El name="schedule toggle" className="mb-1.5 flex items-center justify-between rounded border border-[#2a2721] p-1.5">
                <span className="text-[7px] text-[#b3a996]">Fridays 16:00 · cron</span>
                <span className="h-2.5 w-5 rounded-full" style={{ background: accent }} />
              </El>
              <El name="execution log" className="rounded border border-[#2a2721] bg-[#17150f] p-1.5">
                {bar("w-4/6", "mb-1")}
                {bar("w-5/6", "mb-1")}
                {bar("w-3/6")}
              </El>
            </>
          )}

          {page.id === "settings" && (
            <>
              <El name="page title" className="mb-1.5">
                <p className="text-[9px] font-semibold text-[#ece7db]">Schedules & access</p>
              </El>
              {["Bug triager · hourly", "Sprint report · Fri 16:00"].map((s) => (
                <El key={s} name={`schedule row: ${s}`} className="mb-1.5 flex items-center justify-between rounded border border-[#2a2721] p-1.5">
                  <span className="truncate text-[7px] text-[#b3a996]">{s}</span>
                  <span className="h-2.5 w-5 shrink-0 rounded-full" style={{ background: accent }} />
                </El>
              ))}
              <El name="connected account" className="flex items-center gap-1.5 rounded border border-[#2a2721] p-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
                <span className="text-[7px] text-[#b3a996]">Jira · connected via Composio</span>
              </El>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
