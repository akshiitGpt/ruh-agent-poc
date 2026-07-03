import { getSession } from "@/lib/session";
import { installs, suites, marketplaceExtras } from "@/lib/data";
import { galleryItems } from "@/lib/builderData";
import { MarketplaceGrid } from "@/components/platform/MarketplaceGrid";

export default async function MarketplacePage() {
  const { user, org, role } = await getSession();
  if (!user) return null;
  const installedSlugs = installs[org.id] ?? [];

  const cards = [
    ...suites.map((s) => ({
      type: "suite" as const,
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      hue: s.hue,
      glyph: s.glyph,
      tasks: s.tasks.length,
      installed: installedSlugs.includes(s.slug),
    })),
    ...marketplaceExtras.map((s) => ({
      type: "suite" as const,
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      hue: s.hue,
      glyph: s.glyph,
      tasks: 3,
      installed: false,
    })),
    ...galleryItems
      .filter((g) => g.status === "published")
      .map((g) => ({
        type: g.kind,
        id: g.id,
        name: g.name,
        tagline: g.description,
        tags: g.tags,
        version: g.version,
      })),
  ];

  return (
    <div>
      <header className="rise mb-8">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Marketplace
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
          Add to {org.name}.
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Suites install org-wide and reserve a personal subdomain for every
          member (yours would be{" "}
          <span className="font-mono text-sm text-accent">
            {"{suite}"}-{user.id}.ruh.ai
          </span>
          ). Agents and workflows are personal — add one straight to your
          account and use it on its own, no suite required.
        </p>
      </header>
      <MarketplaceGrid
        cards={cards}
        userId={user.id}
        canInstallSuites={role === "admin"}
      />
    </div>
  );
}
