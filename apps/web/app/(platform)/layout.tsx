import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { suites, suiteUrl, orgsForUser, accessibleSuites, installs } from "@/lib/data";
import { OrgSwitcher } from "@/components/platform/OrgSwitcher";
import { UserMenu } from "@/components/platform/UserMenu";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, org, role } = await getSession();
  if (!user) redirect("/login");

  const accessibleSlugs = accessibleSuites(user.id, org.id, role);
  const installed = suites.filter((s) => accessibleSlugs.includes(s.slug));
  const installedCount = installs[org.id]?.length ?? 0;
  const restrictedCount = installedCount - installed.length;
  const userOrgs = orgsForUser(user.id);

  return (
    <div data-theme="paper" className="atmosphere min-h-screen bg-bg">
      <div className="mx-auto flex min-h-screen max-w-350">
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-panel/60 px-4 py-5 backdrop-blur">
          <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-sm font-bold text-bg">
              ر
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Ruh
            </span>
            <span className="ml-auto rounded-full border border-line bg-panel px-2 py-0.5 font-mono text-[10px] text-faint">
              PoC
            </span>
          </Link>

          <OrgSwitcher
            currentOrg={org.id}
            orgs={userOrgs}
            role={role ?? "member"}
          />

          <nav className="mt-6 space-y-0.5">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-panel2"
            >
              <GlyphSquare>▦</GlyphSquare> Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink"
            >
              <GlyphSquare>✦</GlyphSquare> Marketplace
            </Link>
            <Link
              href="/gallery"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink"
            >
              <GlyphSquare>▤</GlyphSquare> Agentic gallery
            </Link>
            <Link
              href="/agents"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink"
            >
              <GlyphSquare>▣</GlyphSquare> My agents
            </Link>
          </nav>

          {role === "admin" && (
            <>
              <p className="mt-7 mb-2 px-3 text-xs font-medium tracking-wide text-faint uppercase">
                Build studio
              </p>
              <nav className="space-y-0.5">
                <Link
                  href="/builder"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink"
                >
                  <GlyphSquare>⚒</GlyphSquare> Agent builder
                </Link>
              </nav>
            </>
          )}

          <p className="mt-7 mb-2 px-3 text-xs font-medium tracking-wide text-faint uppercase">
            Agentic suites
          </p>
          <div className="space-y-0.5">
            {installed.map((s) => (
              <a
                key={s.slug}
                href={suiteUrl(s.slug, user.id)}
                className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-panel2 hover:text-ink"
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded font-display text-[11px] font-bold text-white"
                  style={{ background: s.hue }}
                >
                  {s.glyph}
                </span>
                <span className="flex-1">{s.name}</span>
                <span className="text-xs text-faint opacity-0 transition-opacity group-hover:opacity-100">
                  ↗
                </span>
              </a>
            ))}
            {installed.length === 0 && (
              <p className="px-3 py-2 text-sm text-faint">
                {installedCount === 0
                  ? "No suites installed in this org yet."
                  : "An admin hasn't granted you access to any suite yet."}
              </p>
            )}
          </div>
          {restrictedCount > 0 && (
            <p className="mt-2 px-3 font-mono text-[10px] text-faint">
              🔒 {restrictedCount} more installed — restricted by your admin
            </p>
          )}

          <div className="mt-auto border-t border-line pt-3">
            <UserMenu name={user.name} email={user.email} initials={user.initials} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}

function GlyphSquare({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded bg-panel2 text-[11px] text-muted">
      {children}
    </span>
  );
}
