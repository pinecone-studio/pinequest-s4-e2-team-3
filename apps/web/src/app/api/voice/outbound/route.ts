import twilio from "twilio";
import { isValidTwilioRequest, formDataToParams } from "@/lib/twilioWebhook";

// Twilio calls this (set it as the TwiML App's Voice URL) when the browser places
// a call. Twilio CANNOT dial real emergency short codes (103/102/108), so for the
// demo every call is routed to TWILIO_SOS_DEMO_NUMBER — a real phone you can answer.
export async function POST(req: Request) {
  const form = await req.formData();

  // Only Twilio itself should be able to trigger a real outbound dial. Skip
  // the check when TWILIO_AUTH_TOKEN isn't configured (e.g. local dev without
  // full Twilio setup) so nothing breaks there.
  if (process.env.TWILIO_AUTH_TOKEN && !isValidTwilioRequest(req, formDataToParams(form))) {
    return new Response("Forbidden", { status: 403 });
  }

  const requested = String(form.get("To") ?? "");
  const target = process.env.TWILIO_SOS_DEMO_NUMBER || requested;
  const callerId = process.env.TWILIO_CALLER_ID;

  const twiml = new twilio.twiml.VoiceResponse();
  if (target && callerId) {
    twiml.dial({ callerId }).number(target);
  } else {
    twiml.say("Sorry, the emergency line is not configured.");
  }

  return new Response(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
