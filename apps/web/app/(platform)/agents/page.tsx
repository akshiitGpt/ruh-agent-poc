import { getSession } from "@/lib/session";
import { MyAgentsList } from "@/components/standalone/MyAgentsList";

export default async function MyAgentsPage() {
  const { user } = await getSession();
  if (!user) return null;

  return (
    <div>
      <header className="rise mb-8">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Standalone
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
          My agents
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Gallery agents and workflows you use directly — outside any suite.
          Agents open as a chat with saved conversations; workflows get a
          trigger page with your run history.
        </p>
      </header>
      <MyAgentsList userId={user.id} />
    </div>
  );
}
