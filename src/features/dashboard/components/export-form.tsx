import { Download } from "lucide-react";

/**
 * A plain GET form to a CSV route: the browser handles the download itself,
 * so there is no client JavaScript to break and nothing to keep in memory.
 * Both dates are optional; empty means all time.
 */
export function ExportForm({ action, label }: { action: string; label: string }) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-[10px] uppercase tracking-[0.14em] text-grey-2">
        From
        <input
          type="date"
          name="from"
          className="h-9 rounded-md border border-line bg-paper px-2 text-xs normal-case tracking-normal text-ink"
        />
      </label>
      <label className="grid gap-1 text-[10px] uppercase tracking-[0.14em] text-grey-2">
        To
        <input
          type="date"
          name="to"
          className="h-9 rounded-md border border-line bg-paper px-2 text-xs normal-case tracking-normal text-ink"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink bg-paper px-3 text-xs font-semibold transition-colors hover:bg-ink hover:text-white"
      >
        <Download className="size-3.5" />
        {label}
      </button>
    </form>
  );
}
