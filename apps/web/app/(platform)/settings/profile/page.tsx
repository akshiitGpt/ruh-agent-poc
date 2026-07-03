import { getSession } from "@/lib/session";

export default async function ProfileSettingsPage() {
  const { user } = await getSession();
  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <header className="rise mb-8">
        <p className="font-mono text-xs tracking-wide text-faint uppercase">
          Settings
        </p>
        <h1 className="mt-1 font-display text-[2.4rem] leading-tight font-semibold tracking-tight">
          Profile
        </h1>
      </header>

      <section
        className="rise rounded-2xl border border-line bg-panel p-6"
        style={{ animationDelay: "80ms" }}
      >
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-xl font-semibold text-bg">
            {user.initials}
          </span>
          <div>
            <p className="font-display text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <button className="ml-auto rounded-lg border border-line px-3.5 py-2 text-sm text-muted hover:border-accent hover:text-accent">
            Change avatar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Display name" value={user.name} />
          <Field label="Email" value={user.email} />
          <Field label="Default organisation" value="Acme Corp" />
          <Field label="Timezone" value="Asia/Kolkata (IST)" />
        </div>
        <button className="mt-6 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-bg hover:opacity-85">
          Save changes
        </button>
      </section>

      <section
        className="rise mt-4 rounded-2xl border border-line bg-panel p-6"
        style={{ animationDelay: "160ms" }}
      >
        <h2 className="font-display text-base font-semibold">Personal subdomains</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Reserved for you across installed suites.
        </p>
        <div className="space-y-2">
          {["linear", "slack", "github"].map((s) => (
            <div
              key={s}
              className="flex items-center justify-between rounded-lg border border-line bg-bg/50 px-4 py-2.5"
            >
              <span className="font-mono text-sm">
                {s}-{user.id}.ruh.ai
              </span>
              <span className="font-mono text-[10px] text-ok">ACTIVE</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-faint uppercase">
        {label}
      </span>
      <input
        defaultValue={value}
        className="w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
