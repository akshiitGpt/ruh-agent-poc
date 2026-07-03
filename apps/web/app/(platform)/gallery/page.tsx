import Link from "next/link";
import { getSession } from "@/lib/session";
import { galleryItems } from "@/lib/builderData";
import { GalleryGrid } from "@/components/builder/GalleryGrid";

export default async function GalleryPage() {
  const { user, role } = await getSession();
  if (!user) return null;

  if (role !== "admin") {
    return (
      <div className="rise mx-auto mt-20 max-w-md rounded-2xl border border-dashed border-line bg-panel p-8 text-center">
        <p className="mb-2 text-2xl">🔒</p>
        <h1 className="mb-2 font-display text-xl font-semibold">Admins only</h1>
        <p className="text-sm text-muted">
          The agentic gallery is an internal catalog for building suites.
          Looking for an agent or workflow to use yourself? Check the{" "}
          <Link href="/marketplace" className="text-accent underline underline-offset-2">
            marketplace
          </Link>
          .
        </p>
      </div>
    );
  }

  const agents = galleryItems.filter((i) => i.kind === "agent").length;
  const workflows = galleryItems.length - agents;

  return (
    <div>
      <header className="rise mb-8">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Build studio · internal
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
          Agentic gallery
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Every agent and workflow ever built with the agent builder —{" "}
          {agents} agents, {workflows} workflows. Suites reuse these instead of
          rebuilding: the same component can ship in many suites. Publish one
          to the marketplace to make it available to end users directly.
        </p>
      </header>
      <GalleryGrid items={galleryItems} />
    </div>
  );
}
