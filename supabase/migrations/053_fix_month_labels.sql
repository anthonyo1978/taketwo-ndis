-- ============================================================================
-- FIX MONTH LABELS IN TRANSACTION TRENDS
-- Change month labels from 'Mon' (e.g., 'Oct') to full month names (e.g., 'October')
-- ============================================================================

-- Function: Get monthly transaction trends (PER ORGANIZATION)
CREATE OR REPLACE FUNCTION get_monthly_transaction_trends(org_id UUID, months_back INTEGER DEFAULT 6)
RETURNS TABLE(
  month TEXT,
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
    TO_CHAR(DATE_TRUNC('month', t.created_at), 'Mon YY') as month,
    EXTRACT(YEAR FROM t.created_at)::INTEGER as year,
    COUNT(*)::BIGINT as transaction_count,
    COALESCE(SUM(t.amount), 0) as total_amount
  FROM transactions t
  WHERE t.created_at >= NOW() - (months_back || ' months')::INTERVAL
    AND t.organization_id = org_id
  GROUP BY DATE_TRUNC('month', t.created_at), EXTRACT(YEAR FROM t.created_at)
  ORDER BY DATE_TRUNC('month', t.created_at) ASC;
END;
$$;

COMMENT ON FUNCTION get_monthly_transaction_trends(UUID, INTEGER) IS 'Get monthly transaction trends for a specific organization with full month names';

