import twilio from "twilio";

// Verifies that a request to a Twilio-invoked webhook (TwiML App Voice URL,
// <Gather> action, etc.) actually came from Twilio, using the same
// origin-resolution the route handlers already use to build the action URLs
// Twilio calls back — so a legitimate Twilio request always matches.
// Without this, anyone could POST directly to these public, unauthenticated
// endpoints and, e.g., inject fake "operator" replies onto a real SOS incident.
export function isValidTwilioRequest(req: Request, params: Record<string, string>): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature");
  if (!authToken || !signature) return false;

  const { pathname, search } = new URL(req.url);
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = process.env.PUBLIC_BASE_URL || (host ? `${proto}://${host}` : "");
  const url = `${origin}${pathname}${search}`;

  return twilio.validateRequest(authToken, signature, url, params);
}

export function formDataToParams(form: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }
  return params;
}
