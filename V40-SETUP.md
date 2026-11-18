# DJ GELO v40 — Historical Gig Import

## 1. Run migrations in order

If you have not run v39 yet, run `supabase/v39-gig-ledger-migration.sql` first.

Then run:

`supabase/v40-historical-ledger-migration.sql`

## 2. Import the history

Run:

`supabase/v40-import-historical-gigs.sql`

The import is idempotent: it upserts by `historical_key`, so rerunning it will update these imported historical records instead of duplicating them.

## 3. Financial treatment

- 25 invoice-backed gigs are marked included in financial totals and total $15,300 in verified paid revenue.
- Deposits are stored separately and are not added on top of the full paid amount.
- Instagram/user-confirmed gigs with unknown pay are still imported but marked `include_financial_totals = false`.
- You can edit any old gig later, enter the real money, and check “Include this gig in financial totals.”

## 4. Quality labels

- Complete: date/event details are well supported.
- Partial: gig is real but some details are missing.
- Estimated: at least one important field was inferred.

The May 2023 SSFHS rally date is estimated from the invoice due date because the invoice did not print the actual event date.
