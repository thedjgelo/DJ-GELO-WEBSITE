# DJ GELO Historical Gig Ledger v40

- Total reconstructed gigs: **62**
- Invoice-backed paid gigs included in verified financial totals: **25**
- Verified paid revenue from uploaded invoices: **$15,300.00**
- Instagram/user-confirmed gigs with unknown financials: **37**

## Import behavior

Invoice-backed gigs are marked `include_financial_totals = true` and their full invoice fee is stored as both agreed pay and paid amount, because you confirmed every uploaded invoice gig was fully paid. Deposits remain stored separately for reference and are not double-counted.

Instagram/user-confirmed gigs without a verified amount are imported with `include_financial_totals = false`, so they appear in your master gig history but do not change dashboard revenue until you enter a real amount and opt them into totals.

The May 2023 SSFHS rally has an estimated event date of 2023-05-25 because the invoice gives an issue date and due date, not an explicit event date. It is marked `estimated` and explained in source notes.
