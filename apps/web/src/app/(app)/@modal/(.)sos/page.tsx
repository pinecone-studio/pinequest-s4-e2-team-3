"use client";

import { useRouter } from "next/navigation";
import { SosFlow } from "@/components/SosFlow";

// Intercepted /sos: shown as a sheet over the page the user came from, with the
// blurred page visible behind it. Closing uses router.back() so the parallel
// modal slot is cleared and the page underneath returns.
export default function SosModal() {
  const router = useRouter();
  const close = () => router.back();

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-ink/20 backdrop-blur-md"
      />
      <div className="relative">
        <SosFlow onClose={close} />
      </div>
    </div>
  );
}
