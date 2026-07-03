import Link from "next/link";
import { getSession } from "@/lib/session";
import {
  getSuite,
  prettyHost,
  rootUrl,
  users,
  installs,
  hasSuiteAccess,
} from "@/lib/data";
import { SuiteChat } from "@/components/suite/SuiteChat";

export default async function SuiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ suite: string; user: string }>;
}) {
  const { suite: suiteSlug, user: userSlug } = await params;
  const suite = getSuite(suiteSlug);
  const owner = users.find((u) => u.id === userSlug);
  const { user: sessionUser, org, role } = await getSession();

  if (!suite || !owner) {
    return (
      <Gate title="Unknown suite">
        <p className="text-muted">
          No suite is registered at this subdomain. Check the address or browse
          the marketplace.
        </p>
        <a href={rootUrl("/marketplace")} className="gate-btn">
          Open marketplace
        </a>
      </Gate>
    );
  }

  if (!sessionUser) {
    return (
      <Gate title="Authenticated via Ruh">
        <p className="text-muted">
          This suite trusts the Ruh platform for identity. Sign in on ruh.ai
          and you&apos;ll come straight back — the session is shared across
          every *.ruh.ai subdomain.
        </p>
        <a href={rootUrl("/login")} className="gate-btn">
          Sign in on ruh.ai
        </a>
      </Gate>
    );
  }

  if (sessionUser.id !== owner.id) {
    return (
      <Gate title={`This is ${owner.name}'s ${suite.name}`}>
        <p className="text-muted">
          You&apos;re signed in as {sessionUser.name}. Each member gets their
          own suite instance — yours is{" "}
          <span className="font-mono text-accent">
            {suite.name} ({sessionUser.name})
          </span>
          .
        </p>
        <a href={suiteUrl(suite.slug, sessionUser.id)} className="gate-btn">
          Go to your {suite.name}
        </a>
      </Gate>
    );
  }

  const installedInOrg = installs[org.id]?.includes(suite.slug) ?? false;
  const allowed = hasSuiteAccess(sessionUser.id, org.id, suite.slug, role);

  if (!allowed) {
    return (
      <Gate title={installedInOrg ? "Access restricted" : `Not installed in ${org.name}`}>
        <p className="text-muted">
          {installedInOrg ? (
            <>
              The <strong>{suite.name}</strong> is installed in {org.name}, but
              your admin hasn&apos;t granted you access to it yet.
            </>
          ) : (
            <>
              The <strong>{suite.name}</strong> isn&apos;t installed in{" "}
              {org.name}
              {role === "admin"
                ? " — you can add it from the marketplace."
                : " — ask an org admin to install it."}
            </>
          )}
        </p>
        {role === "admin" ? (
          <a
            href={rootUrl(
              installedInOrg ? "/settings/organization" : "/marketplace"
            )}
            className="gate-btn"
          >
            {installedInOrg ? "Manage suite access" : "Open marketplace"}
          </a>
        ) : (
          <a href={rootUrl()} className="gate-btn">
            Back to dashboard
          </a>
        )}
      </Gate>
    );
  }

  const automations = suite.tasks.filter((t) => t.schedule || t.trigger);
  const onDemand = suite.tasks.filter((t) => !t.schedule && !t.trigger);

  return (
    <div data-theme="control" className="atmosphere min-h-screen bg-bg">
      <div className="mx-auto flex min-h-screen max-w-350">
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-panel/70 px-4 py-5 backdrop-blur">
          <a
            href={rootUrl()}
            className="mb-5 flex items-center gap-2 rounded-lg border border-line bg-panel2/60 px-3 py-2.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
          >
            ← Back to dashboard
          </a>

          <Link href="/" className="mb-6 flex items-center gap-2.5 px-1">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg font-display text-base font-bold text-white"
              style={{ background: suite.hue }}
            >
              {suite.glyph}
            </span>
            <span className="leading-tight">
              <span className="block font-display font-semibold tracking-tight">
                {suite.name}
              </span>
              <span className="block font-mono text-[10px] text-faint">
                {prettyHost(suite.slug, owner.id)}
              </span>
            </span>
          </Link>

          <SidebarGroup label="Tasks" tasks={onDemand} />
          {automations.length > 0 && (
            <SidebarGroup label="Automations" tasks={automations} />
          )}

          <div className="mt-auto border-t border-line pt-3">
            <a
              href={rootUrl("/settings/profile")}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-panel2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-display text-xs font-semibold text-accent">
                {owner.initials}
              </span>
              <span className="flex-1 leading-tight">
                <span className="block text-sm font-medium">{owner.name}</span>
                <span className="block text-[11px] text-faint">
                  Profile / settings
                </span>
              </span>
            </a>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/85 px-8 py-3 backdrop-blur">
            <span className="font-mono text-xs text-muted">
              https://{prettyHost(suite.slug, owner.id)}
            </span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 font-mono text-[10px] text-ok">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              AUTHENTICATED VIA RUH
            </span>
            <span className="rounded-full border border-line bg-panel px-3 py-1 font-mono text-[10px] text-muted">
              {org.name.toUpperCase()}
            </span>
          </header>
          <main className="px-8 py-7">{children}</main>
        </div>
      </div>
      <SuiteChat suite={suite} userInitials={owner.initials} />
    </div>
  );
}

function SidebarGroup({
  label,
  tasks,
}: {
  label: string;
  tasks: { slug: string; name: string; kind: string; schedule?: string }[];
}) {
  return (
    <div className="mb-5">
      <p className="mb-1.5 px-3 text-xs font-medium tracking-wide text-faint uppercase">
        {label}
      </p>
      <div className="space-y-0.5">
        {tasks.map((t) => (
          <Link
            key={t.slug}
            href={`/tasks/${t.slug}`}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-panel2 hover:text-ink"
          >
            <span className="font-mono text-[10px] text-faint">
              {t.kind === "workflow" ? "◫" : "◆"}
            </span>
            <span className="flex-1">{t.name}</span>
            {t.schedule && <span className="text-[10px] text-faint">⏱</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Gate({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="control"
      className="atmosphere flex min-h-screen items-center justify-center bg-bg px-6"
    >
      <div className="rise w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft font-display text-lg font-bold text-accent">
          ر
        </div>
        <h1 className="mb-3 font-display text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <div className="space-y-5 text-sm [&_.gate-btn]:inline-block [&_.gate-btn]:rounded-lg [&_.gate-btn]:bg-accent [&_.gate-btn]:px-5 [&_.gate-btn]:py-2.5 [&_.gate-btn]:font-medium [&_.gate-btn]:text-bg">
          {children}
        </div>
      </div>
    </div>
  );
}
