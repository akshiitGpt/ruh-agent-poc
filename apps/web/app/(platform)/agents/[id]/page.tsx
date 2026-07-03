import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getStandalone } from "@/lib/standalone";
import { AgentChat } from "@/components/standalone/AgentChat";
import { WorkflowRunner } from "@/components/standalone/WorkflowRunner";

export default async function StandaloneItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getSession();
  if (!user) return null;

  const { id } = await params;
  const content = getStandalone(id);
  if (!content) notFound();
  const { item } = content;

  return (
    <div>
      <header className="rise mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-wide text-faint uppercase">
            <Link href="/agents" className="hover:text-accent">
              My agents
            </Link>{" "}
            · standalone {item.kind} · {item.version}
          </p>
          <h1 className="mt-1 font-display text-[2.2rem] leading-tight font-semibold tracking-tight">
            {item.name}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            {item.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[10px] text-muted">
          {item.kind === "agent"
            ? "NO SUITE · RUNS ON THE SHARED AGENT RUNTIME"
            : "NO SUITE · RUNS ON THE SHARED WORKFLOW RUNTIME"}
        </span>
      </header>

      {item.kind === "agent" ? (
        <AgentChat
          item={item}
          userId={user.id}
          streamChunks={content.streamChunks}
          toolCalls={content.toolCalls}
        />
      ) : (
        <WorkflowRunner
          item={item}
          userId={user.id}
          nodes={content.nodes ?? []}
          fields={content.fields}
        />
      )}
    </div>
  );
}
