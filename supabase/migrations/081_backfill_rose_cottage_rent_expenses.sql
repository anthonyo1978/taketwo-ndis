-- ============================================================================
-- BACKFILL WEEKLY RENT EXPENSES FOR ROSE COTTAGE
-- ============================================================================
-- Rose Cottage went live 1 May 2025 with a $450/week head lease rent.
-- This script generates one "rent" expense per week from the go-live date
-- up to (and including) the current week, skipping any weeks that already
-- have a rent expense for this house so it can be re-run safely.
-- ============================================================================

DO $$
DECLARE
  v_house_id        UUID;
  v_org_id          UUID;
  v_head_lease_id   UUID;
  v_go_live         DATE;
  v_rent_amount     NUMERIC(12,2) := 450.00;
  v_week_start      DATE;
  v_today           DATE := CURRENT_DATE;
  v_inserted        INT := 0;
  v_skipped         INT := 0;
BEGIN
  -- ── 1. Look up Rose Cottage ──────────────────────────────────────────
  SELECT id, organization_id, go_live_date
    INTO v_house_id, v_org_id, v_go_live
    FROM houses
   WHERE descriptor ILIKE '%Rose Cottage%'
   LIMIT 1;

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'House "Rose Cottage" not found';
  END IF;

  RAISE NOTICE 'Found Rose Cottage: id=%, org=%, go_live=%', v_house_id, v_org_id, v_go_live;

  -- ── 2. Look up the active head lease (optional — links expense to lease)
  SELECT id
    INTO v_head_lease_id
    FROM head_leases
   WHERE house_id = v_house_id
     AND organization_id = v_org_id
     AND status = 'active'
   ORDER BY start_date DESC
   LIMIT 1;

  IF v_head_lease_id IS NOT NULL THEN
    RAISE NOTICE 'Found active head lease: %', v_head_lease_id;
  ELSE
    RAISE NOTICE 'No active head lease found — expenses will not be linked to a lease';
  END IF;

  -- ── 3. Generate weekly rent expenses ─────────────────────────────────
  v_week_start := v_go_live;

  WHILE v_week_start <= v_today LOOP
    -- Skip if a rent expense already exists for this exact date
    IF NOT EXISTS (
      SELECT 1
        FROM house_expenses
       WHERE house_id = v_house_id
         AND organization_id = v_org_id
         AND category = 'rent'
         AND occurred_at = v_week_start
    ) THEN
      INSERT INTO house_expenses (
        organization_id,
        house_id,
        head_lease_id,
        category,
        description,
        reference,
        amount,
        frequency,
        occurred_at,
        due_date,
        status,
        notes,
        created_by,
        updated_by
      ) VALUES (
        v_org_id,
        v_house_id,
        v_head_lease_id,                                      -- may be NULL
        'rent',
        'Weekly rent — Rose Cottage',
        'RENT-' || to_char(v_week_start, 'YYYYMMDD'),        -- e.g. RENT-20250501
        v_rent_amount,
        'weekly',
        v_week_start,                                         -- occurred_at
        v_week_start + INTERVAL '7 days',                     -- due 7 days later
        'approved',                                           -- mark as approved (past periods)
        'Auto-generated backfill from go-live date',
        'system',
        'system'
      );

      v_inserted := v_inserted + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;

    v_week_start := v_week_start + INTERVAL '7 days';
  END LOOP;

  RAISE NOTICE 'Done. Inserted % rent expenses, skipped % (already existed).', v_inserted, v_skipped;
END $$;

