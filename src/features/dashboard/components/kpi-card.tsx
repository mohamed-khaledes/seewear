import { cn } from "@/lib/utils";

/** Change against the previous window of the same length. */
function delta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function KpiCard({
  label,
  value,
  current,
  previous,
  suffix = "vs previous period",
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  suffix?: string;
}) {
  const change = delta(current, previous);
  const up = (change ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-line bg-paper px-5 py-4.5">
      <p className="up-xs text-grey-2">{label}</p>
      <p className="mt-2 text-[27px] font-bold leading-tight tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold">
        {change === null ? (
          <span className="text-grey">No prior data</span>
        ) : (
          <span className={cn(up ? "text-ok" : "text-sale")}>
            {up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
          </span>
        )}{" "}
        <span className="font-normal text-grey">{suffix}</span>
      </p>
    </div>
  );
}
