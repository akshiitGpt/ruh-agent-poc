"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setSharedCookie } from "@/lib/cookies";

interface OrgOption {
  id: string;
  name: string;
  plan: string;
}

export function OrgSwitcher({
  currentOrg,
  orgs,
  role,
}: {
  currentOrg: string;
  orgs: OrgOption[];
  role: "admin" | "member";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const org = orgs.find((o) => o.id === currentOrg) ?? orgs[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function switchOrg(id: string) {
    setSharedCookie("ruh_org", id);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-faint"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft font-display text-xs font-bold text-accent">
          {org.name[0]}
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-medium">{org.name}</span>
          <span className="block text-[11px] text-faint">
            {org.plan} plan ·{" "}
            <span className={role === "admin" ? "text-accent" : ""}>
              {role === "admin" ? "Admin" : "Member"}
            </span>
          </span>
        </span>
        <span className="text-xs text-faint">⇅</span>
      </button>

      {open && (
        <div className="drawer-in absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_40px_-20px_rgba(33,29,22,0.45)]">
          <p className="px-3.5 pt-2.5 pb-1 text-[11px] font-medium tracking-wide text-faint uppercase">
            Switch organisation
          </p>
          {orgs.map((o) => (
            <button
              key={o.id}
              onClick={() => switchOrg(o.id)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-panel2"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft font-display text-[11px] font-bold text-accent">
                {o.name[0]}
              </span>
              <span className="flex-1">{o.name}</span>
              {o.id === currentOrg && <span className="text-accent">✓</span>}
            </button>
          ))}
          <div className="border-t border-line px-3.5 py-2.5 text-xs text-faint">
            + Create organisation · prototype
          </div>
        </div>
      )}
    </div>
  );
}
