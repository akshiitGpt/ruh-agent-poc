export function StatusPill({
  status,
}: {
  status: "succeeded" | "failed" | "running";
}) {
  const map = {
    succeeded: { bg: "bg-ok-soft", fg: "text-ok", label: "succeeded" },
    failed: { bg: "bg-err-soft", fg: "text-err", label: "failed" },
    running: { bg: "bg-run-soft", fg: "text-run", label: "running" },
  } as const;
  const s = map[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] ${s.bg} ${s.fg}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${status === "running" ? "pulse-dot" : ""}`}
      />
      {s.label}
    </span>
  );
}
