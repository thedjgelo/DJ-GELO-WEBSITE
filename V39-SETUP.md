# DJ GELO v39 — Master Gig Ledger

## 1. Run the database migration
Supabase → SQL Editor → New query. Name it `DJ GELO - v39 Master Gig Ledger`, paste `supabase/v39-gig-ledger-migration.sql`, then Run.

## 2. Refresh local admin
Open `http://localhost:8000/admin/` and hard refresh. The Bookings tab is now **Gigs**.

## 3. What the money fields mean
- **Agreed DJ pay**: guaranteed/base DJ fee.
- **DJ pay collected**: actual base-fee money received so far.
- **Ticket / event revenue**: revenue from self-produced events such as B2TB.
- **Tips**: extra money received.
- **Expenses**: DJ payouts, workers, venue costs, ads, travel, etc.
- **Gross** = Agreed DJ pay + Ticket/Event revenue + Tips.
- **Collected** = DJ pay collected + Ticket/Event revenue + Tips.
- **Outstanding** = max(Agreed DJ pay - DJ pay collected, 0).
- **Net** = Collected - Expenses.

## 4. Dashboard
Dashboard totals show this-month collected/net, YTD collected/net, outstanding balances, upcoming gigs and public events.

## 5. No Edge Function changes required
Your existing `submit-inquiry` and `send-invoice` functions continue to work.

## Manual gigs
Client email is optional for manually logged gigs. An email is only required if you later want to send an invoice directly from the admin.
