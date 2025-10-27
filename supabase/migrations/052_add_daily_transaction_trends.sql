-- ============================================================================
-- ADD DAILY TRANSACTION TRENDS FUNCTION
-- Adds ability to show daily/weekly trends for shorter time periods
-- ============================================================================

-- Function: Get daily transaction trends (PER ORGANIZATION)
CREATE OR REPLACE FUNCTION get_daily_transaction_trends(org_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  date TEXT,
  year INTEGER,
  transaction_count BIGINT,
  total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('day', t.created_at), 'MMM DD') as date,
    EXTRACT(YEAR FROM t.created_at)::INTEGER as year,
    COUNT(*)::BIGINT as transaction_count,
    COALESCE(SUM(t.amount), 0) as total_amount
  FROM transactions t
  WHERE t.created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND t.organization_id = org_id
  GROUP BY DATE_TRUNC('day', t.created_at), EXTRACT(YEAR FROM t.created_at)
  ORDER BY DATE_TRUNC('day', t.created_at) ASC;
END;
$$;

-- Function: Get weekly transaction trends (PER ORGANIZATION)
CREATE OR REPLACE FUNCTION get_weekly_transaction_trends(org_id UUID, weeks_back INTEGER DEFAULT 8)
RETURNS TABLE(
  week TEXT,
  year INTEGER,
  transaction_count BIGINT,
  total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Week ' || TO_CHAR(DATE_TRUNC('week', t.created_at), 'WW') || ' ' || 
    TO_CHAR(DATE_TRUNC('week', t.created_at), 'Mon') as week,
    EXTRACT(YEAR FROM t.created_at)::INTEGER as year,
    COUNT(*)::BIGINT as transaction_count,
    COALESCE(SUM(t.amount), 0) as total_amount
  FROM transactions t
  WHERE t.created_at >= NOW() - (weeks_back || ' weeks')::INTERVAL
    AND t.organization_id = org_id
  GROUP BY DATE_TRUNC('week', t.created_at), EXTRACT(YEAR FROM t.created_at)
  ORDER BY DATE_TRUNC('week', t.created_at) ASC;
END;
$$;

COMMENT ON FUNCTION get_daily_transaction_trends(UUID, INTEGER) IS 'Get daily transaction trends for a specific organization';
COMMENT ON FUNCTION get_weekly_transaction_trends(UUID, INTEGER) IS 'Get weekly transaction trends for a specific organization';

