name: "Feature PRP Example - Portfolio Dashboard
1. Overview

The Haven Landing Page Dashboard is the first screen users see after logging in. It provides a portfolio-level snapshot of a provider’s SDA housing portfolio — showing how many properties are under management, how many residents are active, and how much financial activity has occurred over recent periods.

This dashboard acts as the command centre for all users, combining high-level metrics, trend summaries, and navigation shortcuts into the deeper modules of Haven (Properties, Residents, Transactions, Agreements, etc.).

2. Goals

Present a clear, at-a-glance overview of the provider’s portfolio ( an aggregated view)
Present a clear, at-a-glance overview of the each houses performance too ( down lower)
Visualise , summarise and make easy the feeling of knowing how all things are going
Provide immediate, tangible insights on performance trends (financial and operational).
Serve as the foundation for future AI insights (e.g., “Ask Haven AI: Which properties are underperforming?”).

Problem Statement

Currently, users must click into multiple pages, calculate manually things,  to understand the overall state of their portfolio. There’s no unified “home” screen that consolidates data across properties, residents, and financials.
This creates friction for providers and slows decision-making.
The dashboard solves this by surfacing key metrics and trends in a single, always-visible, and dynamic screen.
... and looks amazxing!

Audience

Primary Users: SDA Provider Admins / Finance Managers.
Access: All logged-in users (same view).
Role Assumptions: Each user can view all data within their organisation.

Key Metrics & Components
Section	Description	Data Source / Table	Notes

🏠 Total Houses	Count of all active properties	houses	Filtered where status = active
👥 Total Residents	Count of all active residents	residents	Filtered where status = active
💰 Transaction Volume (7d / 30d / 12m)	Sum of all transactions over different time windows	transactions	Filter by created_at date
📈 Monthly Trends Graph	Bar/line chart of transaction totals per month	transactions	Group by month-year
⚡ Recent Activity Feed	Last 5 transactions or key events	transactions, residents, houses	Ordered by created_at DESC
✅ Quick Actions	Buttons for “Add House”, “Add Resident”, “Create Transaction”	—	Triggers modal forms from existing components
🔔 Notifications (Future)	Alerts for overdue compliance, expiring leases, etc.	TBD	Placeholder for later phase

6. Functional Requirements
6.1 Data Fetching

Use Supabase client (useSupabase) to fetch aggregated stats via RPC or SQL views.
Queries must be efficient and scoped to the authenticated user’s organisation_id.
Cache responses client-side for 5 minutes to reduce load.

6.2 Layout & Design
Framework: Next.js xx (App Router)
Styling: Tailwind + shadcn/ui
Charting: Recharts

Structure:

Header (greeting + date range toggle)
Metric Cards (houses, residents, money)
Chart section (trends over time)
Recent Activity table/feed
Quick Actions row

6.3 AI Hooks (Optional)

Prepare an API route /api/insights that returns summarised metrics (for future Haven AI assistant).
Include context structure (insights.d.ts) so AI can consume data easily later.

6.4 Responsiveness

Dashboard must render cleanly on desktop and tablet.
Mobile view should collapse cards into a single column.


8. UX & Visual Design Notes

Use Haven brand palette: emerald green + soft neutral greys.
Metric cards should have icons (🏠, 👥, 💰) and smooth loading shimmer states.
Charts should default to the last 6 months view with toggle (7d / 30d / 12m).
Include contextual labels like:
“↑ 12% vs last month” (basic trend calc in client-side code).

11. Future Enhancements

AI-powered summaries (“Haven AI — How did we perform this month?”).
Drill-down to property-level dashboards via click.
Notifications & compliance alerts.
Export to PDF or Excel.