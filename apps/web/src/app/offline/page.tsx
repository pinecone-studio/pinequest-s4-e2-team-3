export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f3eee6",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "#fff3cd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          fontSize: 32,
        }}
      >
        ✈️
      </div>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#1b2640",
          margin: "0 0 8px",
        }}
      >
        You&apos;re offline
      </h1>

      <p style={{ color: "#8a8275", fontSize: 15, maxWidth: 280, margin: "0 0 32px", lineHeight: 1.5 }}>
        No internet connection. Open the app once while online so it can save
        everything for offline use.
      </p>

      <a
        href="/translate"
        style={{
          display: "inline-block",
          background: "#2f6bff",
          color: "#fff",
          padding: "12px 28px",
          borderRadius: 999,
          fontWeight: 600,
          fontSize: 15,
          textDecoration: "none",
        }}
      >
        Quick Phrases →
      </a>

      <p style={{ marginTop: 16, fontSize: 13, color: "#8a8275" }}>
        Quick Phrases work without internet
      </p>
    </main>
  );
}
