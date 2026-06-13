/** Cargo truck icon — enclosed box truck, Lucide-style stroke SVG */
export default function CargoTruckIcon({ size = 20, strokeWidth = 2, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H2" />
      <path d="M15 18v-3a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3" />
      <path d="M15 9h4l3 3v6h-7V9z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}
