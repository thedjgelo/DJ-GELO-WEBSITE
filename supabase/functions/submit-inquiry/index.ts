import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://djgelo.com",
  "https://www.djgelo.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://djgelo.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
});

const clean = (value: unknown, max = 1000) => String(value ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ ok:false, error:"Method not allowed" }, { status:405, headers:cors });

  try {
    const body = await req.json();
    if (clean(body.website, 200)) return Response.json({ ok:true }, { headers:cors }); // honeypot

    const inquiry = {
      name: clean(body.name, 120),
      email: clean(body.email, 180).toLowerCase(),
      phone: clean(body.phone, 60) || null,
      event_type: clean(body.event_type, 100),
      event_date: clean(body.event_date, 20) || null,
      location: clean(body.location, 220),
      event_hours: clean(body.event_hours, 120) || null,
      guest_count: clean(body.guest_count, 80) || null,
      details: clean(body.details, 4000) || null
    };
    if (!inquiry.name || !inquiry.email || !inquiry.event_type || !inquiry.location) {
      return Response.json({ ok:false, error:"Missing required fields" }, { status:400, headers:cors });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
      return Response.json({ ok:false, error:"Invalid email" }, { status:400, headers:cors });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!serviceKey) {
      const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
      if (raw) serviceKey = Object.values(JSON.parse(raw))[0] as string;
    }
    if (!serviceKey) throw new Error("Supabase secret key is unavailable");
    const adminDb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: saved, error: insertError } = await adminDb.from("inquiries").insert(inquiry).select("id").single();
    if (insertError) throw insertError;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const to = Deno.env.get("BOOKING_TO_EMAIL") || "thedjgelo@gmail.com";
    const from = Deno.env.get("BOOKING_FROM_EMAIL") || "DJ GELO Bookings <onboarding@resend.dev>";
    if (resendKey) {
      const safe = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c));
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111"><h2>New DJ GELO booking inquiry</h2><p><strong>Name:</strong> ${safe(inquiry.name)}<br><strong>Email:</strong> ${safe(inquiry.email)}<br><strong>Phone:</strong> ${safe(inquiry.phone || 'Not provided')}<br><strong>Event:</strong> ${safe(inquiry.event_type)}<br><strong>Date:</strong> ${safe(inquiry.event_date || 'Not provided')}<br><strong>Location:</strong> ${safe(inquiry.location)}<br><strong>Hours:</strong> ${safe(inquiry.event_hours || 'Not provided')}<br><strong>Guests:</strong> ${safe(inquiry.guest_count || 'Not provided')}</p><p><strong>Details</strong><br>${safe(inquiry.details || 'None provided').replace(/\n/g,'<br>')}</p><p>Inquiry ID: ${safe(saved.id)}</p></div>`;
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${resendKey}` },
        body:JSON.stringify({ from, to:[to], reply_to:inquiry.email, subject:`New booking inquiry — ${inquiry.event_type} — ${inquiry.event_date || 'Date TBA'}`, html })
      });
      if (!emailResponse.ok) console.error("Resend error", await emailResponse.text());

      // Optional client confirmation. Enable after verifying your sending domain in Resend
      // and setting BOOKING_FROM_EMAIL to an address on that domain.
      const brandedFrom = Deno.env.get("BOOKING_FROM_EMAIL");
      if (brandedFrom) {
        const confirmResponse = await fetch("https://api.resend.com/emails", {
          method:"POST",
          headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${resendKey}` },
          body:JSON.stringify({
            from: brandedFrom,
            to:[inquiry.email],
            reply_to:"thedjgelo@gmail.com",
            subject:"DJ GELO — Booking inquiry received",
            html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><p>Hi ${safe(inquiry.name)},</p><p>Thanks for reaching out. I received your inquiry for ${safe(inquiry.event_type)}${inquiry.event_date ? ` on ${safe(inquiry.event_date)}` : ""} and will follow up as soon as I can.</p><p>— DJ GELO</p></div>`
          })
        });
        if (!confirmResponse.ok) console.error("Client confirmation email error", await confirmResponse.text());
      }
    }

    return Response.json({ ok:true, id:saved.id }, { headers:{...cors,"Content-Type":"application/json"} });
  } catch (error) {
    console.error(error);
    return Response.json({ ok:false, error:"Unable to submit inquiry" }, { status:500, headers:{...cors,"Content-Type":"application/json"} });
  }
});
