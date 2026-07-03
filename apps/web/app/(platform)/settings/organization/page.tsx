import { getSession } from "@/lib/session";
import { members, users, pendingInvites, suites, installs, suiteAccess } from "@/lib/data";
import { InvitePanel } from "@/components/platform/InvitePanel";
import { SuiteAccessMatrix } from "@/components/platform/SuiteAccessMatrix";

const PERMISSIONS: { label: string; admin: boolean; member: boolean }[] = [
  { label: "View dashboard & suite activity", admin: true, member: true },
  { label: "Run agents & workflows", admin: true, member: true },
  { label: "Connect own accounts (Linear, Slack…)", admin: true, member: true },
  { label: "Invite & remove members", admin: true, member: false },
  { label: "Change member roles", admin: true, member: false },
  { label: "Install / remove suites", admin: true, member: false },
  { label: "Manage org billing & settings", admin: true, member: false },
];

export default async function OrgSettingsPage() {
  const { user, org, role } = await getSession();
  if (!user) return null;
  const isAdmin = role === "admin";

  const orgMembers = members
    .filter((m) => m.org === org.id)
    .map((m) => ({
      ...m,
      profile: users.find((u) => u.id === m.user)!,
    }));

  return (
    <div className="max-w-3xl">
      <header className="rise mb-8">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Settings · {org.name}
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
          Organisation
        </h1>
        <p className="mt-2 text-muted">
          {isAdmin
            ? `You're an admin of ${org.name} — invite people, manage roles, and control which suites are installed.`
            : `You're a member of ${org.name}. Org management is limited to admins — ask one to invite teammates or change roles.`}
        </p>
      </header>

      <InvitePanel
        canManage={isAdmin}
        currentEmail={user.email}
        initialMembers={orgMembers.map((m) => ({
          name: m.profile.name,
          email: m.profile.email,
          initials: m.profile.initials,
          role: m.role,
          status: "active" as const,
        }))}
        initialPending={pendingInvites.map((i) => ({
          name: i.email.split("@")[0],
          email: i.email,
          initials: i.email.slice(0, 2).toUpperCase(),
          role: i.role,
          status: "invited" as const,
        }))}
      />

      {isAdmin ? (
        <SuiteAccessMatrix
          suites={(installs[org.id] ?? [])
            .map((slug) => suites.find((s) => s.slug === slug))
            .filter((s): s is (typeof suites)[number] => Boolean(s))
            .map((s) => ({ slug: s.slug, name: s.name, hue: s.hue, glyph: s.glyph }))}
          members={orgMembers
            .filter((m) => m.role !== "admin")
            .map((m) => ({
              userId: m.user,
              name: m.profile.name,
              email: m.profile.email,
              initials: m.profile.initials,
              role: m.role,
            }))}
          initialAccess={suiteAccess[org.id] ?? {}}
        />
      ) : (
        <section
          className="rise mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-line bg-panel px-4 py-3.5"
          style={{ animationDelay: "200ms" }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel2 text-sm">
            🔒
          </span>
          <p className="text-sm text-muted">
            Per-suite access is managed by admins. Suites you can&apos;t open
            won&apos;t appear in your sidebar.
          </p>
        </section>
      )}

      <section
        className="rise mt-6 overflow-hidden rounded-2xl border border-line bg-panel"
        style={{ animationDelay: "280ms" }}
      >
        <header className="border-b border-line px-5 py-3.5">
          <h2 className="font-display text-sm font-semibold">
            Roles &amp; permissions
          </h2>
          <p className="mt-0.5 text-xs text-faint">
            What each role can do in {org.name}. Your role:{" "}
            <span className={isAdmin ? "font-medium text-accent" : "font-medium"}>
              {isAdmin ? "Admin" : "Member"}
            </span>
          </p>
        </header>
        <div className="px-5 py-2">
          <div className="grid grid-cols-[1fr_72px_72px] items-center gap-2 border-b border-line py-2 text-[11px] font-medium tracking-wide text-faint uppercase">
            <span>Permission</span>
            <span className="text-center">Admin</span>
            <span className="text-center">Member</span>
          </div>
          {PERMISSIONS.map((p) => (
            <div
              key={p.label}
              className="grid grid-cols-[1fr_72px_72px] items-center gap-2 border-b border-line py-2.5 text-sm last:border-0"
            >
              <span className="text-muted">{p.label}</span>
              <span className="text-center">
                {p.admin ? (
                  <span className="text-ok">✓</span>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </span>
              <span className="text-center">
                {p.member ? (
                  <span className="text-ok">✓</span>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
