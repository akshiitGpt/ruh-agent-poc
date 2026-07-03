"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StatusPill } from "@/components/StatusPill";

export interface DashboardData {
  activity: {
    id: string;
    display: string;
    suiteName: string;
    hue: string;
    glyph: string;
    taskName: string;
    status: "succeeded" | "failed" | "running";
    ago: string;
    summary: string;
    href: string;
  }[];
  chart: { label: string; count: number }[];
  schedules: {
    suiteName: string;
    hue: string;
    glyph: string;
    name: string;
    human: string;
    href: string;
  }[];
  accounts: { name: string; connected: boolean; hue: string }[];
}

const WIDGET_META: Record<string, { title: string; span: 2 | 1 }> = {
  activity: { title: "Recent activity", span: 2 },
  chart: { title: "Runs this week", span: 1 },
  schedules: { title: "Active schedules", span: 1 },
  accounts: { title: "Connected accounts", span: 2 },
};

const DEFAULT_ORDER = ["activity", "chart", "schedules", "accounts"];

export function WidgetGrid({ data }: { data: DashboardData }) {
  const [order, setOrder] = useState(DEFAULT_ORDER);
  const [hidden, setHidden] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ruh_widgets") ?? "null");
      if (saved?.order?.length) setOrder(saved.order);
      if (saved?.hidden) setHidden(saved.hidden);
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted)
      localStorage.setItem("ruh_widgets", JSON.stringify({ order, hidden }));
  }, [order, hidden, mounted]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setOrder((items) =>
        arrayMove(
          items,
          items.indexOf(String(active.id)),
          items.indexOf(String(over.id))
        )
      );
    }
  }

  const visible = order.filter((id) => !hidden.includes(id));

  return (
    <div>
      {hidden.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Hidden widgets:</span>
          {hidden.map((id) => (
            <button
              key={id}
              onClick={() => setHidden((h) => h.filter((x) => x !== id))}
              className="rounded-full border border-dashed border-line bg-panel px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
            >
              + {WIDGET_META[id].title}
            </button>
          ))}
        </div>
      )}

      <DndContext
        id="ruh-widgets"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={visible} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-4">
            {visible.map((id, i) => (
              <SortableWidget
                key={id}
                id={id}
                index={i}
                title={WIDGET_META[id].title}
                span={WIDGET_META[id].span}
                onHide={() => setHidden((h) => [...h, id])}
              >
                {id === "activity" && <ActivityWidget rows={data.activity} />}
                {id === "chart" && <ChartWidget bars={data.chart} />}
                {id === "schedules" && (
                  <SchedulesWidget rows={data.schedules} />
                )}
                {id === "accounts" && <AccountsWidget rows={data.accounts} />}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableWidget({
  id,
  index,
  title,
  span,
  onHide,
  children,
}: {
  id: string;
  index: number;
  title: string;
  span: 1 | 2;
  onHide: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        animationDelay: `${80 + index * 70}ms`,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`rise rounded-2xl border border-line bg-panel shadow-[0_10px_30px_-24px_rgba(33,29,22,0.5)] ${
        span === 2 ? "col-span-2" : "col-span-2 lg:col-span-1"
      } ${isDragging ? "opacity-90 shadow-[0_24px_50px_-20px_rgba(33,29,22,0.5)]" : ""}`}
    >
      <header className="flex items-center gap-2 border-b border-line px-5 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-faint hover:bg-panel2 hover:text-ink active:cursor-grabbing"
          aria-label={`Drag ${title}`}
          title="Drag to rearrange"
        >
          ⠿
        </button>
        <h2 className="font-display text-sm font-semibold tracking-tight">
          {title}
        </h2>
        <button
          onClick={onHide}
          className="ml-auto rounded p-1 text-xs text-faint hover:bg-panel2 hover:text-ink"
          aria-label={`Hide ${title}`}
          title="Hide widget"
        >
          ✕
        </button>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ActivityWidget({ rows }: { rows: DashboardData["activity"] }) {
  return (
    <div className="-mx-2">
      {rows.map((r) => (
        <a
          key={r.id}
          href={r.href}
          className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-panel2"
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-display text-[11px] font-bold text-white"
            style={{ background: r.hue }}
          >
            {r.glyph}
          </span>
          <span className="w-44 shrink-0 truncate text-sm font-medium">
            {r.taskName}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted">
            {r.summary}
          </span>
          <StatusPill status={r.status} />
          <span className="w-16 shrink-0 text-right font-mono text-xs text-faint">
            {r.ago}
          </span>
        </a>
      ))}
    </div>
  );
}

function ChartWidget({ bars }: { bars: DashboardData["chart"] }) {
  const max = Math.max(...bars.map((b) => b.count), 1);
  const total = bars.reduce((a, b) => a + b.count, 0);
  return (
    <div>
      <p className="mb-4 font-display text-3xl font-semibold">
        {total}
        <span className="ml-2 text-sm font-normal text-faint">
          runs · 7 days
        </span>
      </p>
      <div className="flex h-28 items-stretch gap-2">
        {bars.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className="w-full rounded-t-md bg-accent transition-all hover:opacity-80"
              style={{
                height: `${Math.max(8, (b.count / max) * 82)}px`,
                opacity: 0.35 + (b.count / max) * 0.65,
              }}
              title={`${b.count} runs`}
            />
            <span className="font-mono text-[10px] text-faint">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchedulesWidget({ rows }: { rows: DashboardData["schedules"] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((s, i) => (
        <a
          key={i}
          href={s.href}
          className="flex items-center gap-3 rounded-lg border border-line bg-bg/50 px-3 py-2.5 transition-colors hover:border-accent"
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-display text-[10px] font-bold text-white"
            style={{ background: s.hue }}
          >
            {s.glyph}
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-sm font-medium">{s.name}</span>
            <span className="block text-xs text-faint">{s.suiteName}</span>
          </span>
          <span className="rounded-full bg-ok-soft px-2.5 py-1 font-mono text-[10px] text-ok">
            {s.human}
          </span>
        </a>
      ))}
      {rows.length === 0 && (
        <p className="text-sm text-faint">No schedules in this organisation.</p>
      )}
    </div>
  );
}

function AccountsWidget({ rows }: { rows: DashboardData["accounts"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {rows.map((a) => (
        <div
          key={a.name}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            a.connected
              ? "border-line bg-bg/50"
              : "border-dashed border-line opacity-60"
          }`}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: a.connected ? a.hue : "var(--faint)" }}
          />
          <span className="flex-1 text-sm font-medium">{a.name}</span>
          <span
            className={`font-mono text-[10px] ${a.connected ? "text-ok" : "text-faint"}`}
          >
            {a.connected ? "OAUTH ✓" : "CONNECT"}
          </span>
        </div>
      ))}
    </div>
  );
}
