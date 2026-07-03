import { getSession } from "@/lib/session";
import { BuilderWizard } from "@/components/builder/BuilderWizard";

export default async function NewSuitePage() {
  const { user, role } = await getSession();
  if (!user) return null;

  if (role !== "admin") {
    return (
      <div className="rise mx-auto mt-20 max-w-md rounded-2xl border border-dashed border-line bg-panel p-8 text-center">
        <p className="mb-2 text-2xl">🔒</p>
        <h1 className="mb-2 font-display text-xl font-semibold">Admins only</h1>
        <p className="text-sm text-muted">
          Building suites is limited to org admins.
        </p>
      </div>
    );
  }

  return <BuilderWizard />;
}
