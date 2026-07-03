import { getSession } from "@/lib/session";
import { installs, suites, marketplaceExtras } from "@/lib/data";
import { MarketplaceGrid } from "@/components/platform/MarketplaceGrid";

export default async function MarketplacePage() {
  const { user, org, role } = await getSession();
  if (!user) return null;
  const installedSlugs = installs[org.id] ?? [];

  const cards = [
    ...suites.map((s) => ({
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      hue: s.hue,
      glyph: s.glyph,
      tasks: s.tasks.length,
      installed: installedSlugs.includes(s.slug),
    })),
    ...marketplaceExtras.map((s) => ({
      slug: s.slug,
      name: s.name,
      tagline: s.tagline,
      hue: s.hue,
      glyph: s.glyph,
      tasks: 3,
      installed: false,
    })),
  ];

  return (
    <div>
      <header className="rise mb-8">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Marketplace
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
          Add suites to {org.name}.
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Installing a suite reserves a personal subdomain for every member —
          yours would be{" "}
          <span className="font-mono text-sm text-accent">
            {"{suite}"}-{user.id}.ruh.ai
          </span>
          . Built by Ruh or published by builders.
        </p>
      </header>
      <MarketplaceGrid
        cards={cards}
        userId={user.id}
        canInstall={role === "admin"}
      />
    </div>
  );
}
