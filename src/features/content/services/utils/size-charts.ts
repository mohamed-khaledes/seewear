import { SIZES } from "@/config/constants";

/**
 * Garment measurements, in centimetres, taken flat. These are the garment's own
 * dimensions rather than body measurements — the difference is the fit, and it
 * is why the oversized cuts read larger than a body chart would suggest.
 *
 * Sizes are keyed by name and rendered in the order of `SIZES`, so this chart
 * and the sizes the dashboard can assign stay in step.
 */

export type SizeChart = {
  id: string;
  title: string;
  blurb: string;
  /** Column headings after the size column. */
  columns: string[];
  /** size name → measurement per column, same order as `columns`. */
  rows: Record<string, number[]>;
};

export const sizeCharts: SizeChart[] = [
  {
    id: "tops",
    title: "T-shirts, tanks and hoodies",
    blurb:
      "Cut boxy through the body. If you are between sizes and want it close, take the smaller one.",
    columns: ["Chest", "Body length", "Shoulder", "Sleeve"],
    rows: {
      XS: [51, 68, 45, 20],
      S: [54, 70, 47, 21],
      M: [57, 72, 49, 22],
      L: [60, 74, 51, 23],
      XL: [64, 76, 54, 24],
      XXL: [68, 78, 57, 25],
    },
  },
  {
    id: "outerwear",
    title: "Outerwear",
    blurb:
      "Measured to layer over a hoodie. Take your usual size unless you plan to wear it over tailoring.",
    columns: ["Chest", "Body length", "Shoulder", "Sleeve"],
    rows: {
      XS: [55, 69, 47, 61],
      S: [58, 71, 49, 62],
      M: [61, 73, 51, 64],
      L: [64, 75, 53, 65],
      XL: [68, 77, 56, 67],
      XXL: [72, 79, 59, 68],
    },
  },
  {
    id: "bottoms",
    title: "Trousers and track pants",
    blurb:
      "Waist is flat across the front, doubled. Elasticated waists are given relaxed, not stretched.",
    columns: ["Waist", "Hip", "Inseam", "Leg opening"],
    rows: {
      XS: [36, 52, 74, 19],
      S: [39, 55, 76, 20],
      M: [42, 58, 78, 21],
      L: [45, 61, 80, 22],
      XL: [49, 65, 82, 23],
      XXL: [53, 69, 84, 24],
    },
  },
];

/** The sizes a chart actually defines, in the store's canonical order. */
export function chartSizes(chart: SizeChart): string[] {
  return SIZES.filter((size) => size in chart.rows);
}

/** Centimetres to inches, to one decimal place. */
export function toInches(cm: number): number {
  return Math.round((cm / 2.54) * 10) / 10;
}
