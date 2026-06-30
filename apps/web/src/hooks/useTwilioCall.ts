"use client";

import { useEffect, useRef, useState } from "react";

export type CallStatus =
  | "connecting"
  | "ringing" // dialing — operator hasn't picked up yet
  | "connected" // operator answered (in-progress)
  | "ended"
  | "unavailable"; // Twilio not configured / call failed — caller should fall back.

// Places a REAL emergency call by asking our server to dial out via the Twilio
// REST API (see /api/voice/call). No browser WebRTC, so it works even on networks
// that block Twilio's Voice SDK signaling. `call` takes the spoken SOS message.
export function useTwilioCall() {
  const [status, setStatus] = useState<CallStatus>("connecting");
  const sidRef = useRef<string | null>(null);
  const incidentRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll Twilio for the real call state so the timer only starts once the operator
  // actually answers (in-progress) — not while it's still ringing.
  function watchCallState() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!sidRef.current) return;
      try {
        const res = await fetch(`/api/voice/call-status?sid=${sidRef.current}`);
        const { status: s } = await res.json();
        if (s === "in-progress") {
          setStatus("connected");
        } else if (["completed", "busy", "failed", "no-answer", "canceled"].includes(s)) {
          setStatus("ended");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* ignore transient poll errors */
      }
    }, 2000);
  }

  async function call(message: string, messageMn: string, incidentId?: string | null) {
    incidentRef.current = incidentId ?? null;
    try {
      setStatus("connecting");
      const res = await fetch("/api/voice/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, messageMn, incidentId }),
      });
      if (!res.ok) {
        setStatus("unavailable");
        return;
      }
      const data = await res.json();
      sidRef.current = data.sid ?? null;
      setStatus("ringing"); // dialing — wait for the operator to pick up
      watchCallState();
    } catch {
      setStatus("unavailable");
    }
  }

  // Stop polling when the screen unmounts.
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Mid-call: speak a new Mongolian phrase to the operator on the live call.
  async function say(messageMn: string): Promise<boolean> {
    if (!sidRef.current) return false;
    try {
      const res = await fetch("/api/voice/say", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: sidRef.current, messageMn, incidentId: incidentRef.current }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  function hangup() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (sidRef.current) {
      fetch("/api/voice/hangup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: sidRef.current }),
      }).catch(() => {});
    }
    setStatus("ended");
  }

  return { status, call, hangup, say };
}
