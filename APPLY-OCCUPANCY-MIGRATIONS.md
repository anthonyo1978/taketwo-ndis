# Apply Occupancy Tracking Migrations

The Occupancy History feature requires two database migrations to be applied.

## Quick Setup (via Supabase Dashboard)

### Step 1: Apply Migration 061 (Add Bedroom Count Field)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations/061_add_occupancy_tracking_fields.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

### Step 2: Apply Migration 062 (Create Occupancy Functions)

1. Still in **SQL Editor**
2. Click **New Query** again
3. Copy and paste the contents of `supabase/migrations/062_create_occupancy_functions.sql`
4. Click **Run**
5. You should see "Success. No rows returned"

### Step 3: Verify and Test

1. Go back to your Haven app
2. Navigate to Stedman Villa (or any house)
3. Click **Edit House**
4. Make sure "Number of Bedrooms" is set (e.g., 3)
5. Click **Save**
6. Go back to the house detail page
7. **Refresh the page**
8. You should now see the **Occupancy History** grid with colored squares! 🎉

## What These Migrations Do

**Migration 061:**
- Adds `bedroom_count` field to the `houses` table
- Adds `move_in_date` and `move_out_date` to the `residents` table
- Creates indexes for better performance

**Migration 062:**
- Creates `get_current_house_occupancy()` function
- Creates `get_house_occupancy_history()` function (12 months)
- Creates `get_all_houses_occupancy()` function (for list view)

## Troubleshooting

**Error: "column bedroom_count already exists"**
- This is fine! It means migration 061 was partially applied. Continue to migration 062.

**Error: "function already exists"**
- This is fine! The migrations use `CREATE OR REPLACE` so they're safe to run multiple times.

**Still not seeing the grid?**
- Make sure you've refreshed the page after running migrations
- Check browser console for errors (F12 → Console tab)
- Verify bedroom count is set: Edit house → Check "Number of Bedrooms" field
- Try a hard refresh: Cmd/Ctrl + Shift + R

## Alternative: Use Supabase CLI

If you have Supabase CLI installed locally:

```bash
# From project root
supabase db push
```

This will apply all pending migrations automatically.

