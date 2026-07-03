"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { setSharedCookie } from "@/lib/cookies";

export function UserMenu({
  name,
  email,
  initials,
}: {
  name: string;
  email: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function signOut() {
    setSharedCookie("ruh_user", "", 0);
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="drawer-in absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_40px_-20px_rgba(33,29,22,0.45)]">
          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm hover:bg-panel2"
          >
            Profile settings
          </Link>
          <Link
            href="/settings/organization"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm hover:bg-panel2"
          >
            Organisation settings
          </Link>
          <button
            onClick={signOut}
            className="block w-full border-t border-line px-3.5 py-2.5 text-left text-sm text-err hover:bg-err-soft"
          >
            Sign out
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-panel2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-display text-xs font-semibold text-bg">
          {initials}
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-medium">{name}</span>
          <span className="block text-[11px] text-faint">{email}</span>
        </span>
        <span className="text-xs text-faint">⋯</span>
      </button>
    </div>
  );
}
