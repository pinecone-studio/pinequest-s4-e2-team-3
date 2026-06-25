// Small inline SVG icons so we don't pull in an icon dependency.
// Each icon inherits colour from `currentColor` and size from the `size` prop,
// so they style exactly like text (className text-* controls colour).

type IconProps = {
  size?: number;
  className?: string;
};

function svgProps({ size = 24, className }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)} fill="currentColor" stroke="none">
      <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3Z" />
      <path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 5h16v11H8l-4 4V5Z" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)} fill="currentColor" stroke="none">
      <path d="M12 4l2.3 4.7 5.2.8-3.8 3.7.9 5.1L12 16.6 7.4 18l.9-5.1L4.5 9.5l5.2-.8L12 4Z" />
    </svg>
  );
}

export function WalkIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="13" cy="4.5" r="1.6" />
      <path d="M11 21l1.5-5-2.5-2 1-5 3 2 2 1" />
      <path d="M10 14l-2 7" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
    </svg>
  );
}

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 21c4-4 7-7.5 7-11a7 7 0 1 0-14 0c0 3.5 3 7 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m15 5-7 7 7 7" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function RunIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="15" cy="4.5" r="1.6" />
      <path d="M5 12l3-1 3 2 1 5" />
      <path d="M11 13l4-1 3 3M8 21l2-4" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)} fill="currentColor" stroke="none">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function BarsIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 13v-2M8 16V8M12 18V6M16 16V8M20 13v-2" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)} fill="currentColor" stroke="none">
      <path d="M6 4l13 8-13 8V4Z" />
    </svg>
  );
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}
