import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "err" | "mut";

const toneClasses: Record<StatusTone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  err: "bg-[#fbe9e6] text-sale",
  mut: "bg-[#eeeeec] text-[#555]",
};

export function StatusPill({
  tone = "mut",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
