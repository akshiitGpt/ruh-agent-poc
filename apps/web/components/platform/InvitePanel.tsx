"use client";

import { useState } from "react";

interface Row {
  name: string;
  email: string;
  initials: string;
  role: string;
  status: "active" | "invited";
}

export function InvitePanel({
  canManage,
  currentEmail,
  initialMembers,
  initialPending,
}: {
  canManage: boolean;
  currentEmail: string;
  initialMembers: Row[];
  initialPending: Row[];
}) {
  const [rows, setRows] = useState<Row[]>([...initialMembers, ...initialPending]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  }

  function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setRows((r) => [
      ...r,
      {
        name: email.split("@")[0],
        email,
        initials: email.slice(0, 2).toUpperCase(),
        role,
        status: "invited",
      },
    ]);
    flash(
      `Invite sent to ${email} — link ruh.ai/invite/${Math.abs(email.length * 2654435761 % 46656).toString(36)} (7-day expiry)`
    );
    setEmail("");
  }

  function accept(target: Row) {
    setRows((r) =>
      r.map((m) => (m.email === target.email ? { ...m, status: "active" } : m))
    );
    flash(`${target.email} accepted the invite and joined as ${target.role}`);
  }

  function revoke(target: Row) {
    setRows((r) => r.filter((m) => m.email !== target.email));
    flash(`Invite for ${target.email} revoked`);
  }

  function remove(target: Row) {
    setRows((r) => r.filter((m) => m.email !== target.email));
    flash(`${target.name} removed from the organisation`);
  }

  function changeRole(target: Row, newRole: string) {
    setRows((r) =>
      r.map((m) => (m.email === target.email ? { ...m, role: newRole } : m))
    );
    flash(`${target.name} is now ${newRole === "admin" ? "an admin" : "a member"}`);
  }

  return (
    <div>
      {canManage ? (
        <form
          onSubmit={invite}
          className="rise flex gap-2 rounded-2xl border border-line bg-panel p-3"
          style={{ animationDelay: "80ms" }}
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@acme.com"
            className="flex-1 rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-bg hover:opacity-85">
            Send invite
          </button>
        </form>
      ) : (
        <div
          className="rise flex items-center gap-3 rounded-2xl border border-dashed border-line bg-panel px-4 py-3.5"
          style={{ animationDelay: "80ms" }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel2 text-sm">
            🔒
          </span>
          <p className="text-sm text-muted">
            Inviting members requires the <strong>admin</strong> role. You can
            view the member list below.
          </p>
        </div>
      )}

      {notice && (
        <div className="drawer-in mt-3 rounded-xl border border-line bg-ok-soft px-4 py-2.5 font-mono text-xs text-ok">
          ✓ {notice}
        </div>
      )}

      <div
        className="rise mt-4 overflow-hidden rounded-2xl border border-line bg-panel"
        style={{ animationDelay: "160ms" }}
      >
        {rows.map((m, i) => {
          const isSelf = m.email === currentEmail;
          return (
            <div
              key={m.email + i}
              className="flex items-center gap-3.5 border-b border-line px-5 py-3.5 last:border-0"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-panel2 font-display text-xs font-semibold">
                {m.initials}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium">
                  {m.name}
                  {isSelf && <span className="ml-1.5 text-xs text-faint">(you)</span>}
                </span>
                <span className="block truncate text-xs text-muted">{m.email}</span>
              </span>

              {m.status === "invited" ? (
                <>
                  <span className="rounded-full bg-run-soft px-2.5 py-1 font-mono text-[10px] text-run">
                    INVITE PENDING · {m.role.toUpperCase()}
                  </span>
                  {canManage && (
                    <>
                      <button
                        onClick={() => accept(m)}
                        title="Prototype only — simulates the invitee accepting"
                        className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:border-ok hover:text-ok"
                      >
                        Simulate accept
                      </button>
                      <button
                        onClick={() => flash(`Invite re-sent to ${m.email}`)}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:border-accent hover:text-accent"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => revoke(m)}
                        className="rounded p-1.5 text-xs text-faint hover:bg-err-soft hover:text-err"
                        title="Revoke invite"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {canManage && !isSelf ? (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m, e.target.value)}
                      className="rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-1 font-mono text-[10px] ${
                        m.role === "admin"
                          ? "bg-accent-soft text-accent"
                          : "bg-panel2 text-muted"
                      }`}
                    >
                      {m.role.toUpperCase()}
                    </span>
                  )}
                  {canManage && !isSelf && (
                    <button
                      onClick={() => remove(m)}
                      className="rounded p-1.5 text-xs text-faint hover:bg-err-soft hover:text-err"
                      title="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
