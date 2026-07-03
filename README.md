# Ruh platform — PoC

Architecture: see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Clickable prototype (`apps/web`)

A fully mocked, clickable prototype of the platform — no backend, all fake data.
It simulates the real topology: the ruh.ai dashboard and every per-user suite
subdomain, with real cross-subdomain navigation locally via `lvh.me`
(a public domain whose every subdomain resolves to 127.0.0.1).

```bash
cd apps/web
bun install
bun dev
```

Then open **http://lvh.me:3000** (not localhost — subdomains and the shared
session cookie need a real domain).

### What to try

1. **Sign in** as Akshit on the login screen.
2. **Dashboard** — drag widgets by the ⠿ handle, hide them with ✕, restore
   from the chip row. Switch org (Acme ↔ Globex) and watch suites/activity change.
3. **Open a suite** from the sidebar — you land on
   `linear-akshit.lvh.me:3000`, the dark "control room" theme, with the
   `authenticated via Ruh` chip proving the shared session crossed the subdomain.
4. **Ticket summariser** — submit a ticket id and watch the agent stream with
   inline tool calls; hit Stop mid-run.
5. **Ticket to code** — the "How this workflow runs" viewer explains every
   node (click a step for its description, kind, retry policy and example
   outcome); then start the workflow and watch the same rail execute live.
6. **Recent activity** — click any run row for the event-timeline drawer.
7. **Update notifier** — a scheduled task: cron badge, channel, toggle, Run now.
8. **Ask {Suite}** — the floating chat bottom-right on any suite page. Type
   "summarise ticket AB-284" or "run release notes for v0.4.0" and it triggers
   the same agents/workflows as the forms, streaming the run into the chat.
9. **Marketplace** — install a suite; it reserves a `{suite}-akshit.ruh.ai`
   subdomain (toast).
10. **RBAC** — org settings shows the roles &amp; permissions matrix. As Akshit
    (admin): invite with a role, resend/revoke, "Simulate accept", change roles,
    remove members. Sign in as John (member): invites locked, roles read-only,
    marketplace installs show "Admins only".
11. **Per-suite access** — still in org settings, the "Suite access" grid lets
    an admin grant/revoke each *individual* installed suite per member (not
    just role-wide permissions). John starts with Linear + Slack but no
    GitHub — toggle it and his sidebar/dashboard update instantly, and
    visiting `github-john.lvh.me:3000` directly shows an "Access restricted"
    gate instead of the suite.
11. **Auth boundaries** — visit `linear-john.lvh.me:3000` while signed in as
    Akshit, or sign out and open any suite URL.

### Theming intent

Two themes are deliberate: warm paper for the platform (home base), dark
control-room for suites (the agent's territory). The theme flip communicates
the subdomain/deployment boundary from the architecture.

### Prototype ≠ architecture shortcut

The real design deploys each suite standalone behind an edge router. The
prototype serves everything from one Next.js app purely so you can click
around; the middleware's host-based rewrite plays the edge router's role.
