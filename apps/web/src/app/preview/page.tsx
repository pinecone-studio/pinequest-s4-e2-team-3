export default function PreviewPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Phone shell */}
      <div
        style={{
          position: "relative",
          width: 390,
          height: 844,
          borderRadius: 44,
          overflow: "hidden",
          background: "#faf8f4",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        {/* Dynamic island */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 34,
            background: "#000",
            borderRadius: 9999,
            zIndex: 200,
            pointerEvents: "none",
          }}
        />

        {/* App iframe — starts below the dynamic island so breakpoints, dvh, and fixed positioning
            all respond to the phone viewport (390 × 796px) rather than the browser viewport */}
        <iframe
          src="/explore"
          title="Polaris"
          allow="microphone"
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "calc(100% - 48px)",
            border: "none",
            display: "block",
          }}
        />

        {/* Home indicator */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 134,
            height: 5,
            background: "rgba(0,0,0,0.22)",
            borderRadius: 9999,
            zIndex: 200,
            pointerEvents: "none",
          }}
        />
      </div>
    </main>
  );
}
