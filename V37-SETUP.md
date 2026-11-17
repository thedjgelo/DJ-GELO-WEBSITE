# DJ GELO v37 setup

This version adds the quieter public-site design, a Back 2 The Booth landing page, bookings, invoice PDF storage, dashboard metrics, CSV export and invoice email sending.

## 1. Run the v37 database migration

In Supabase: **SQL Editor -> New query**.

Name it:

`DJ GELO - v37 CRM + Invoices`

Paste and run the contents of:

`supabase/v37-migration.sql`

Expected result: **Success. No rows returned.**

The migration adds:
- `event_brand` to events (`djgelo` or `b2tb`)
- `bookings` table
- `invoices` table
- private `invoices` Storage bucket (PDF only, max 10 MB)
- admin-only RLS policies for bookings, invoices and invoice files
- automatic B2TB tagging for existing Back 2 The Booth events

Do not run the migration repeatedly unless needed; it is mostly idempotent, but the update/tagging step will run again harmlessly.

## 2. Deploy the updated `submit-inquiry` function

Your existing function still works. v37 includes an updated copy at:

`supabase/functions/submit-inquiry/index.ts`

Replacing the deployed function with this version preserves the working admin notification and adds an optional client confirmation email once a branded Resend sender is configured.

## 3. Deploy `send-invoice`

In Supabase: **Edge Functions -> Create function -> Editor**.

Name it exactly:

`send-invoice`

Replace the starter code with:

`supabase/functions/send-invoice/index.ts`

Deploy it.

This function verifies that the caller is the signed-in `thedjgelo@gmail.com` admin, downloads the invoice from the private Storage bucket, attaches the PDF and sends it through Resend.

## 4. Resend sender for client emails

Your existing `RESEND_API_KEY` secret can remain as-is.

For invoice emails to arbitrary clients, verify a sending domain in Resend and then add this Supabase Edge Function secret:

`BOOKING_FROM_EMAIL`

Example value:

`DJ GELO <bookings@your-verified-domain.com>`

Do not set this to a domain you have not verified in Resend. The admin's **Draft email** button works without this secret, but it cannot automatically attach the PDF. **Send invoice** requires this secret and automatically attaches the stored PDF.

Optional secret:

`BOOKING_TO_EMAIL=thedjgelo@gmail.com`

The inquiry function already defaults to this address.

## 5. Test locally before committing

From the repo root:

`python3 -m http.server 8000`

Then test:

- `http://localhost:8000/`
- `http://localhost:8000/events/`
- `http://localhost:8000/back2thebooth/`
- `http://localhost:8000/book/`
- `http://localhost:8000/admin/`

Admin checks:
1. Dashboard loads.
2. Existing events load.
3. A B2TB event shows `Back 2 The Booth` as its brand.
4. Convert a test inquiry to a booking.
5. Add prices/notes and save.
6. Upload a PDF invoice under 10 MB.
7. View the PDF using the temporary signed URL.
8. Test Draft email.
9. After `BOOKING_FROM_EMAIL` is configured, test Send invoice to an email you control first.

## 6. Public paths

- Main site: `/`
- Events: `/events/`
- Booking: `/book/`
- Back 2 The Booth: `/back2thebooth/`
- Privacy: `/privacy/`
- Admin: `/admin/`

The B2TB page automatically shows published events whose `event_brand` is `b2tb`.
