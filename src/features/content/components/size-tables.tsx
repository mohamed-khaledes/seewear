"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  chartSizes,
  sizeCharts,
  toInches,
} from "@/features/content/services/utils/size-charts";

type Unit = "cm" | "in";

/**
 * The measurement tables, with a centimetres/inches switch. Client-side for the
 * toggle alone — the numbers are static and ship in the markup, so the tables
 * are readable before any JavaScript runs.
 */
export function SizeTables() {
  const [unit, setUnit] = useState<Unit>("cm");

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="up-xs text-grey-2">Garment measurements</p>

        <div
          role="group"
          aria-label="Measurement units"
          className="flex border border-line bg-paper"
        >
          {(["cm", "in"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUnit(option)}
              aria-pressed={unit === option}
              className={cn(
                "up-xs px-3 py-1.5 transition-colors",
                unit === option
                  ? "bg-ink text-white"
                  : "text-grey-2 hover:text-ink",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-8">
        {sizeCharts.map((chart) => {
          const sizes = chartSizes(chart);

          return (
            // min-w-0 is load-bearing: as a grid item this section defaults to
            // min-width:auto, which resolves to the table's min-content and
            // drags the whole page wider than the phone instead of letting the
            // table scroll inside its own container.
            <section key={chart.id} id={chart.id} className="min-w-0 scroll-mt-24">
              <h3 className="text-base font-bold tracking-tight">{chart.title}</h3>
              <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-grey-2">
                {chart.blurb}
              </p>

              {/* On a phone the last column falls off the edge. The table scrolls
                  inside itself so the page never does — say so, because a clipped
                  column with no affordance just reads as missing data. */}
              <p className="mt-3 text-xs text-grey sm:hidden">
                Swipe the table sideways for every column.
              </p>

              <div className="mt-4 -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
                <table className="w-full min-w-105 border-collapse text-sm">
                  <caption className="sr-only">
                    {chart.title} measurements in{" "}
                    {unit === "cm" ? "centimetres" : "inches"}
                  </caption>
                  <thead>
                    <tr className="border-y border-line">
                      <th scope="col" className="up-xs py-2.5 pe-4 text-start text-grey-2">
                        Size
                      </th>
                      {chart.columns.map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="up-xs py-2.5 pe-4 text-start font-medium text-grey-2"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizes.map((size) => (
                      <tr key={size} className="border-b border-line">
                        <th
                          scope="row"
                          className="py-2.5 pe-4 text-start text-sm font-semibold"
                        >
                          {size}
                        </th>
                        {chart.rows[size].map((cm, index) => (
                          <td
                            key={chart.columns[index]}
                            className="py-2.5 pe-4 tabular-nums text-grey-2"
                          >
                            {unit === "cm" ? cm : toInches(cm)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
