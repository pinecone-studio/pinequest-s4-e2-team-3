import { SosFlow } from "@/components/SosFlow";

// Standalone fallback for when /sos is opened directly (refresh or shared link).
// When opened from inside the app it shows as a blurred modal instead — see
// src/app/(app)/@modal/(.)sos/page.tsx.
export default function SosPage() {
  return (
    <div className="flex min-h-screen flex-col justify-end bg-ink/40">
      <SosFlow />
    </div>
  );
}
