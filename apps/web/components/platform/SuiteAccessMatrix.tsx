"use client";

import { useState } from "react";

interface SuiteOption {
  slug: string;
  name: string;
  hue: string;
  glyph: string;
}

interface MemberRow {
  userId: string;
  name: string;
  email: string;
  initials: string;
  role: string;
}

export function SuiteAccessMatrix({
  suites,
  members,
  initialAccess,
}: {
  suites: SuiteOption[];
  members: MemberRow[];
  initialAccess: Record<string, string[]>;
}) {
  const [access, setAccess] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    for (const m of members) {
      map[m.userId] = new Set(
        initialAccess[m.userId] ?? suites.map((s) => s.slug)
      );
    }
    return map;
  });
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  function toggle(userId: string, slug: string, memberName: string, suiteName: string) {
    setAccess((prev) => {
      const next = new Set(prev[userId]);
      const granting = !next.has(slug);
      if (granting) next.add(slug);
      else next.delete(slug);
      flash(
        `${granting ? "Granted" : "Revoked"} ${memberName}'s access to ${suiteName}`
      );
      return { ...prev, [userId]: next };
    });
  }

  function setAll(userId: string, memberName: string, grant: boolean) {
    setAccess((prev) => ({
      ...prev,
      [userId]: new Set(grant ? suites.map((s) => s.slug) : []),
    }));
    flash(`${grant ? "Granted" : "Revoked"} ${memberName}'s access to all suites`);
  }

  if (suites.length === 0) {
    return (
      <section
        className="rise mt-6 rounded-2xl border border-dashed border-line bg-panel px-5 py-4"
        style={{ animationDelay: "200ms" }}
      >
        <p className="text-sm text-muted">
          Install a suite from the marketplace to start controlling per-member access.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rise mt-6 overflow-hidden rounded-2xl border border-line bg-panel"
      style={{ animationDelay: "200ms" }}
    >
      <header className="border-b border-line px-5 py-3.5">
        <h2 className="font-display text-sm font-semibold">Suite access</h2>
        <p className="mt-0.5 text-xs text-faint">
          Control which installed suites each member can open. Admins always
          see every installed suite.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="px-5 py-2.5 text-left text-[11px] font-medium tracking-wide text-faint uppercase">
                Member
              </th>
              {suites.map((s) => (
                <th key={s.slug} className="px-2 py-2.5 text-center">
                  <span
                    className="mx-auto flex h-6 w-6 items-center justify-center rounded-md font-display text-[10px] font-bold text-white"
                    style={{ background: s.hue }}
                    title={s.name}
                  >
                    {s.glyph}
                  </span>
                </th>
              ))}
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-panel2 font-display text-[10px] font-semibold">
                      {m.initials}
                    </span>
                    <span className="leading-tight">
                      <span className="block text-sm font-medium">{m.name}</span>
                      <span className="block text-[11px] text-faint">{m.email}</span>
                    </span>
                  </div>
                </td>
                {suites.map((s) => {
                  const checked = access[m.userId]?.has(s.slug) ?? true;
                  return (
                    <td key={s.slug} className="px-2 py-3 text-center">
                      <button
                        onClick={() => toggle(m.userId, s.slug, m.name, s.name)}
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`${m.name} access to ${s.name}`}
                        className={`mx-auto flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                          checked
                            ? "border-ok bg-ok-soft text-ok"
                            : "border-line bg-bg text-transparent hover:border-faint"
                        }`}
                      >
                        ✓
                      </button>
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setAll(m.userId, m.name, true)}
                    className="mr-1.5 font-mono text-[10px] text-faint hover:text-ok"
                  >
                    all
                  </button>
                  <button
                    onClick={() => setAll(m.userId, m.name, false)}
                    className="font-mono text-[10px] text-faint hover:text-err"
                  >
                    none
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={suites.length + 2}
                  className="px-5 py-4 text-sm text-faint"
                >
                  No non-admin members yet — invite someone above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {notice && (
        <div className="border-t border-line bg-ok-soft px-5 py-2.5 font-mono text-xs text-ok">
          ✓ {notice}
        </div>
      )}
    </section>
  );
}
