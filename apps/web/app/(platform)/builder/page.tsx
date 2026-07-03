import Link from "next/link";
import { getSession } from "@/lib/session";
import { builds } from "@/lib/builderData";

export default async function BuilderIndexPage() {
  const { user, role } = await getSession();
  if (!user) return null;

  if (role !== "admin") {
    return (
      <div className="rise mx-auto mt-20 max-w-md rounded-2xl border border-dashed border-line bg-panel p-8 text-center">
        <p className="mb-2 text-2xl">🔒</p>
        <h1 className="mb-2 font-display text-xl font-semibold">Admins only</h1>
        <p className="text-sm text-muted">
          The agent builder creates and publishes suites for the whole
          organisation, so it&apos;s limited to org admins.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="rise mb-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs tracking-wide text-faint uppercase">
            Build studio
          </p>
          <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
            Agent builder
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            Describe a suite, approve the plan, click through the design, watch
            it build in a sandbox, publish to the marketplace. Agents and
            workflows it creates land in the{" "}
            <Link href="/gallery" className="text-accent underline underline-offset-2">
              agentic gallery
            </Link>{" "}
            for reuse.
          </p>
        </div>
        <Link
          href="/builder/new"
          className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-85"
        >
          + New suite
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {builds.map((b, i) => (
          <div
            key={b.name}
            className="rise flex items-center gap-4 rounded-2xl border border-line bg-panel p-5"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
              style={{ background: b.hue }}
            >
              {b.glyph}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold">{b.name}</h3>
              <p className="font-mono text-[11px] text-faint">
                {b.tasks} tasks · updated {b.updated}
                {b.step ? ` · paused at ${b.step}` : ` · ${b.version}`}
              </p>
            </div>
            {b.status === "deployed" ? (
              <span className="rounded-full bg-ok-soft px-3 py-1 font-mono text-[10px] text-ok">
                DEPLOYED
              </span>
            ) : (
              <Link
                href="/builder/new"
                className="rounded-lg border border-line px-4 py-2 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
              >
                Resume draft →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
