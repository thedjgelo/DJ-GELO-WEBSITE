import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://djgelo.com",
  "https://www.djgelo.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://djgelo.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const getSecretKey = () => {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) return String(Object.values(JSON.parse(raw))[0] || "");
  return "";
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers });

  try {
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return Response.json({ ok: false, error: "Not signed in" }, { status: 401, headers });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const secretKey = getSecretKey();
    if (!secretKey) throw new Error("Supabase secret key unavailable");
    const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || userData.user?.email !== "thedjgelo@gmail.com") {
      return Response.json({ ok: false, error: "Admin access required" }, { status: 403, headers });
    }

    const { invoice_id } = await req.json();
    if (!invoice_id) return Response.json({ ok: false, error: "Missing invoice_id" }, { status: 400, headers });

    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .select("*, bookings(client_name,client_email,event_type,event_date,location)")
      .eq("id", invoice_id)
      .single();
    if (invoiceError || !invoice) throw invoiceError || new Error("Invoice not found");
    if (!invoice.bookings?.client_email) throw new Error("This invoice is not linked to a client email");

    const { data: pdfBlob, error: pdfError } = await admin.storage.from("invoices").download(invoice.storage_path, {}, { cache: "no-store" });
    if (pdfError || !pdfBlob) throw pdfError || new Error("Invoice PDF unavailable");
    const base64 = toBase64(new Uint8Array(await pdfBlob.arrayBuffer()));

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not configured");
    const from = Deno.env.get("BOOKING_FROM_EMAIL");
    if (!from) throw new Error("BOOKING_FROM_EMAIL is required for client invoice sending. Verify your sending domain in Resend first.");

    const clientName = invoice.bookings.client_name || "there";
    const eventDate = invoice.bookings.event_date || "Date TBA";
    const subject = `DJ GELO Invoice ${invoice.invoice_number} — ${eventDate}`;
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><p>Hi ${clientName},</p><p>Attached is invoice <strong>${invoice.invoice_number}</strong> for your ${invoice.bookings.event_type || "event"} on ${eventDate}.</p><p><strong>Balance due:</strong> $${Number(invoice.balance_due || 0).toFixed(2)}</p><p>Please let me know if you have any questions.</p><p>Thank you,<br>DJ GELO</p></div>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
      body: JSON.stringify({
        from,
        to: [invoice.bookings.client_email],
        reply_to: "thedjgelo@gmail.com",
        subject,
        html,
        attachments: [{ filename: invoice.file_name || `${invoice.invoice_number}.pdf`, content: base64, content_type: "application/pdf" }],
      }),
    });

    if (!resendResponse.ok) throw new Error(`Resend: ${await resendResponse.text()}`);
    await admin.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", invoice.id);
    return Response.json({ ok: true }, { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Unable to send invoice" }, { status: 500, headers });
  }
});
