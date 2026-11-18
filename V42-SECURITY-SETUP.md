# DJ GELO v42 Security Setup

## Already built into v42
- Content Security Policy and referrer/permissions restrictions on site pages.
- Admin auto-logout after 60 minutes of inactivity.
- 10 MB invoice upload validation in the admin UI (Supabase bucket still enforces the real server-side limit).
- Booking endpoint request-size limit, strict allowed origins, honeypot, validation, and IP-based rate limiting.
- Existing Supabase Row Level Security remains the main database protection.
- Invoice PDFs stay in a private Storage bucket and are viewed through short-lived signed URLs.

## 1. Run the v42 SQL migration
In Supabase SQL Editor create a query named:
`DJ GELO - v42 Security Hardening`

Paste and run `supabase/v42-security-hardening.sql`.

## 2. Redeploy submit-inquiry
Open Supabase > Edge Functions > submit-inquiry > Editor. Replace `index.ts` with `supabase/functions/submit-inquiry/index.ts` from v42, then deploy.

## 3. Recommended Supabase account security
Enable MFA for your Supabase account and use a unique password. Do not store any service-role/secret key in the GitHub repo. Only the publishable browser key belongs in `supabase-config.js`.

## 4. Recommended Cloudflare response headers (optional but stronger)
GitHub Pages cannot set all HTTP security headers itself. If your `djgelo.com` traffic is proxied through Cloudflare, add a Response Header Transform Rule with:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` only after confirming every subdomain is HTTPS.

Do not enable HSTS until you are sure all current/future subdomains use HTTPS.

## 5. Optional future anti-bot layer
If spam becomes a problem, add Cloudflare Turnstile to the booking form. The v42 rate limiter and honeypot are intentionally lightweight and should be enough for normal traffic.
