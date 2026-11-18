# DJ GELO v41 — Stable Base Setup

This version rolls the public archive cleanup and business-dashboard upgrades into the v40 historical ledger build.

## 1. Database migrations
If you have NOT installed v39/v40 yet, run these in this order in Supabase SQL Editor:
1. `supabase/v39-gig-ledger-migration.sql`
2. `supabase/v40-historical-ledger-migration.sql`
3. `supabase/v40-import-historical-gigs.sql`
4. `supabase/v41-stable-base-migration.sql`

If you already installed v39/v40, run only #4.

Suggested query name: `DJ GELO - v41 Stable Base`

## 2. Redeploy submit-inquiry
v41 keeps the client confirmation email in `supabase/functions/submit-inquiry/index.ts`.
Replace the deployed `submit-inquiry` function with this file once so clients receive an acknowledgement email from your verified `BOOKING_FROM_EMAIL` sender.

## 3. Existing send-invoice function
No v41 change is required to `send-invoice`.

## 4. Public Events model
The private Gigs ledger is never public. Use **Add to public events** on a gig to create a separate draft in the Events table. Review it, choose archive category/visibility, then Publish.
Past public events can be hidden from the archive without deleting the event.

## 5. Dashboard
Use the Financial Period selector for This Month, Last Month, This Year, All Time, or a custom date range. DJ GELO and B2TB net are shown separately.

## 6. Historical data
The imported historical gigs remain private in Admin. Financially unknown records are excluded from money totals until you enter a verified amount and enable `Include this gig in financial totals`.
