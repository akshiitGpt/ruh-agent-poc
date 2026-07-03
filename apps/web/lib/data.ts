export type TaskKind = "agent" | "workflow";
export type RunStatus = "succeeded" | "failed" | "running";

export interface FieldSpec {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: string[];
}

export interface WorkflowNode {
  id: string;
  label: string;
  kind: "llm" | "action";
  description: string;
  result: string;
}

export type Role = "admin" | "member";

export function getRole(userId: string, orgId: string): Role | null {
  const m = members.find((m) => m.user === userId && m.org === orgId);
  return (m?.role as Role) ?? null;
}

export function orgsForUser(userId: string) {
  return orgs.filter((o) =>
    members.some((m) => m.user === userId && m.org === o.id)
  );
}

export interface ToolCallSpec {
  name: string;
  detail: string;
  afterChunk: number;
}

export interface Task {
  slug: string;
  name: string;
  description: string;
  kind: TaskKind;
  schedule?: string;
  scheduleHuman?: string;
  trigger?: string;
  channels?: string[];
  fields: FieldSpec[];
  nodes?: WorkflowNode[];
  streamChunks: string[];
  toolCalls: ToolCallSpec[];
}

export interface Suite {
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
  hue: string;
  glyph: string;
  tasks: Task[];
}

export interface RunEvent {
  at: string;
  type: "started" | "tool" | "node" | "text" | "finished" | "error";
  label: string;
  detail?: string;
}

export interface Run {
  id: string;
  display: string;
  suite: string;
  task: string;
  user: string;
  status: RunStatus;
  startedAt: number;
  duration: string;
  input: Record<string, string>;
  summary: string;
  output: string;
  events: RunEvent[];
}

export const NOW = new Date("2026-07-02T11:30:00").getTime();

export const users = [
  { id: "akshit", name: "Akshit", email: "akshit@ruh.ai", initials: "AK" },
  { id: "john", name: "John", email: "john@acme.com", initials: "JO" },
];

export const orgs = [
  { id: "acme", name: "Acme Corp", plan: "Team" },
  { id: "globex", name: "Globex Labs", plan: "Starter" },
];

export const members = [
  { user: "akshit", org: "acme", role: "admin", status: "active" },
  { user: "john", org: "acme", role: "member", status: "active" },
  { user: "akshit", org: "globex", role: "admin", status: "active" },
];

export const pendingInvites = [
  { email: "priya@acme.com", role: "member", sent: "2 days ago" },
];

// suite installs per org — which suites appear in the sidebar
export const installs: Record<string, string[]> = {
  acme: ["linear", "slack", "github"],
  globex: ["github"],
};

// per-member suite access overrides. Admins always see every installed
// suite; a member with no entry here also gets every installed suite —
// this map only ever *restricts* a member down to a subset.
export const suiteAccess: Record<string, Record<string, string[]>> = {
  acme: {
    john: ["linear", "slack"],
  },
};

export function accessibleSuites(
  userId: string,
  orgId: string,
  role: Role | null
): string[] {
  const installed = installs[orgId] ?? [];
  if (role === "admin") return installed;
  const override = suiteAccess[orgId]?.[userId];
  if (!override) return installed;
  return installed.filter((s) => override.includes(s));
}

export function hasSuiteAccess(
  userId: string,
  orgId: string,
  suiteSlug: string,
  role: Role | null
): boolean {
  return accessibleSuites(userId, orgId, role).includes(suiteSlug);
}

export const suites: Suite[] = [
  {
    slug: "linear",
    name: "Linear Suite",
    tagline: "Tickets, triage and delivery",
    blurb:
      "Agents and workflows wired into your Linear workspace — summarise tickets, watch for updates, and take a ticket all the way to shipped code.",
    hue: "#5E6AD2",
    glyph: "L",
    tasks: [
      {
        slug: "summarize-ticket",
        name: "Ticket summariser",
        description:
          "Paste any ticket id and the agent pulls the full thread — description, comments, linked PRs — and gives you the state of play in one read.",
        kind: "agent",
        fields: [
          {
            key: "ticket_id",
            label: "Ticket ID",
            type: "text",
            placeholder: "AB-284",
          },
        ],
        toolCalls: [
          { name: "linear.get_issue", detail: "AB-284", afterChunk: 0 },
          { name: "linear.list_comments", detail: "12 comments", afterChunk: 1 },
          { name: "github.get_pr", detail: "#1142 linked", afterChunk: 3 },
        ],
        streamChunks: [
          "## AB-284 — Session expiry on suite subdomains\n\n",
          "**Status:** In progress · **Assignee:** Priya · **Priority:** Urgent\n\n",
          "**The short version:** users signed in on ruh.ai are getting bounced to login when they open a suite subdomain. Root cause is the session cookie being scoped to the exact host instead of the parent domain.\n\n",
          "**Thread highlights:**\n- Priya reproduced it on Safari only — cookie `SameSite` handling differs\n- Fix proposed: set cookie domain to `.ruh.ai` at issue time\n- Linked PR #1142 implements the change, awaiting review from John\n\n",
          "**Suggested next step:** approve PR #1142 and add a regression test for cross-subdomain auth.",
        ],
      },
      {
        slug: "update-notifier",
        name: "Update notifier",
        description:
          "Every 30 minutes, checks your Linear inbox for new updates and notifications, summarises what changed, and posts the digest to Slack.",
        kind: "agent",
        schedule: "*/30 * * * *",
        scheduleHuman: "Every 30 minutes",
        channels: ["slack #linear-digest"],
        fields: [],
        toolCalls: [
          { name: "linear.list_notifications", detail: "4 new", afterChunk: 0 },
          { name: "slack.send_message", detail: "#linear-digest", afterChunk: 2 },
        ],
        streamChunks: [
          "Checked inbox — 4 new updates since 11:00.\n\n",
          "- AB-284 moved to **In review** (Priya)\n- AB-291 new comment from John: \"blocked on infra\"\n- AB-263 marked **Done**\n- New urgent ticket AB-297: subdomain routing 404s\n\n",
          "Digest posted to #linear-digest.",
        ],
      },
      {
        slug: "ticket-to-code",
        name: "Ticket to code",
        description:
          "The full pipeline: creates the ticket, breaks it into a subticket, notifies the team on Slack, hands it to the coding agent, and posts the result back.",
        kind: "workflow",
        fields: [
          {
            key: "title",
            label: "Task title",
            type: "text",
            placeholder: "Add rate limiting to the runs API",
          },
          {
            key: "detail",
            label: "What should be built?",
            type: "textarea",
            placeholder: "Describe the change, constraints, and where it lives…",
          },
        ],
        nodes: [
          {
            id: "create-ticket",
            label: "Create ticket",
            kind: "action",
            description:
              "Creates the Linear ticket from your form input via the connected Linear account — sets team, cycle and priority.",
            result: "Created **AB-297** — title from the form, added to the current cycle",
          },
          {
            id: "create-subticket",
            label: "Create subticket",
            kind: "action",
            description:
              "Breaks the ticket into an implementation subticket with an acceptance checklist, linked as a child issue.",
            result: "Created **AB-298** under AB-297 with the implementation checklist",
          },
          {
            id: "notify",
            label: "Notify Slack",
            kind: "action",
            description:
              "Posts a kickoff message with both ticket links to the team channel so everyone knows work has started.",
            result: "Posted kickoff message to **#eng-linear** with both ticket links",
          },
          {
            id: "code",
            label: "Coding agent",
            kind: "llm",
            description:
              "Long-running LLM node — a Pi agent session picks up the subticket, writes the change in a sandbox, runs tests and opens a PR. Heartbeats while running.",
            result:
              "Coding agent finished in 14m — branch `feat/AB-297` pushed, PR **gateway#1151** opened with tests passing",
          },
          {
            id: "result",
            label: "Post result",
            kind: "action",
            description:
              "Posts the PR link back to the ticket and the Slack thread, then moves the ticket to In review.",
            result: "PR link posted back to AB-297 and the Slack thread; ticket moved to **In review**",
          },
        ],
        toolCalls: [],
        streamChunks: [],
      },
    ],
  },
  {
    slug: "slack",
    name: "Slack Suite",
    tagline: "Channels, digests and answers",
    blurb:
      "Keep on top of busy channels — digest what happened while you were away, run standup automatically, and answer questions from your team's context.",
    hue: "#E0AA3E",
    glyph: "S",
    tasks: [
      {
        slug: "channel-digest",
        name: "Channel digest",
        description:
          "Point it at a channel and a timeframe; it reads the history and returns the decisions, questions and action items — not the noise.",
        kind: "agent",
        fields: [
          {
            key: "channel",
            label: "Channel",
            type: "text",
            placeholder: "#platform-eng",
          },
          {
            key: "window",
            label: "Timeframe",
            type: "select",
            options: ["Last 24 hours", "Last 3 days", "Last week"],
          },
        ],
        toolCalls: [
          { name: "slack.read_channel", detail: "182 messages", afterChunk: 0 },
          { name: "slack.read_thread", detail: "3 threads", afterChunk: 1 },
        ],
        streamChunks: [
          "## #platform-eng — last 24 hours\n\n",
          "**Decisions**\n- Suites will deploy standalone, one deployment per suite (thread, 14 replies)\n- Temporal chosen over Inngest for the workflow engine\n\n",
          "**Open questions**\n- Who owns the edge-router token exchange? (Priya asked, unanswered)\n\n",
          "**Action items**\n- @akshit to scaffold the suite template repo\n- @john to review PR #1142 before Friday",
        ],
      },
      {
        slug: "standup-reminder",
        name: "Standup runner",
        description:
          "Weekday mornings: collects updates posted overnight, summarises each person's status, and posts the standup thread to #standup.",
        kind: "workflow",
        schedule: "0 9 * * 1-5",
        scheduleHuman: "Weekdays at 9:00",
        channels: ["slack #standup"],
        fields: [],
        nodes: [
          {
            id: "collect",
            label: "Collect updates",
            kind: "action",
            description:
              "Reads the overnight messages from #standup-input via the connected Slack account.",
            result: "Collected 7 overnight updates from **#standup-input**",
          },
          {
            id: "summarize",
            label: "Summarise",
            kind: "llm",
            description:
              "LLM node — a Pi session condenses each person's update into one status line and flags blockers.",
            result: "Summarised per-person status; flagged 1 blocker (Priya, waiting on infra)",
          },
          {
            id: "post",
            label: "Post to #standup",
            kind: "action",
            description:
              "Posts the formatted standup thread to #standup and tags anyone whose blocker needs an owner.",
            result: "Posted the standup thread to **#standup**, tagged the blocker owner",
          },
        ],
        toolCalls: [],
        streamChunks: [],
      },
      {
        slug: "answer-bot",
        name: "Answer bot",
        description:
          "Mention it in any channel and it answers from your workspace context — pinned docs, past threads, and the team knowledge base.",
        kind: "agent",
        trigger: "On @ruh mention",
        fields: [
          {
            key: "question",
            label: "Try a question",
            type: "text",
            placeholder: "How do suite subdomains authenticate?",
          },
        ],
        toolCalls: [
          { name: "slack.search_public", detail: "9 threads", afterChunk: 0 },
          { name: "notion.fetch", detail: "Auth design doc", afterChunk: 1 },
        ],
        streamChunks: [
          "Suite subdomains authenticate through the platform edge router. ",
          "The `.ruh.ai` session cookie is validated at the edge, which then mints a short-lived JWT scoped to the user, org and suite. ",
          "Suite code never sees the raw session — see the auth design doc (linked) and the thread from June 24 in #platform-eng.",
        ],
      },
    ],
  },
  {
    slug: "github",
    name: "GitHub Suite",
    tagline: "Reviews, releases and triage",
    blurb:
      "Code-side automation — first-pass PR reviews with real findings, release notes drafted from commit history, and issues triaged hourly.",
    hue: "#4E937A",
    glyph: "G",
    tasks: [
      {
        slug: "pr-reviewer",
        name: "PR reviewer",
        description:
          "Drop a PR link and get a first-pass review: correctness risks, missing tests, and the two comments a human reviewer would have left anyway.",
        kind: "agent",
        fields: [
          {
            key: "pr_url",
            label: "Pull request",
            type: "text",
            placeholder: "github.com/ruh-ai/gateway/pull/1142",
          },
        ],
        toolCalls: [
          { name: "github.get_pr_diff", detail: "+412 −88", afterChunk: 0 },
          { name: "github.list_checks", detail: "CI green", afterChunk: 2 },
        ],
        streamChunks: [
          "## Review — gateway#1142: cookie domain fix\n\n",
          "**Looks correct overall.** The cookie domain change to `.ruh.ai` is right, and the middleware test covers the happy path.\n\n",
          "**Two things before merge:**\n1. `session.ts:41` — the domain string is hardcoded; it should come from config or staging subdomains will break.\n2. No test for the Safari `SameSite` case that motivated this fix — add one regression test.\n\n",
          "**Verdict:** approve after the config change. Risk is low; the blast radius is login only.",
        ],
      },
      {
        slug: "release-notes",
        name: "Release notes",
        description:
          "Give it a tag and it collects the commits since the last release, clusters them by theme, drafts the notes, and opens a PR with the changelog.",
        kind: "workflow",
        fields: [
          {
            key: "tag",
            label: "Release tag",
            type: "text",
            placeholder: "v0.4.0",
          },
        ],
        nodes: [
          {
            id: "collect",
            label: "Collect commits",
            kind: "action",
            description:
              "Lists every commit since the previous release tag from the GitHub API, with authors and linked PRs.",
            result: "Collected 38 commits since **v0.3.2** across 6 contributors",
          },
          {
            id: "cluster",
            label: "Cluster by theme",
            kind: "llm",
            description:
              "LLM node — groups the commits into themes (features, fixes, breaking changes) instead of a raw list.",
            result: "Clustered into 5 themes: auth, routing, workflows, DX, fixes",
          },
          {
            id: "draft",
            label: "Draft notes",
            kind: "llm",
            description:
              "LLM node — writes the changelog entries per theme with highlights and breaking-change callouts.",
            result: "Drafted the changelog with highlights and breaking-change callouts",
          },
          {
            id: "pr",
            label: "Open PR",
            kind: "action",
            description:
              "Opens a pull request updating CHANGELOG.md with the draft, labelled release, and requests review.",
            result: "Opened **gateway#1150** updating CHANGELOG.md, labelled `release`",
          },
        ],
        toolCalls: [],
        streamChunks: [],
      },
      {
        slug: "issue-triager",
        name: "Issue triager",
        description:
          "Hourly sweep of new issues: labels them, flags duplicates, pings the right owner, and escalates anything that smells like an incident.",
        kind: "agent",
        schedule: "0 * * * *",
        scheduleHuman: "Every hour",
        channels: ["slack #github-triage"],
        fields: [],
        toolCalls: [
          { name: "github.list_issues", detail: "3 new", afterChunk: 0 },
          { name: "github.add_labels", detail: "3 issues", afterChunk: 1 },
        ],
        streamChunks: [
          "Swept 3 new issues.\n\n",
          "- #331 labelled `bug`, `auth` — assigned to Priya (owns session code)\n- #332 duplicate of #318, closed with a link\n- #333 labelled `docs`\n\n",
          "Nothing incident-shaped this hour.",
        ],
      },
    ],
  },
];

export const marketplaceExtras = [
  {
    slug: "notion",
    name: "Notion Suite",
    tagline: "Docs, wikis and meeting notes",
    hue: "#8A8A8A",
    glyph: "N",
  },
  {
    slug: "jira",
    name: "Jira Suite",
    tagline: "Sprints, epics and boards",
    hue: "#4C9AFF",
    glyph: "J",
  },
  {
    slug: "gmail",
    name: "Gmail Suite",
    tagline: "Inbox triage and drafting",
    hue: "#C4574B",
    glyph: "M",
  },
];

export function getSuite(slug: string): Suite | undefined {
  return suites.find((s) => s.slug === slug);
}

export function getTask(suiteSlug: string, taskSlug: string): Task | undefined {
  return getSuite(suiteSlug)?.tasks.find((t) => t.slug === taskSlug);
}

export function suiteUrl(suite: string, user: string, path = "") {
  return `/suite/${suite}/${user}${path}`;
}

export function rootUrl(path = "") {
  return path || "/";
}

export function prettyHost(suite: string, user: string) {
  return `${suite}-${user}.ruh.ai`;
}

export function timeAgo(ts: number): string {
  const mins = Math.max(1, Math.round((NOW - ts) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function clock(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const SAMPLE_INPUTS: Record<string, Record<string, string>[]> = {
  "linear/summarize-ticket": [
    { ticket_id: "AB-284" },
    { ticket_id: "AB-291" },
    { ticket_id: "AB-263" },
    { ticket_id: "AB-249" },
  ],
  "linear/update-notifier": [{}, {}, {}, {}, {}, {}],
  "linear/ticket-to-code": [
    { title: "Add rate limiting to runs API" },
    { title: "Fix cookie domain on subdomains" },
    { title: "Widget drag persistence" },
  ],
  "slack/channel-digest": [
    { channel: "#platform-eng", window: "Last 24 hours" },
    { channel: "#design", window: "Last 3 days" },
    { channel: "#incidents", window: "Last 24 hours" },
  ],
  "slack/standup-reminder": [{}, {}, {}, {}],
  "slack/answer-bot": [
    { question: "How do suite subdomains authenticate?" },
    { question: "Where is the manifest schema defined?" },
  ],
  "github/pr-reviewer": [
    { pr_url: "ruh-ai/gateway#1142" },
    { pr_url: "ruh-ai/web#387" },
    { pr_url: "ruh-ai/suite-kit#52" },
  ],
  "github/release-notes": [{ tag: "v0.4.0" }, { tag: "v0.3.2" }],
  "github/issue-triager": [{}, {}, {}, {}, {}],
};

const SAMPLE_SUMMARIES: Record<string, string[]> = {
  "linear/summarize-ticket": [
    "AB-284 is in review — PR #1142 fixes the cookie domain, awaiting John.",
    "AB-291 blocked on infra; two comments since yesterday.",
    "AB-263 shipped and verified; safe to close the parent.",
    "AB-249 stale for 6 days — suggested a nudge to the assignee.",
  ],
  "linear/update-notifier": [
    "4 updates — 1 urgent ticket opened, digest posted to #linear-digest.",
    "2 updates — AB-284 moved to In review.",
    "No new updates this window; skipped the post.",
    "6 updates — sprint board reshuffled, digest posted.",
    "1 update — AB-263 marked Done.",
    "3 updates — digest posted to #linear-digest.",
  ],
  "linear/ticket-to-code": [
    "AB-297 created with subticket AB-298; branch pushed, PR opened and linked.",
    "AB-289 created; coding agent finished in 14m, result posted to Slack.",
    "Failed at coding agent — sandbox timed out after 2 retries.",
  ],
  "slack/channel-digest": [
    "2 decisions, 1 open question, 2 action items from 182 messages.",
    "Design review recap — 3 decisions, mockups linked.",
    "Quiet channel — nothing decision-shaped in the window.",
  ],
  "slack/standup-reminder": [
    "Standup posted — 6 of 7 updates in, Priya flagged a blocker.",
    "Standup posted — all clear, no blockers.",
    "Standup posted — 2 people out, notes carried over.",
    "Failed — Slack API rate-limited the post, will retry next run.",
  ],
  "slack/answer-bot": [
    "Answered from the auth design doc + 2 threads.",
    "Pointed to packages/manifest with a code snippet.",
  ],
  "github/pr-reviewer": [
    "Approve after config change — 2 findings, risk low.",
    "Requested changes — missing migration for the new column.",
    "Clean — one nit on naming, otherwise ship it.",
  ],
  "github/release-notes": [
    "38 commits clustered into 5 themes; changelog PR #1150 opened.",
    "12 commits, patch release; PR opened and auto-labelled.",
  ],
  "github/issue-triager": [
    "3 issues labelled, 1 duplicate closed.",
    "Quiet hour — nothing new.",
    "5 issues triaged, 1 escalated to #incidents.",
    "2 issues labelled and assigned.",
    "1 issue labelled `docs`.",
  ],
};

function buildEvents(
  suite: Suite,
  task: Task,
  status: RunStatus,
  startedAt: number,
  durationSec: number,
  summary: string
): RunEvent[] {
  const events: RunEvent[] = [
    { at: clock(startedAt), type: "started", label: "Run started", detail: task.kind },
  ];
  let cursor = startedAt;
  const step = (durationSec * 1000) / ((task.nodes?.length ?? task.toolCalls.length) + 2);

  if (task.kind === "workflow" && task.nodes) {
    for (let i = 0; i < task.nodes.length; i++) {
      cursor += step;
      const node = task.nodes[i];
      const failsHere = status === "failed" && i === task.nodes.length - 2;
      events.push({
        at: clock(cursor),
        type: failsHere ? "error" : "node",
        label: `${node.label} ${failsHere ? "failed" : "completed"}`,
        detail: node.kind === "llm" ? "LLM node · Pi session" : "action node",
      });
      if (failsHere) {
        events.push({
          at: clock(cursor + 400),
          type: "error",
          label: "Run failed",
          detail: "2 retries exhausted",
        });
        return events;
      }
    }
  } else {
    for (const tc of task.toolCalls) {
      cursor += step;
      events.push({
        at: clock(cursor),
        type: "tool",
        label: tc.name,
        detail: tc.detail,
      });
    }
    if (status === "failed") {
      events.push({
        at: clock(cursor + step),
        type: "error",
        label: "Run failed",
        detail: "Upstream API returned 429",
      });
      return events;
    }
    events.push({
      at: clock(cursor + step * 0.5),
      type: "text",
      label: "Response streamed",
      detail: `${(task.streamChunks.join("").length / 4) | 0} tokens`,
    });
  }

  if (status !== "running") {
    events.push({
      at: clock(startedAt + durationSec * 1000),
      type: "finished",
      label: "Run succeeded",
      detail: summary,
    });
  }
  return events;
}

function buildOutput(task: Task, status: RunStatus, summary: string): string {
  if (task.kind === "workflow" && task.nodes) {
    const lines: string[] = [];
    for (let i = 0; i < task.nodes.length; i++) {
      const n = task.nodes[i];
      const failsHere = status === "failed" && i === task.nodes.length - 2;
      if (failsHere) {
        lines.push(`- ✕ **${n.label}** — failed after 2 retries: ${summary}`);
        lines.push(`\nRemaining nodes were skipped. The run can be retried from this node.`);
        return lines.join("\n");
      }
      lines.push(`- ✓ **${n.label}** — ${n.result}`);
    }
    lines.push(`\n**Outcome:** ${summary}`);
    return lines.join("\n");
  }
  const full = task.streamChunks.join("");
  if (status === "failed") {
    const partial = task.streamChunks[0] ?? "";
    return `${partial}\n**Error:** upstream API returned 429 — the run was aborted after 3 retries. ${summary}`;
  }
  return full || summary;
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRuns(): Run[] {
  const rand = mulberry(42);
  const runs: Run[] = [];
  const statusCycle: RunStatus[] = [
    "succeeded",
    "succeeded",
    "succeeded",
    "failed",
    "succeeded",
  ];

  for (const suite of suites) {
    for (const task of suite.tasks) {
      const key = `${suite.slug}/${task.slug}`;
      const inputs = SAMPLE_INPUTS[key] ?? [{}];
      const summaries = SAMPLE_SUMMARIES[key] ?? ["Completed."];
      const count = inputs.length;
      for (let i = 0; i < count; i++) {
        const status = statusCycle[(i + task.slug.length) % statusCycle.length];
        const ageMin =
          8 + i * (task.schedule ? 30 : 173) + Math.floor(rand() * 40);
        const startedAt = NOW - ageMin * 60000;
        const durationSec =
          task.kind === "workflow"
            ? 90 + Math.floor(rand() * 700)
            : 4 + Math.floor(rand() * 38);
        const summary = summaries[i % summaries.length];
        const finalStatus: RunStatus = summary.startsWith("Failed")
          ? "failed"
          : status;
        let seedStr = 0;
        for (const ch of `${suite.slug}/${task.slug}/${i}`)
          seedStr = (seedStr * 31 + ch.charCodeAt(0)) | 0;
        const hash = ((Math.imul(seedStr, 2654435761) >>> 16) % 0xffff)
          .toString(16)
          .padStart(4, "0");
        runs.push({
          id: `run_${suite.slug}_${task.slug}_${i}`,
          display: `#${hash}`,
          suite: suite.slug,
          task: task.slug,
          user: "akshit",
          status: finalStatus,
          startedAt,
          duration:
            durationSec >= 60
              ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
              : `${durationSec}s`,
          input: inputs[i],
          summary,
          output: buildOutput(task, finalStatus, summary),
          events: buildEvents(suite, task, finalStatus, startedAt, durationSec, summary),
        });
      }
    }
  }
  return runs.sort((a, b) => b.startedAt - a.startedAt);
}

export const seededRuns: Run[] = generateRuns();

export function runsFor(suite: string, task?: string): Run[] {
  return seededRuns.filter(
    (r) => r.suite === suite && (task ? r.task === task : true)
  );
}
