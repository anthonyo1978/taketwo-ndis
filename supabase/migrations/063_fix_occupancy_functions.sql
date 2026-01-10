-- ============================================================================
-- FIX OCCUPANCY CALCULATION FUNCTIONS
-- ============================================================================
-- Ensures functions always return data even when no residents exist
-- ============================================================================

-- Fixed: Always returns one row, even if house is empty
CREATE OR REPLACE FUNCTION get_current_house_occupancy(p_house_id UUID, p_organization_id UUID)
RETURNS TABLE (
  occupied_bedrooms INTEGER,
  total_bedrooms INTEGER,
  occupancy_rate NUMERIC
) AS $$
DECLARE
  v_bedroom_count INTEGER;
  v_occupied_count INTEGER;
BEGIN
  -- Get bedroom count for this house
  SELECT COALESCE(bedroom_count, 1) INTO v_bedroom_count
  FROM houses
  WHERE id = p_house_id AND organization_id = p_organization_id;
  
  -- If house not found, return zeros
  IF v_bedroom_count IS NULL THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Count occupied bedrooms (active residents with active contracts)
  SELECT COUNT(DISTINCT r.id)::INTEGER INTO v_occupied_count
  FROM residents r
  WHERE r.house_id = p_house_id
    AND r.status = 'Active'
    AND r.organization_id = p_organization_id
    AND EXISTS (
      SELECT 1 FROM funding_contracts fc
      WHERE fc.resident_id = r.id
        AND fc.contract_status = 'Active'
        AND fc.organization_id = p_organization_id
        AND (fc.end_date IS NULL OR fc.end_date >= CURRENT_DATE)
    );
  
  -- Always return exactly one row
  RETURN QUERY SELECT 
    COALESCE(v_occupied_count, 0)::INTEGER AS occupied_bedrooms,
    v_bedroom_count AS total_bedrooms,
    ROUND(
      (COALESCE(v_occupied_count, 0)::NUMERIC / NULLIF(v_bedroom_count, 0)) * 100,
      2
    ) AS occupancy_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fixed: Handles houses with no historical data gracefully
CREATE OR REPLACE FUNCTION get_house_occupancy_history(p_house_id UUID, p_organization_id UUID)
RETURNS TABLE (
  month_start DATE,
  month_name TEXT,
  occupied_bedrooms INTEGER,
  total_bedrooms INTEGER,
  occupancy_rate NUMERIC
) AS $$
DECLARE
  v_bedroom_count INTEGER;
BEGIN
  -- Get bedroom count for this house
  SELECT COALESCE(bedroom_count, 1) INTO v_bedroom_count
  FROM houses
  WHERE id = p_house_id AND organization_id = p_organization_id;
  
  -- If house not found, return empty result
  IF v_bedroom_count IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH months AS (
    -- Generate last 12 months
    SELECT 
      date_trunc('month', CURRENT_DATE - (n || ' months')::INTERVAL)::DATE AS month_start,
      TO_CHAR(CURRENT_DATE - (n || ' months')::INTERVAL, 'Mon YYYY') AS month_name
    FROM generate_series(11, 0, -1) n
  ),
  occupancy_data AS (
    SELECT 
      date_trunc('month', d.check_date)::DATE AS month_start,
      COUNT(DISTINCT r.id) AS occupied_count
    FROM months m
    CROSS JOIN LATERAL (
      -- Check occupancy on the 15th of each month (mid-month snapshot)
      SELECT (m.month_start + INTERVAL '14 days')::DATE AS check_date
    ) d
    LEFT JOIN residents r ON r.house_id = p_house_id
      AND r.status = 'Active'
      AND r.organization_id = p_organization_id
      AND (r.move_in_date IS NULL OR r.move_in_date <= d.check_date)
      AND (r.move_out_date IS NULL OR r.move_out_date >= d.check_date)
      AND EXISTS (
        -- Check if they had an active contract during that month
        SELECT 1 FROM funding_contracts fc
        WHERE fc.resident_id = r.id
          AND fc.organization_id = p_organization_id
          AND fc.contract_status IN ('Active', 'Expired') -- Include expired for historical data
          AND (fc.start_date IS NULL OR fc.start_date <= d.check_date)
          AND (fc.end_date IS NULL OR fc.end_date >= d.check_date)
      )
    GROUP BY month_start
  )
  SELECT 
    m.month_start,
    m.month_name,
    COALESCE(o.occupied_count, 0)::INTEGER AS occupied_bedrooms,
    v_bedroom_count AS total_bedrooms,
    ROUND(
      (COALESCE(o.occupied_count, 0)::NUMERIC / NULLIF(v_bedroom_count, 0)) * 100,
      2
    ) AS occupancy_rate
  FROM months m
  LEFT JOIN occupancy_data o ON o.month_start = m.month_start
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON FUNCTION get_current_house_occupancy IS 'Get current occupancy snapshot - always returns one row even if empty';
COMMENT ON FUNCTION get_house_occupancy_history IS 'Get 12-month historical occupancy - returns 12 rows (one per month)';
