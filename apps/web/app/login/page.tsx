"use client";

import { users } from "@/lib/data";
import { useRouter } from "next/navigation";
import { setSharedCookie as setCookie } from "@/lib/cookies";

export default function LoginPage() {
  const router = useRouter();

  function signIn(userId: string) {
    setCookie("ruh_user", userId);
    setCookie("ruh_org", "acme");
    router.push("/");
    router.refresh();
  }

  return (
    <div
      data-theme="paper"
      className="atmosphere flex min-h-screen items-center justify-center bg-bg px-6"
    >
      <div className="w-full max-w-105">
        <div className="rise mb-10 text-center" style={{ animationDelay: "0ms" }}>
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-ink font-display text-xl font-bold text-bg">
            ر
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Ruh
          </h1>
          <p className="mt-2 text-muted">
            One dashboard. Every agentic suite. Sign in to continue.
          </p>
        </div>

        <div
          className="rise rounded-2xl border border-line bg-panel p-2 shadow-[0_16px_40px_-24px_rgba(33,29,22,0.4)]"
          style={{ animationDelay: "90ms" }}
        >
          <p className="px-4 pt-3 pb-2 text-xs font-medium tracking-wide text-faint uppercase">
            Demo identities
          </p>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => signIn(u.id)}
              className="group flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-accent-soft"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel2 font-display text-sm font-semibold text-ink group-hover:bg-panel">
                {u.initials}
              </span>
              <span className="flex-1">
                <span className="block font-medium">
                  {u.name}
                  <span className="ml-2 rounded-full border border-line bg-bg px-2 py-0.5 font-mono text-[10px] text-faint">
                    {u.id === "akshit" ? "ADMIN" : "MEMBER"}
                  </span>
                </span>
                <span className="block text-sm text-muted">{u.email}</span>
              </span>
              <span className="text-sm text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent">
                Continue →
              </span>
            </button>
          ))}
        </div>

        <div
          className="rise mt-4 space-y-2"
          style={{ animationDelay: "180ms" }}
        >
          {["Continue with Google", "Continue with SSO"].map((label) => (
            <button
              key={label}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-line bg-panel py-3 text-sm text-faint"
            >
              {label} · disabled in prototype
            </button>
          ))}
        </div>

        <p
          className="rise mt-8 text-center text-xs text-faint"
          style={{ animationDelay: "260ms" }}
        >
          One login. Access all your suites and workspaces.
        </p>
      </div>
    </div>
  );
}
