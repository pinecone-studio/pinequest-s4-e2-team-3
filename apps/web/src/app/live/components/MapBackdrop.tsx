// A simple stylised route backdrop — a dotted path with a pulsing current marker.
export function MapBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_20%,#dbe6ff_0%,#eef2fb_60%)] dark:bg-[radial-gradient(120%_90%_at_70%_20%,#16233d_0%,#0d1422_60%)]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M30 28 C 20 45, 60 50, 50 62 S 60 85, 52 95"
          fill="none"
          stroke="#2f6bff"
          strokeWidth="3"
          strokeDasharray="1 5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="absolute left-[30%] top-[28%] h-3 w-3 -translate-x-1/2 rounded-full bg-safety-safe" />
      <span className="absolute left-[50%] top-[62%] flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-primary-600 ring-8 ring-primary-600/20">
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    </div>
  );
}
