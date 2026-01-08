-- ============================================================================
-- OCCUPANCY CALCULATION FUNCTIONS
-- ============================================================================
-- Functions to calculate house occupancy rates and historical data
-- ============================================================================

-- Function to get current occupancy for a house
-- Returns: { occupied_bedrooms, total_bedrooms, occupancy_rate }
CREATE OR REPLACE FUNCTION get_current_house_occupancy(p_house_id UUID, p_organization_id UUID)
RETURNS TABLE (
  occupied_bedrooms INTEGER,
  total_bedrooms INTEGER,
  occupancy_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT r.id)::INTEGER AS occupied_bedrooms,
    COALESCE(h.bedroom_count, 1) AS total_bedrooms,
    ROUND(
      (COUNT(DISTINCT r.id)::NUMERIC / NULLIF(COALESCE(h.bedroom_count, 1), 0)) * 100,
      2
    ) AS occupancy_rate
  FROM houses h
  LEFT JOIN residents r ON r.house_id = h.id
    AND r.status = 'Active'
    AND r.organization_id = p_organization_id
    AND EXISTS (
      -- Only count if they have an active funding contract
      SELECT 1 FROM funding_contracts fc
      WHERE fc.resident_id = r.id
        AND fc.contract_status = 'Active'
        AND fc.organization_id = p_organization_id
        AND (fc.end_date IS NULL OR fc.end_date >= CURRENT_DATE)
    )
  WHERE h.id = p_house_id
    AND h.organization_id = p_organization_id
  GROUP BY h.bedroom_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly occupancy for the past 12 months
-- Returns array of monthly occupancy data
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

-- Function to get occupancy for all houses (for dashboard/list view)
CREATE OR REPLACE FUNCTION get_all_houses_occupancy(p_organization_id UUID)
RETURNS TABLE (
  house_id UUID,
  occupied_bedrooms INTEGER,
  total_bedrooms INTEGER,
  occupancy_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id AS house_id,
    COUNT(DISTINCT r.id)::INTEGER AS occupied_bedrooms,
    COALESCE(h.bedroom_count, 1) AS total_bedrooms,
    ROUND(
      (COUNT(DISTINCT r.id)::NUMERIC / NULLIF(COALESCE(h.bedroom_count, 1), 0)) * 100,
      2
    ) AS occupancy_rate
  FROM houses h
  LEFT JOIN residents r ON r.house_id = h.id
    AND r.status = 'Active'
    AND r.organization_id = p_organization_id
    AND EXISTS (
      SELECT 1 FROM funding_contracts fc
      WHERE fc.resident_id = r.id
        AND fc.contract_status = 'Active'
        AND fc.organization_id = p_organization_id
        AND (fc.end_date IS NULL OR fc.end_date >= CURRENT_DATE)
    )
  WHERE h.organization_id = p_organization_id
  GROUP BY h.id, h.bedroom_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION get_current_house_occupancy IS 'Get current occupancy snapshot for a specific house';
COMMENT ON FUNCTION get_house_occupancy_history IS 'Get 12-month historical occupancy data for a house';
COMMENT ON FUNCTION get_all_houses_occupancy IS 'Get current occupancy for all houses in an organization';

