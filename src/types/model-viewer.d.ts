import type * as React from "react";

/**
 * `<model-viewer>` is a custom element from `@google/model-viewer`, so React
 * has no built-in type for it. Declaring it here lets the JSX be checked
 * normally; React 19 forwards unknown attributes on custom elements verbatim,
 * which is why plain kebab-case attributes work.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        poster?: string;
        "camera-controls"?: boolean | "";
        "auto-rotate"?: boolean | "";
        "auto-rotate-delay"?: string;
        "rotation-per-second"?: string;
        "shadow-intensity"?: string;
        "environment-image"?: string;
        exposure?: string;
        "interaction-prompt"?: string;
        "touch-action"?: string;
        "disable-zoom"?: boolean | "";
        "camera-orbit"?: string;
        loading?: string;
        reveal?: string;
      };
    }
  }
}
