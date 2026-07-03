import { getSession } from "@/lib/session";
import { galleryItems } from "@/lib/builderData";
import { GalleryGrid } from "@/components/builder/GalleryGrid";

export default async function GalleryPage() {
  const { user } = await getSession();
  if (!user) return null;

  const agents = galleryItems.filter((i) => i.kind === "agent").length;
  const workflows = galleryItems.length - agents;

  return (
    <div>
      <header className="rise mb-8">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Build studio
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
          Agentic gallery
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Every agent and workflow ever built with the agent builder —{" "}
          {agents} agents, {workflows} workflows. Suites reuse these instead of
          rebuilding: the same component can ship in many suites.
        </p>
      </header>
      <GalleryGrid items={galleryItems} />
    </div>
  );
}
