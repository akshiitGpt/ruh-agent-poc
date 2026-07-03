import Link from "next/link";
import { getSuite, runsFor, timeAgo, suiteUrl } from "@/lib/data";
import { StatusPill } from "@/components/StatusPill";

export default async function SuiteOverviewPage({
  params,
}: {
  params: Promise<{ suite: string; user: string }>;
}) {
  const { suite: suiteSlug, user } = await params;
  const suite = getSuite(suiteSlug);
  if (!suite) return null;
  const recent = runsFor(suite.slug).slice(0, 5);

  return (
    <div>
      <header className="rise mb-8 max-w-2xl">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Suite overview
        </p>
        <h1 className="mt-1 font-display text-[2.2rem] leading-tight font-semibold tracking-tight">
          {suite.name}
        </h1>
        <p className="mt-2 text-muted">{suite.blurb}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {suite.tasks.map((t, i) => (
          <Link
            key={t.slug}
            href={suiteUrl(suite.slug, user, `/tasks/${t.slug}`)}
            className="rise group rounded-2xl border border-line bg-panel p-5 transition-all hover:-translate-y-0.5 hover:border-accent/60"
            style={{ animationDelay: `${80 + i * 70}ms` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-wide text-faint uppercase">
                {t.kind === "workflow" ? "◫ workflow" : "◆ agent"}
              </span>
              {t.schedule && (
                <span className="rounded-full bg-ok-soft px-2.5 py-0.5 font-mono text-[10px] text-ok">
                  {t.scheduleHuman}
                </span>
              )}
              {t.trigger && (
                <span className="rounded-full bg-run-soft px-2.5 py-0.5 font-mono text-[10px] text-run">
                  {t.trigger}
                </span>
              )}
            </div>
            <h2 className="font-display text-lg font-semibold tracking-tight group-hover:text-accent">
              {t.name}
            </h2>
            <p className="mt-1.5 line-clamp-3 text-sm text-muted">
              {t.description}
            </p>
          </Link>
        ))}
      </div>

      <section
        className="rise mt-8 rounded-2xl border border-line bg-panel"
        style={{ animationDelay: "320ms" }}
      >
        <header className="border-b border-line px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold">
            Latest activity across the suite
          </h2>
        </header>
        <div className="p-3">
          {recent.map((r) => {
            const task = suite.tasks.find((t) => t.slug === r.task)!;
            return (
              <Link
                key={r.id}
                href={suiteUrl(suite.slug, user, `/tasks/${r.task}`)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-panel2"
              >
                <span className="font-mono text-xs text-faint">{r.display}</span>
                <span className="w-44 truncate text-sm font-medium">
                  {task.name}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">
                  {r.summary}
                </span>
                <StatusPill status={r.status} />
                <span className="w-16 text-right font-mono text-xs text-faint">
                  {timeAgo(r.startedAt)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
