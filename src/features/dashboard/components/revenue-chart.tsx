import { formatMoney } from "@/lib/utils";

type Point = { day: string; revenue_cents: number };

const WIDTH = 620;
const HEIGHT = 220;
const PAD = 24;

/**
 * Plain SVG bars, drawn on the server — the same chart the prototype has, with
 * the last six days picked out in ink. No charting library needed for this.
 */
export function RevenueChart({ series }: { series: Point[] }) {
  if (series.length === 0) {
    return (
      <div className="grid h-[220px] place-items-center text-sm text-grey-2">
        No revenue in this window yet.
      </div>
    );
  }

  const max = Math.max(...series.map((point) => point.revenue_cents), 1);
  const barWidth = (WIDTH - PAD * 2) / series.length;
  const gridLines = [0, 1, 2, 3, 4];

  const labelEvery = Math.max(1, Math.ceil(series.length / 5));

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full"
        role="img"
        aria-label={`Daily revenue over the last ${series.length} days, peaking at ${formatMoney(max)}`}
      >
        {gridLines.map((line) => {
          const y = PAD + ((HEIGHT - PAD * 2) * line) / 4;
          return (
            <line
              key={line}
              x1={PAD}
              y1={y}
              x2={WIDTH - PAD}
              y2={y}
              stroke="var(--line)"
              strokeWidth={1}
            />
          );
        })}

        {series.map((point, index) => {
          const height = (point.revenue_cents / max) * (HEIGHT - PAD * 2);
          const x = PAD + index * barWidth + 2;
          const y = HEIGHT - PAD - height;
          const recent = index >= series.length - 6;

          return (
            <rect
              key={point.day}
              x={x}
              y={y}
              width={Math.max(barWidth - 4, 1)}
              height={Math.max(height, 0)}
              rx={2}
              fill={recent ? "var(--ink)" : "#ececeb"}
            >
              <title>{`${point.day}: ${formatMoney(point.revenue_cents)}`}</title>
            </rect>
          );
        })}

        {series.map((point, index) =>
          index % labelEvery === 0 ? (
            <text
              key={`label-${point.day}`}
              x={PAD + index * barWidth}
              y={HEIGHT - 6}
              fontSize={9}
              fill="var(--grey)"
            >
              {new Date(point.day).toLocaleDateString("en-EG", {
                day: "numeric",
                month: "short",
              })}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}
