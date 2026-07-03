export function renderLite(text: string, key: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## "))
      return (
        <p
          key={`${key}-${i}`}
          className="mt-1 mb-2 font-display text-base font-semibold text-ink"
        >
          {line.slice(3)}
        </p>
      );
    if (line.startsWith("- "))
      return (
        <p key={`${key}-${i}`} className="flex gap-2 pl-1 text-sm leading-relaxed">
          <span className="text-accent">·</span>
          <span>{inlineBold(line.slice(2))}</span>
        </p>
      );
    if (line.startsWith("⚙ "))
      return (
        <p
          key={`${key}-${i}`}
          className="my-1.5 inline-flex items-center gap-2 rounded-lg border border-line bg-panel2 px-2.5 py-1 font-mono text-xs"
        >
          <span className="text-accent">⚙</span>
          <span className="text-ink">{line.slice(2)}</span>
          <span className="text-ok">✓</span>
        </p>
      );
    if (line.trim() === "")
      return <span key={`${key}-${i}`} className="block h-2" />;
    return (
      <p key={`${key}-${i}`} className="text-sm leading-relaxed">
        {inlineBold(line)}
      </p>
    );
  });
}

export function inlineBold(s: string) {
  const parts = s.split("**");
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-ink">
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
