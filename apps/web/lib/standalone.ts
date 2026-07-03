// Standalone use of gallery items — resolves each gallery entry to the
// simulation content (stream chunks, tool calls, workflow nodes, form
// fields) it needs to run outside any suite.

import { suites, type FieldSpec, type ToolCallSpec, type WorkflowNode } from "./data";
import { galleryItems, type GalleryItem } from "./builderData";

export interface StandaloneContent {
  item: GalleryItem;
  fields: FieldSpec[];
  streamChunks: string[];
  toolCalls: ToolCallSpec[];
  nodes?: WorkflowNode[];
}

// gallery id → the suite task that provides its simulation content
const TASK_SOURCE: Record<string, [string, string]> = {
  "ticket-summariser": ["linear", "summarize-ticket"],
  "update-notifier": ["linear", "update-notifier"],
  "ticket-to-code": ["linear", "ticket-to-code"],
  "channel-digest": ["slack", "channel-digest"],
  "answer-bot": ["slack", "answer-bot"],
  "standup-runner": ["slack", "standup-reminder"],
  "pr-reviewer": ["github", "pr-reviewer"],
  "release-notes": ["github", "release-notes"],
  "issue-triager": ["github", "issue-triager"],
};

// content for gallery drafts that never shipped in a suite
const CUSTOM: Record<string, Omit<StandaloneContent, "item">> = {
  "meeting-notes": {
    fields: [],
    toolCalls: [
      { name: "drive.get_transcript", detail: "42 min", afterChunk: 0 },
    ],
    streamChunks: [
      "Got the transcript — 42 minutes, 5 speakers. Here's the distilled version.\n\n",
      "## Decisions\n- Ship the billing migration behind a flag on Monday\n- Postpone the mobile spike to next cycle\n\n",
      "## Action items\n- **Priya** — draft the rollback runbook (Fri)\n- **John** — confirm usage caps with finance (Wed)\n- **Akshit** — flag cleanup after 2 stable weeks\n\n",
      "**One open question:** who owns the pricing-page copy update? Nobody claimed it — worth a follow-up.",
    ],
  },
  "escalation-flow": {
    fields: [
      {
        key: "severity",
        label: "Severity",
        type: "select",
        options: ["SEV-1", "SEV-2", "SEV-3"],
      },
      {
        key: "summary",
        label: "What happened?",
        type: "text",
        placeholder: "API error rate above 5% in us-east",
      },
    ],
    toolCalls: [],
    streamChunks: [],
    nodes: [
      {
        id: "detect",
        label: "Classify breach",
        kind: "llm",
        description: "LLM node — validates severity against the incident rubric.",
        result: "Confirmed **SEV-2** — error budget breach, no data loss",
      },
      {
        id: "page",
        label: "Page on-call",
        kind: "action",
        description: "Pages the on-call engineer via the escalation policy.",
        result: "Paged **Priya** (primary on-call) — acked in 40s",
      },
      {
        id: "channel",
        label: "Open incident channel",
        kind: "action",
        description: "Creates the incident channel and invites responders.",
        result: "Created **#inc-0231** with 4 responders and the runbook pinned",
      },
      {
        id: "timeline",
        label: "Post timeline",
        kind: "action",
        description: "Posts the live incident timeline and status-page draft.",
        result: "Timeline posted; status-page draft ready for approval",
      },
    ],
  },
};

export function getStandalone(id: string): StandaloneContent | null {
  const item = galleryItems.find((g) => g.id === id);
  if (!item) return null;

  const src = TASK_SOURCE[id];
  if (src) {
    const task = suites
      .find((s) => s.slug === src[0])
      ?.tasks.find((t) => t.slug === src[1]);
    if (task) {
      return {
        item,
        fields: task.fields,
        streamChunks: task.streamChunks,
        toolCalls: task.toolCalls,
        nodes: task.nodes,
      };
    }
  }
  const custom = CUSTOM[id];
  if (custom) return { item, ...custom };
  return { item, fields: [], streamChunks: [], toolCalls: [] };
}
