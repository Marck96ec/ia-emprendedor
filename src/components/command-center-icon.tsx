import type { SVGProps } from "react";

const paths = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  company: "M3 21h18M5 21V7l8-4v18m0-11h6v11M8 9h2m-2 4h2m-2 4h2m6-3h1m-1 3h1",
  growth: "m3 17 6-6 4 4 7-8m-5 0h5v5",
  plan: "M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6",
  account: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2",
  market: "M12 3a9 9 0 1 0 9 9m-9-5a5 5 0 1 0 5 5m-5 0 8-8m-4 0h4v4",
  finance: "M4 4v16h16M8 16v-3m4 3V9m4 7V6",
  liquidity: "M4 8V6a2 2 0 0 1 2-2h12v4M6 8h14v12H6a2 2 0 0 1-2-2V6m16 10h-5a2 2 0 0 1 0-4h5",
  operations: "M3 4h7v6H3zm11 0h7v6h-7zM8.5 15h7v6h-7zM6.5 10v2h11v-2M12 12v3",
  autonomy: "M12 21v-5m0 0-6-6V4m6 12 6-6V4M3 7l3-3 3 3m6 0 3-3 3 3",
  check: "m5 12 4 4L19 6",
  arrow: "M4 12h15m-6-6 6 6-6 6",
  chevron: "m6 9 6 6 6-6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  sparkle: "m12 2 2.1 6.9L21 11l-6.9 2.1L12 20l-2.1-6.9L3 11l6.9-2.1zM20 17v5m-2.5-2.5h5",
} satisfies Record<string, string>;

export function CommandCenterIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
