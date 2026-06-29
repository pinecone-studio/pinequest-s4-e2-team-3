// Returns Chimege Mongolian TTS audio for a piece of text, as a public GET so
// Twilio's <Play> can fetch it during the SOS call and speak it to the operator —
// bridging the traveller's language barrier.
export async function GET(req: Request) {
  const token = process.env.CHIMEGE_TTS_TOKEN;
  if (!token) return new Response("chimege_not_configured", { status: 503 });

  // Chimege only accepts Mongolian Cyrillic — digits, Latin letters and symbols
  // (°, ·, coordinates, place names in English) make it fail. Strip them so the
  // call never breaks; keep Cyrillic, spaces and basic punctuation.
  const raw = new URL(req.url).searchParams.get("text") ?? "";
  const text = raw.replace(/[^Ѐ-ӿ\s.,!?:]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return new Response("empty_text", { status: 400 });

  try {
    const res = await fetch("https://api.chimege.com/v1.2/synthesize", {
      method: "POST",
      headers: { Token: token, "Content-Type": "text/plain", "voice-id": "FEMALE4v2" },
      body: text,
    });
    if (!res.ok) return new Response("chimege_failed", { status: 502 });

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      headers: { "Content-Type": "audio/x-wav", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("chimege_error", { status: 502 });
  }
}
