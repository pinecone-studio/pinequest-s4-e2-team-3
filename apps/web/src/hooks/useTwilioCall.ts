"use client";

import { useRef, useState } from "react";

export type CallStatus =
  | "connecting"
  | "connected"
  | "ended"
  | "unavailable"; // Twilio not configured / call failed — caller should fall back.

// Places a REAL emergency call by asking our server to dial out via the Twilio
// REST API (see /api/voice/call). No browser WebRTC, so it works even on networks
// that block Twilio's Voice SDK signaling. `call` takes the spoken SOS message.
export function useTwilioCall() {
  const [status, setStatus] = useState<CallStatus>("connecting");
  const sidRef = useRef<string | null>(null);

  async function call(message: string, messageMn: string) {
    try {
      setStatus("connecting");
      const res = await fetch("/api/voice/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, messageMn }),
      });
      if (!res.ok) {
        setStatus("unavailable");
        return;
      }
      const data = await res.json();
      sidRef.current = data.sid ?? null;
      setStatus("connected");
    } catch {
      setStatus("unavailable");
    }
  }

  function hangup() {
    if (sidRef.current) {
      fetch("/api/voice/hangup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: sidRef.current }),
      }).catch(() => {});
    }
    setStatus("ended");
  }

  return { status, call, hangup };
}
