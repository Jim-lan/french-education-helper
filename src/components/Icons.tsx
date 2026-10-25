import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement>;
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};
export function SpeakerIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
    </svg>
  );
}
export function UploadIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />
    </svg>
  );
}
export function BookIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v16M3 3c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2V3Z" />
    </svg>
  );
}
export function ArrowIcon(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}
