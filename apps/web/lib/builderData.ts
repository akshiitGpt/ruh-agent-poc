// Mock data for the Agent Builder + Agentic Gallery. Everything canned —
// the wizard simulates one build (a Jira Suite) end to end.

export interface GalleryItem {
  id: string;
  name: string;
  kind: "agent" | "workflow";
  description: string;
  usedIn: string[];
  tags: string[];
  version: string;
  status: "published" | "draft";
}

export const galleryItems: GalleryItem[] = [
  {
    id: "ticket-summariser",
    name: "Ticket summariser",
    kind: "agent",
    description:
      "Paste any ticket id and the agent pulls the full thread — description, comments, linked PRs — into one read.",
    usedIn: ["Linear Suite"],
    tags: ["linear", "tickets", "read-only"],
    version: "v1.4",
    status: "published",
  },
  {
    id: "update-notifier",
    name: "Update notifier",
    kind: "agent",
    description:
      "Scheduled sweep of a workspace inbox — summarises what changed and posts the digest to a channel.",
    usedIn: ["Linear Suite"],
    tags: ["scheduled", "digest", "slack"],
    version: "v2.0",
    status: "published",
  },
  {
    id: "ticket-to-code",
    name: "Ticket to code",
    kind: "workflow",
    description:
      "Full pipeline: create ticket → subticket → notify → coding agent → post result. The flagship long-running workflow.",
    usedIn: ["Linear Suite"],
    tags: ["temporal", "coding-agent", "5 nodes"],
    version: "v1.1",
    status: "published",
  },
  {
    id: "channel-digest",
    name: "Channel digest",
    kind: "agent",
    description:
      "Reads a channel's recent history and produces decisions, open questions and action items.",
    usedIn: ["Slack Suite"],
    tags: ["slack", "digest"],
    version: "v1.7",
    status: "published",
  },
  {
    id: "answer-bot",
    name: "Answer bot",
    kind: "agent",
    description:
      "Trigger-based Q&A over workspace context — pinned docs, past threads, the team knowledge base.",
    usedIn: ["Slack Suite"],
    tags: ["rag", "trigger", "mentions"],
    version: "v1.2",
    status: "published",
  },
  {
    id: "standup-runner",
    name: "Standup runner",
    kind: "workflow",
    description:
      "Collect updates → summarise per person → post the thread. The reusable 'gather + condense + post' pattern.",
    usedIn: ["Slack Suite", "Jira Suite (draft)"],
    tags: ["temporal", "scheduled", "3 nodes"],
    version: "v1.3",
    status: "published",
  },
  {
    id: "pr-reviewer",
    name: "PR reviewer",
    kind: "agent",
    description:
      "First-pass PR review: correctness risks, missing tests, and the two comments a human reviewer would leave.",
    usedIn: ["GitHub Suite"],
    tags: ["github", "code-review"],
    version: "v2.1",
    status: "published",
  },
  {
    id: "release-notes",
    name: "Release notes",
    kind: "workflow",
    description:
      "Collect commits → cluster by theme → draft changelog → open PR. Reused anywhere commits become prose.",
    usedIn: ["GitHub Suite"],
    tags: ["temporal", "4 nodes", "llm×2"],
    version: "v1.6",
    status: "published",
  },
  {
    id: "issue-triager",
    name: "Issue triager",
    kind: "agent",
    description:
      "Hourly sweep of new issues: labels, duplicates, owner pings, incident escalation.",
    usedIn: ["GitHub Suite", "Jira Suite (draft)"],
    tags: ["scheduled", "triage"],
    version: "v1.9",
    status: "published",
  },
  {
    id: "meeting-notes",
    name: "Meeting notes agent",
    kind: "agent",
    description:
      "Drop a transcript, get decisions + owners + follow-ups. Built for a client engagement, not yet in a suite.",
    usedIn: [],
    tags: ["transcripts", "draft"],
    version: "v0.3",
    status: "draft",
  },
  {
    id: "escalation-flow",
    name: "Escalation workflow",
    kind: "workflow",
    description:
      "Detect breach → page on-call → open incident channel → post timeline. Awaiting a suite to adopt it.",
    usedIn: [],
    tags: ["temporal", "pagerduty", "draft"],
    version: "v0.5",
    status: "draft",
  },
];

// ————— builds list —————

export interface BuildEntry {
  name: string;
  hue: string;
  glyph: string;
  status: "deployed" | "draft";
  version?: string;
  tasks: number;
  updated: string;
  step?: string;
}

export const builds: BuildEntry[] = [
  {
    name: "Linear Suite",
    hue: "#5E6AD2",
    glyph: "L",
    status: "deployed",
    version: "v1.4",
    tasks: 3,
    updated: "3 weeks ago",
  },
  {
    name: "Slack Suite",
    hue: "#E0AA3E",
    glyph: "S",
    status: "deployed",
    version: "v1.7",
    tasks: 3,
    updated: "2 weeks ago",
  },
  {
    name: "GitHub Suite",
    hue: "#4E937A",
    glyph: "G",
    status: "deployed",
    version: "v2.1",
    tasks: 3,
    updated: "5 days ago",
  },
  {
    name: "Jira Suite",
    hue: "#4B7BE5",
    glyph: "J",
    status: "draft",
    tasks: 3,
    updated: "today",
    step: "Requirements",
  },
];

// ————— the scripted Jira Suite build —————

export const defaultRequirement = `We run engineering on Jira and want a Jira Suite for the marketplace.

Tasks we need:
1. Sprint summariser — paste a sprint id, get progress, risks and spillover in one read.
2. Bug triager — hourly sweep of new bugs: label severity, detect duplicates, ping component owners.
3. Sprint report — every Friday 4pm: collect sprint data, summarise per epic, post the report to #eng-leads and attach it to the Jira board.

Auth via Composio (Jira OAuth per user). Same platform conventions as our other suites — per-user subdomain, shared Ruh session, dark control-room theme but with a Jira-blue accent.`;

export interface PlanTask {
  name: string;
  kind: "agent" | "workflow";
  detail: string;
  tools: string[];
  schedule?: string;
  fromGallery?: string;
}

export const jiraPlan = {
  suiteName: "Jira Suite",
  slug: "jira",
  hue: "#4B7BE5",
  glyph: "J",
  tasks: [
    {
      name: "Sprint summariser",
      kind: "agent",
      detail:
        "On-demand agent. Input: sprint id. Pulls sprint scope, burndown, blocked issues; streams a structured summary.",
      tools: ["jira.get_sprint", "jira.search_issues", "jira.get_issue"],
    },
    {
      name: "Bug triager",
      kind: "agent",
      detail:
        "Scheduled hourly. Labels severity, closes duplicates, pings component owners, escalates P1s to Slack.",
      tools: ["jira.search_issues", "jira.update_issue", "slack.post_message"],
      schedule: "Every hour",
      fromGallery: "Issue triager v1.9 (GitHub Suite) — adapted for Jira fields",
    },
    {
      name: "Sprint report",
      kind: "workflow",
      detail:
        "Temporal workflow, Fridays 16:00. Nodes: collect sprint data → summarise per epic (LLM) → post to #eng-leads → attach to board.",
      tools: ["jira.get_sprint", "slack.post_message", "jira.add_attachment"],
      schedule: "Fridays 16:00",
      fromGallery: "Standup runner v1.3 pattern — gather → condense → post",
    },
  ] as PlanTask[],
  integrations: [
    "Jira Cloud OAuth via Composio (per-user token, org-scoped fallback)",
    "Slack webhook for report + escalation channels",
  ],
  platform: [
    "Standalone deployment from create-ruh-suite template",
    "Subdomain pattern jira-{user}.ruh.ai · JWT scoped {user, org, suite}",
    "Registers in marketplace on publish · RBAC-aware (per-member suite access)",
  ],
};

export const extraPlanTask: PlanTask = {
  name: "Release digest",
  kind: "workflow",
  detail:
    "Added on request. Collect closed issues per release → cluster by epic (LLM) → post digest to #announcements.",
  tools: ["jira.search_issues", "slack.post_message"],
  schedule: "On release",
  fromGallery: "Release notes v1.6 pattern (GitHub Suite)",
};

// ————— PRD —————

export const prdSections = [
  {
    title: "1 · Overview",
    body: [
      "Jira Suite brings sprint intelligence into Ruh: a summariser for humans, a triager for hygiene, and a Friday report nobody has to write.",
      "One repo, one deployment, shared by every install. Users differ by data — tokens, runs, schedules — never by code.",
    ],
  },
  {
    title: "2 · Users & access",
    body: [
      "Installed org-wide by an admin from the marketplace. Every member gets jira-{user}.ruh.ai; per-member suite access is controlled from org settings (suite_access grants).",
      "Suite trusts the platform edge for identity — it receives a scoped JWT, never the raw session.",
    ],
  },
  {
    title: "3 · Tasks",
    body: [
      "Sprint summariser (agent, on-demand): input sprint_id → streamed markdown summary. Tools: jira.get_sprint, jira.search_issues, jira.get_issue.",
      "Bug triager (agent, hourly): severity labels, duplicate detection, owner pings, P1 → Slack escalation. Reuses Issue triager v1.9 prompt scaffold from the gallery.",
      "Sprint report (workflow, Fri 16:00): 4 Temporal nodes — collect → summarise per epic (LLM) → post to #eng-leads → attach to board. Retries ×2, resumes on crash.",
    ],
  },
  {
    title: "4 · Non-functional",
    body: [
      "Streaming: Pi session tokens over SSE; tool-call chips inline. Cron via Temporal Schedules (pausable from the suite UI).",
      "Observability: every run writes run_events; suite activity feeds the org dashboard widgets and the orchestrator agent.",
    ],
  },
  {
    title: "5 · Milestones",
    body: [
      "M1 scaffold + auth gate (day 1) · M2 sprint summariser streaming (day 2) · M3 triager + schedules (day 3) · M4 report workflow + deploy (day 4).",
    ],
  },
];

export const erd = {
  entities: [
    { id: "users", x: 20, y: 20, fields: ["id", "email", "name"] },
    { id: "organizations", x: 20, y: 150, fields: ["id", "name", "plan"] },
    {
      id: "suite_installs",
      x: 230, y: 85,
      fields: ["suite_id", "org_id", "user_id", "subdomain"],
    },
    { id: "tasks", x: 450, y: 20, fields: ["id", "suite_id", "slug", "kind"] },
    {
      id: "runs",
      x: 450, y: 150,
      fields: ["id", "task_id", "user_id", "status", "output"],
    },
    {
      id: "oauth_tokens",
      x: 230, y: 230,
      fields: ["user_id", "provider", "scopes"],
    },
    { id: "run_events", x: 660, y: 150, fields: ["run_id", "at", "type", "detail"] },
  ],
  edges: [
    ["users", "suite_installs"],
    ["organizations", "suite_installs"],
    ["suite_installs", "tasks"],
    ["tasks", "runs"],
    ["runs", "run_events"],
    ["users", "oauth_tokens"],
  ] as [string, string][],
};

// ————— build simulation (Daytona sandbox) —————

export interface BuildLogLine {
  phase: "Scaffold" | "UI" | "Backend" | "Database" | "Agents" | "Tests";
  text: string;
  file?: string;
}

export const buildLog: BuildLogLine[] = [
  { phase: "Scaffold", text: "Booting Daytona sandbox", file: "daytona create jira-suite --template ruh" },
  { phase: "Scaffold", text: "Scaffolding from suite template", file: "bunx create-ruh-suite jira" },
  { phase: "Scaffold", text: "Writing manifest — 3 tasks, 2 schedules", file: "suite.yaml" },
  { phase: "UI", text: "Shell renders from manifest — sidebar, auth gate, theme tokens", file: "app/layout.tsx" },
  { phase: "UI", text: "Task workbench for Sprint summariser — streaming pane + form from input_schema", file: "app/tasks/[task]/page.tsx" },
  { phase: "UI", text: "Workflow rail for Sprint report — 4 nodes, live states", file: "components/WorkflowRail.tsx" },
  { phase: "Backend", text: "Gateway routes — invoke, runs, schedule toggle", file: "server/routes.ts" },
  { phase: "Backend", text: "Wiring Composio Jira toolkit — 6 actions, OAuth per user", file: "server/tools/jira.ts" },
  { phase: "Database", text: "Postgres schema — runs, run_events, oauth_tokens", file: "drizzle/0001_init.sql" },
  { phase: "Database", text: "Migrations applied in sandbox", file: "bun run db:migrate" },
  { phase: "Agents", text: "Sprint summariser — Pi session, prompt + tool schemas cached", file: "agents/sprintSummariser.ts" },
  { phase: "Agents", text: "Bug triager — hourly Temporal schedule registered", file: "workers/schedules.ts" },
  { phase: "Agents", text: "Sprint report workflow — 4 activities on queue suite:jira", file: "workflows/sprintReport.ts" },
  { phase: "Tests", text: "24 tests passed · type-check clean", file: "bun test" },
];

export const deployChecklist = [
  "Production build — 42s, 118 kB first load",
  "Docker image pushed — ruh/jira-suite:1.0.0",
  "Subdomain reserved — jira-{user}.ruh.ai wildcard route",
  "Edge JWT scopes minted — {user, org, suite:jira, install}",
  "Temporal schedules live — bug triager (hourly), sprint report (Fri 16:00)",
  "Marketplace listing created — pending publish",
];
