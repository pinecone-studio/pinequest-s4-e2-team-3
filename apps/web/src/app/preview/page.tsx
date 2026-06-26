import { PhoneFrame } from "@/components/PhoneFrame";

export default function PreviewPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#09090b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <PhoneFrame src="/" scale={0.92} />
    </main>
  );
}
