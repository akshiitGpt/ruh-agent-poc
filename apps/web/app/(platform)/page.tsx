import { getSession } from "@/lib/session";
import {
  suites,
  seededRuns,
  suiteUrl,
  timeAgo,
  NOW,
  accessibleSuites,
} from "@/lib/data";
import { WidgetGrid, type DashboardData } from "@/components/platform/WidgetGrid";
import { OrchestratorChat } from "@/components/platform/OrchestratorChat";

export default async function DashboardPage() {
  const { user, org, role } = await getSession();
  if (!user) return null;

  const installedSlugs = accessibleSuites(user.id, org.id, role);
  const installed = suites.filter((s) => installedSlugs.includes(s.slug));

  const activity = seededRuns
    .filter((r) => installedSlugs.includes(r.suite))
    .slice(0, 8)
    .map((r) => {
      const suite = suites.find((s) => s.slug === r.suite)!;
      const task = suite.tasks.find((t) => t.slug === r.task)!;
      return {
        id: r.id,
        display: r.display,
        suiteName: suite.name,
        hue: suite.hue,
        glyph: suite.glyph,
        taskName: task.name,
        status: r.status,
        ago: timeAgo(r.startedAt),
        summary: r.summary,
        href: suiteUrl(r.suite, user.id, `/tasks/${r.task}`),
      };
    });

  const day = 24 * 60 * 60 * 1000;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chart = Array.from({ length: 7 }, (_, i) => {
    const start = NOW - (6 - i) * day;
    const count = seededRuns.filter(
      (r) =>
        installedSlugs.includes(r.suite) &&
        r.startedAt >= start - day / 2 &&
        r.startedAt < start + day / 2
    ).length;
    return {
      label: dayNames[new Date(start).getDay()],
      count: count + ((i * 7) % 9) + 2,
    };
  });

  const schedules = installed.flatMap((s) =>
    s.tasks
      .filter((t) => t.schedule)
      .map((t) => ({
        suiteName: s.name,
        hue: s.hue,
        glyph: s.glyph,
        name: t.name,
        human: t.scheduleHuman ?? t.schedule!,
        href: suiteUrl(s.slug, user.id, `/tasks/${t.slug}`),
      }))
  );

  const accounts = [
    { name: "Linear", connected: installedSlugs.includes("linear"), hue: "#5E6AD2" },
    { name: "Slack", connected: true, hue: "#E0AA3E" },
    { name: "GitHub", connected: installedSlugs.includes("github"), hue: "#4E937A" },
    { name: "Notion", connected: false, hue: "#8A8A8A" },
  ];

  const data: DashboardData = { activity, chart, schedules, accounts };

  return (
    <div>
      <header className="rise mb-8">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          {org.name} · {installed.length} suites active
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
          Welcome back, {user.name}.
          <span className="text-muted"> Here is your {org.name} dashboard.</span>
        </h1>
      </header>
      <WidgetGrid data={data} />
      <OrchestratorChat
        suites={installed}
        userId={user.id}
        userInitials={user.initials}
      />
    </div>
  );
}
