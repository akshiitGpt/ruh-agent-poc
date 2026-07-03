# Ruh Platform — PoC Architecture

> Status: draft v2 — 2026-07-02
> v2: suites are standalone deployments (one per suite, shared by all its users); users can fork suites; forks are new suites. Per-user isolation stays at the data/auth layer.

## 1. Product model

| Concept | What it is | Example |
|---|---|---|
| **Platform** | ruh.ai — auth, orgs, org switcher, profile/settings, invites, dashboard of installed suites + activity widgets, marketplace, subdomain router | "Welcome back John, here is your Acme dashboard" |
| **Suite** | A themed bundle of tasks. **One repo, one deployment per suite** — shared by every user who installs it. Opened on a per-user subdomain | Linear Suite at `linear-akshit.ruh.ai` |
| **Fork** | A user's customised copy of a suite. Repo fork → **new suite id** → own deployment. Same pipeline as any suite | "Akshit's Linear Suite" |
| **Task** | One runnable unit inside a suite: **Agent** or **Workflow**; either can be **scheduled** (cron) or **triggered** (webhook/event) | "Summarise ticket", "30-min notifier", "ticket → code" |

The unit of code ownership is always the **suite**. Users differ by *data* (installs, tokens, runs, schedules) — never by copies of platform code. 100 users of the Linear Suite = 1 deployment + 100 rows in `suite_installs`.

Interop requirements:

| From → To | Mechanism |
|---|---|
| Agent → Agent | `call_agent` tool → target agent's invoke endpoint (A2A-protocol adapter later for external interop) |
| Agent → Workflow | Tool call that starts a workflow run (fire-and-forget with run id, or await result) |
| Workflow → Agent | An LLM node = activity that runs a Pi session / calls an agent endpoint |
| Workflow → Workflow | Child workflow (or signal to a running one) |

Cross-suite calls go through the platform gateway with scoped tokens, so a suite can only reach agents/workflows the caller's install is allowed to use.

### RBAC: two layers, not one

Access control is deliberately split into two independent checks, because "what can you do" and "what can you see" are different questions:

1. **Role (org-wide)** — `admin` or `member` on the membership row. Governs platform-level actions: invite/remove members, change roles, install/remove suites, org billing. Every admin action gates on this alone.
2. **Suite access (per-member, per-suite)** — a `suite_access` grant, independent of role. Governs which of the org's *installed* suites a given member can actually open. Default is full access to everything installed; an admin can restrict a specific member down to a subset (e.g. John gets Linear + Slack but not GitHub). Admins always bypass this — you can't lock an admin out of an installed suite.

Both checks apply everywhere a suite is reachable: the platform sidebar/dashboard filter suites down to what's accessible before rendering, and the suite's edge-router auth gate re-checks access server-side — so restriction isn't just a hidden sidebar link — a direct subdomain visit is turned away with an explanatory "access restricted" page. The token minted for a suite session (see §4) should carry the resolved access decision, not just role, so the suite itself never has to query the platform to find out if the visiting user is allowed.

## 2. Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Platform web | **Next.js (App Router)** — ruh.ai only | Dashboard, org switcher, marketplace, settings. `dnd-kit` for the draggable widgets. |
| Suite apps | **Suite template** (`create-ruh-suite`) — Next.js + `@ruh/suite-kit` | Each suite repo is scaffolded from the template: shell UI (sidebar, task pages, trigger forms, activity table) comes from `@ruh/suite-kit` components rendering the suite's `suite.yaml`; custom UI is allowed per suite. |
| Edge router | **Wildcard `*.ruh.ai` → routing proxy** (Cloudflare Worker, or the gateway itself for the PoC) | Maps `{suite}-{user}.ruh.ai` → that suite's deployment URL; terminates the platform session and forwards a scoped JWT (see §4). |
| Auth | **Better Auth** (organization plugin), session cookie on `.ruh.ai`; **token exchange** at the edge for suites | Orgs, invites, roles, org switcher nearly free. Suites — especially forked/third-party ones — never see the raw platform session, only a short-lived JWT scoped to `{user, org, suite}`. |
| API gateway | **Bun + Elysia + TypeBox** | Matches existing ruh-agent-gateway conventions. Owns: orgs, suite registry, subdomain map, runs API, token exchange, cross-suite invoke proxy. |
| Agent runtime | **Pi SDK** (pi.dev — `@earendil-works/pi-coding-agent` / `pi-agent-core` / `pi-ai`) — embedded **inside each suite deployment** | `createAgentSession()` per run, `defineTool()` with TypeBox params, event subscription → SSE, `session.abort()` for stop, session fork/resume, unified multi-provider LLM API. Flue is built on this same harness — validation, and a migration path to its per-agent Durable Object deployment model. |
| Workflow engine | **Temporal** (TypeScript SDK) — **shared cluster**, per-suite workers | Each suite deployment runs a worker on task queue `suite:{slug}`. Activities = nodes (LLM node runs a Pi session, non-LLM nodes plain code); Schedules = cron; signals = triggers; child workflows = workflow→workflow. Lighter alternative if needed: Inngest. |
| Integrations | **Composio** (TS SDK) | Per-user OAuth (connected accounts) for Linear, Slack, GitHub; actions exposed as Pi tools and as workflow activities; webhooks start/signal workflows. Entity id = ruh user id, scoped per suite install. |
| Data | **Postgres + Redis** — platform-owned | Suites write runs/events through the platform runs API (scoped token), not raw DB access. Redis pub/sub feeds live activity on both suite pages and the ruh.ai dashboard. |
| LLM | **Claude API** via `pi-ai` | Multi-provider stays a config concern. Optional later: route suite LLM traffic through a platform LLM proxy for metering/billing per suite/user. Enable Anthropic prompt caching for recurring scheduled tasks. |
| Suite hosting | **Scale-to-zero platform** (Cloudflare Workers/Containers, Fly machines, or Vercel projects) | Standalone-per-suite means deployments grow with suites *and forks* — idle forks must cost ~nothing. |
| Builder sandbox (later) | **Daytona** + a Pi-based builder agent | The builder scaffolds from `create-ruh-suite`, fills in manifest + code, tests in Daytona, pushes the repo, triggers deploy, registers the suite. |

Everything is TypeScript — platform, suite template, agents (Pi), workflows (Temporal TS), integrations (Composio TS). TypeBox schemas are shared across gateway validation, Pi tool definitions, and manifest types.

## 3. System diagram

```
 browser: ruh.ai ──► Platform app (Next.js) ─┐
                                             ▼
 browser: linear-akshit.ruh.ai          API gateway (Elysia)
        │                                registry · runs · tokens
        ▼                                    ▲          ▲
 Edge router (*.ruh.ai) ── scoped JWT ──┐    │          │
        │ subdomain → deployment        │    │ runs API │ runs API
        ▼                               ▼    │          │
 ┌─ Linear Suite deployment ─────────────────┴──┐  ┌─ Slack Suite deployment ─┐
 │ suite UI (@ruh/suite-kit)                    │  │  ...                     │
 │ agents (Pi sessions, SSE, invoke endpoints)  │  └──────────────────────────┘
 │ Temporal worker (queue: suite:linear)        │
 └──────────────┬───────────────────────────────┘
                ▼
 Shared services: Temporal cluster · Postgres · Redis · Composio · Claude API
```

## 4. Subdomains, routing, and auth

Deployment is **per suite**; the subdomain is **per user** and is only a routing + identity key.

1. Wildcard DNS `*.ruh.ai` → edge router.
2. Router parses `{suiteSlug}-{userSlug}.ruh.ai`, looks up the install (suite, user, deployment URL) in the registry. No install → redirect to ruh.ai marketplace.
3. Router validates the `.ruh.ai` session cookie against the platform, then **mints a short-lived JWT** scoped to `{user, org, suite, install}` and forwards the request to the suite deployment with that JWT. The platform session cookie is **never** exposed to suite code — mandatory once forks and third-party marketplace suites exist.
4. The suite app trusts only the JWT; it uses the same token to call platform APIs (runs, cross-suite invoke, Composio proxy).

Subdomain strings are reserved in the DB at install time (`subdomain` unique) so marketplace installs can't collide. Local dev: `lvh.me` subdomains + the gateway acting as the router, suites on different ports.

## 5. Suite anatomy — repo, manifest, deployment

Each suite repo (scaffolded by `create-ruh-suite`):

```
linear-suite/
  suite.yaml            # manifest — the registry reads this at publish time
  app/                  # Next.js suite UI; @ruh/suite-kit renders shell from manifest
  agents/
    summarizeTicket.ts  # Pi agent: system prompt + defineTool()s
    updateNotifier.ts
  workflows/
    ticketToCode.ts     # Temporal workflow + activities
  worker.ts             # Temporal worker, task queue suite:linear
```

```yaml
# suite.yaml
id: linear
name: Linear Suite
description: Agents and workflows for Linear
tasks:
  - id: summarize-ticket
    kind: agent                 # agent | workflow
    name: Ticket summariser
    description: Paste a ticket id, get a full summary
    entrypoint: agents/summarizeTicket.ts
    input_schema:               # JSON Schema → trigger form auto-generated
      type: object
      properties:
        ticket_id: { type: string, title: Ticket ID }
      required: [ticket_id]
    output: stream              # stream | record

  - id: update-notifier
    kind: agent
    schedule: "*/30 * * * *"    # Temporal Schedule; runs headless
    channels: [slack]
    entrypoint: agents/updateNotifier.ts

  - id: ticket-to-code
    kind: workflow
    entrypoint: workflows/ticketToCode.ts
    input_schema: { ... }
```

**Publish flow:** suite repo CI → deploy → register `{manifest, version, deployment_url}` with the platform registry. **Install flow:** user clicks add in marketplace → `suite_installs` row + subdomain reservation — no build, no deploy, instant. **Fork flow:** fork repo → edit → publish as new suite id (visibility: private to the user/org, or back to the marketplace) → own deployment via the same CI. Scale-to-zero hosting keeps rarely-used forks effectively free.

This manifest is still the keystone for the Builder: the builder generates a repo from the template (manifest + agent/workflow code), tests it in Daytona, and pushes it through the exact same publish flow a human would use.

## 6. Agent runtime (Pi SDK, inside each suite deployment)

- **Run lifecycle:** `POST /agents/{task}/runs` (on the suite deployment) → verify scoped JWT → create run via platform runs API → `createAgentSession()` with the task's system prompt + tools → `session.subscribe()` events (`message_update` deltas, `tool_execution_start/end`, `turn_start/end`) stream to the browser as SSE **and** post to `run_events`. Stop button → `session.abort()`. Pi's `SessionManager` gives resume/fork of runs.
- **Agent-as-endpoint:** every agent also exposes `POST /agents/{task}/invoke` (JSON in/out) — what other agents and workflow nodes call. Cross-suite calls route through the gateway's invoke proxy for authz. External A2A-protocol interop later = a2a-js adapter wrapping these endpoints.
- **Tools** (Pi `defineTool()`, TypeBox params):
  - Composio actions bound to the calling user's connected account.
  - Web search, file read/write (per-run workspace dir; object storage later).
  - `call_agent(suite, task, input)` — agent→agent bridge.
  - `run_workflow(workflow_id, input, wait)` — agent→workflow bridge (Temporal start / startAndAwait).
  - Subagents: a tool that spins up a nested Pi session with a narrower prompt/toolset.
- **Suite copilot ("Ask {Suite}"):** every suite ships one extra implicit agent — a router exposed as the bottom-right chat on every suite page. Its toolset is generated from the manifest: one `run_task(task_id, input)` tool per task, plus suite context for Q&A. Chat is therefore a second trigger surface over the *same* runs pipeline as the forms — a chat-triggered run creates the same `runs`/`run_events` rows and shows up in the same activity tables. No special manifest work needed per suite; the shell provides the UI, the runtime provides the router agent.
- **Prompt caching:** stable per-task system prompts + tool schemas → Anthropic cache breakpoints via `pi-ai`; matters for every-30-min scheduled tasks.

## 7. Workflow engine (Temporal, shared cluster + per-suite workers)

- A workflow = TS workflow function; each **node is an activity**:
  - Non-LLM node: plain activity (create Linear ticket via Composio, post to Slack, call an API).
  - LLM node: activity that runs a Pi session inline or calls an agent invoke endpoint.
  - Workflow→workflow: `executeChild` (cross-suite via gateway → target queue).
- Task queues are namespaced `suite:{slug}` — a suite's worker only pulls its own work; a misbehaving forked suite can't touch other queues.
- Cron: Temporal **Schedules**, created/paused from the suite UI through the gateway.
- Triggers: Composio webhooks → gateway → `signalWithStart`.
- Every activity reports progress → runs API (`run_events`) + Redis publish → live activity tables.

Example — "ticket to code": `create_ticket` → `create_subticket` → `notify_slack` → `code_agent` (LLM node, long-running activity with heartbeat) → `post_result`. Retries, timeouts, and crash-resume are what Temporal buys over a DIY queue.

## 8. Data model (Postgres, platform-owned; first cut)

```
users(id, email, name, ...)
organizations(id, name, slug)
memberships(user_id, org_id, role)              -- user | admin
suites(id, slug, name, version, manifest jsonb,
       deployment_url, owner_user_id, forked_from_suite_id,
       visibility)                               -- public | org | private
suite_installs(id, suite_id, org_id, user_id, subdomain unique)
suite_access(org_id, suite_id, user_id)          -- explicit grant row; a member
                                                  -- with zero rows for an install
                                                  -- defaults to full access — this
                                                  -- table only ever *restricts*.
                                                  -- admins bypass it entirely.
tasks(id, suite_id, slug, kind, manifest jsonb)  -- denormalised from manifest
runs(id, task_id, install_id, user_id, org_id, kind, status,
     input jsonb, output jsonb, started_at, finished_at)
run_events(id, run_id, seq, type, payload jsonb, created_at)
connected_accounts(user_id, provider, composio_account_id)
schedules(id, task_id, install_id, cron, temporal_schedule_id, enabled)
suite_tokens(id, suite_id, hashed_secret, scopes)  -- suite → platform API auth
```

`runs` + `run_events` power the per-task activity table, the clickable run-detail timeline, and the ruh.ai dashboard widgets. Suites reach this data only through the runs API with scoped tokens.

## 9. Repo layout

Separate repos in production; for the PoC, one monorepo simulating the topology:

```
ruh-agent-poc/
  apps/
    platform-web/        # Next.js — ruh.ai dashboard, marketplace, settings
    gateway/             # Bun + Elysia — registry, runs API, token exchange,
                         #   edge-router role in dev (subdomain → suite port)
  packages/
    suite-kit/           # shell UI components (sidebar, trigger forms, activity table)
    manifest/            # suite.yaml schema + shared TypeBox types
    create-ruh-suite/    # suite template / scaffolder
  suites/                # each of these = a separate repo in production
    linear-suite/        # suite.yaml, app/, agents/, workflows/, worker.ts
  infra/
    docker-compose.yml   # postgres, redis, temporal dev server
```

## 10. Build order

**Phase 1 — platform core:** Better Auth + orgs + invites + org switcher; ruh.ai dashboard shell with widget grid; suite registry; gateway with subdomain routing + JWT token exchange (`lvh.me` locally); profile/settings.

**Phase 2 — suite template + first suite:** `@ruh/suite-kit` + `create-ruh-suite`; Linear suite as the first standalone suite app with exactly three tasks proving the three shapes: (1) streaming ticket-summariser agent, (2) scheduled 30-min notifier → Slack, (3) ticket→subticket→Slack→code Temporal workflow. Runs + run_events + clickable activity throughout.

**Phase 3 — interop + triggers:** `call_agent` across suites via gateway proxy; `run_workflow` tool; LLM node calling an agent; Composio webhook → workflow signal; channels abstraction (Slack first); optional A2A-protocol adapter.

**Phase 4 — marketplace + forks + builder:** publish/install flows, fork-to-new-suite flow, subdomain allocation UX, scale-to-zero suite hosting, admin surface; then the Builder meta-agent (Pi coding agent in RPC mode: requirements → PRD → screens-on-canvas → TRD → generate suite repo in Daytona → test → git push → deploy → register).

## 11. Open decisions

- **Suite hosting target** — Cloudflare (Workers/Containers; pairs well with a later Flue migration, per-agent Durable Objects), Fly machines, or Vercel projects. Decide by Phase 2 deploy; irrelevant for local PoC.
- Temporal vs. lighter (Inngest/Hatchet) — Temporal recommended since ticket→code style workflows are the centrepiece.
- LLM metering: suites call Claude directly with their own key for the PoC; a platform LLM proxy (billing per suite/user) is a marketplace-era concern.
- File storage for agent file-creation: local per-run dir now, S3-compatible later.

## Resolved (v2)

- ~~"PI SDK" meaning~~ → **Pi from pi.dev** (`@earendil-works/*`); Flue is built on the same harness.
- ~~One shared suite shell vs per-user repos~~ → **per-suite repos + standalone per-suite deployments**; per-user isolation is data + scoped JWTs, never code copies. Forks are new suites through the same pipeline.
