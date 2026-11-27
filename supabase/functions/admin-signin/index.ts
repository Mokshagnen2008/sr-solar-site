import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ADMIN_EMAIL = "smoksha1989@gmail.com";
const SITE_ORIGIN = "https://mokshagnen2008.github.io";
const SITE_URL = `${SITE_ORIGIN}/sr-solar-site`;
const LIMIT_PER_UTC_DAY = 10;
const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(status: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (origin !== SITE_ORIGIN) return new Response("Forbidden origin", { status: 403 });
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "Use POST to request a sign-in link." });

  let body: { email?: unknown; redirectTo?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Enter the authorized admin email address." });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : "";
  if (email !== ADMIN_EMAIL) return json(403, { error: "This email is not authorized for admin access." });
  if (redirectTo !== `${SITE_URL}/admin.html`) return json(400, { error: "The admin sign-in return address is invalid." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !publicKey) {
    console.error("Admin sign-in is missing its Supabase server settings.");
    return json(503, { error: "Admin sign-in is temporarily unavailable. Please contact the site administrator." });
  }

  try {
    const limitResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_admin_signin_attempt`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_email: email, p_limit: LIMIT_PER_UTC_DAY }),
    });
    if (!limitResponse.ok) {
      console.error("Admin sign-in daily-limit check failed:", limitResponse.status);
      return json(503, { error: "Admin sign-in is temporarily unavailable. Please try again later." });
    }
    const limits = await limitResponse.json();
    const allowed = limits?.[0]?.allowed === true;
    const remaining = Number(limits?.[0]?.remaining ?? 0);
    if (!allowed) return json(429, { error: "The 10 daily admin sign-in requests have been used. Try again after 00:00 UTC.", remaining: 0 });

    const authUrl = new URL(`${supabaseUrl}/auth/v1/otp`);
    authUrl.searchParams.set("redirect_to", redirectTo);
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: { apikey: publicKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: false }),
    });
    if (!authResponse.ok) {
      const authError = await authResponse.json().catch(() => ({}));
      const message = typeof authError.msg === "string" ? authError.msg : "The verification email could not be sent. Please try again later.";
      return json(authResponse.status === 429 ? 429 : 502, { error: message, remaining });
    }
    return json(200, { sent: true, remaining });
  } catch (error) {
    console.error("Admin sign-in request failed:", error);
    return json(502, { error: "Could not reach the sign-in service. Please try again later." });
  }
});
