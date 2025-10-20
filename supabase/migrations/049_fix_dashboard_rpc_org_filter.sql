-- ============================================================================
-- FIX DASHBOARD RPC FUNCTIONS - Add Organization Filtering
-- ============================================================================

-- ISSUE: Dashboard functions show data from ALL organizations
-- FIX: Add organization_id parameter and filter all queries

-- Drop old functions
DROP FUNCTION IF EXISTS get_portfolio_metrics();
DROP FUNCTION IF EXISTS get_transaction_metrics(INTEGER);
DROP FUNCTION IF EXISTS get_monthly_transaction_trends(INTEGER);

-- Recreate with organization_id parameter

-- Function: Get portfolio overview metrics (PER ORGANIZATION)
CREATE OR REPLACE FUNCTION get_portfolio_metrics(org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalHouses', (SELECT COUNT(*) FROM houses WHERE status = 'Active' AND organization_id = org_id),
    'totalResidents', (SELECT COUNT(*) FROM residents WHERE status = 'Active' AND organization_id = org_id),
    'totalContracts', (SELECT COUNT(*) FROM funding_contracts WHERE contract_status = 'Active' AND organization_id = org_id),
    'totalBalance', (SELECT COALESCE(SUM(current_balance), 0) FROM funding_contracts WHERE contract_status = 'Active' AND organization_id = org_id)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: Get transaction metrics for a time period (PER ORGANIZATION)
CREATE OR REPLACE FUNCTION get_transaction_metrics(org_id UUID, days_back INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  start_date TIMESTAMP;
  previous_start_date TIMESTAMP;
BEGIN
  start_date := NOW() - (days_back || ' days')::INTERVAL;
  previous_start_date := NOW() - (days_back * 2 || ' days')::INTERVAL;
  
  SELECT json_build_object(
    'currentPeriod', json_build_object(
      'count', (SELECT COUNT(*) FROM transactions WHERE created_at >= start_date AND organization_id = org_id),
      'amount', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE created_at >= start_date AND organization_id = org_id)
    ),
    'previousPeriod', json_build_object(
      'count', (SELECT COUNT(*) FROM transactions WHERE created_at >= previous_start_date AND created_at < start_date AND organization_id = org_id),
      'amount', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE created_at >= previous_start_date AND created_at < start_date AND organization_id = org_id)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

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
    TO_CHAR(DATE_TRUNC('month', t.created_at), 'Mon') as month,
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

COMMENT ON FUNCTION get_portfolio_metrics(UUID) IS 'Get portfolio metrics for a specific organization';
COMMENT ON FUNCTION get_transaction_metrics(UUID, INTEGER) IS 'Get transaction metrics for a specific organization';
COMMENT ON FUNCTION get_monthly_transaction_trends(UUID, INTEGER) IS 'Get monthly transaction trends for a specific organization';

-- Drop old functions
DROP FUNCTION IF EXISTS get_recent_activity(INTEGER);
DROP FUNCTION IF EXISTS get_house_performance();

-- Function: Get recent activity (PER ORGANIZATION)
CREATE OR REPLACE FUNCTION get_recent_activity(org_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  transaction_id TEXT,
  resident_id UUID,
  resident_name TEXT,
  house_id UUID,
  house_name TEXT,
  amount NUMERIC,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as transaction_id,
    r.id as resident_id,
    (r.first_name || ' ' || r.last_name) as resident_name,
    h.id as house_id,
    COALESCE(h.descriptor, 'House') as house_name,
    t.amount,
    t.status,
    t.created_at
  FROM transactions t
  INNER JOIN residents r ON t.resident_id = r.id
  INNER JOIN houses h ON r.house_id = h.id
  WHERE t.organization_id = org_id
  ORDER BY t.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function: Get house performance (PER ORGANIZATION)
CREATE OR REPLACE FUNCTION get_house_performance(org_id UUID)
RETURNS TABLE(
  house_id UUID,
  house_name TEXT,
  house_address TEXT,
  resident_count BIGINT,
  active_contracts BIGINT,
  total_balance NUMERIC,
  transactions_30d BIGINT,
  revenue_30d NUMERIC,
  occupancy_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    COALESCE(h.descriptor, 'House'),
    (h.address1 || ', ' || h.suburb || ', ' || h.state),
    (SELECT COUNT(*) FROM residents r WHERE r.house_id = h.id AND r.status = 'Active' AND r.organization_id = org_id)::BIGINT,
    (SELECT COUNT(*) FROM funding_contracts fc 
     INNER JOIN residents r ON fc.resident_id = r.id 
     WHERE r.house_id = h.id AND fc.contract_status = 'Active' AND fc.organization_id = org_id)::BIGINT,
    (SELECT COALESCE(SUM(fc.current_balance), 0) FROM funding_contracts fc 
     INNER JOIN residents r ON fc.resident_id = r.id 
     WHERE r.house_id = h.id AND fc.contract_status = 'Active' AND fc.organization_id = org_id),
    (SELECT COUNT(*) FROM transactions t 
     INNER JOIN residents r ON t.resident_id = r.id 
     WHERE r.house_id = h.id AND t.created_at >= NOW() - INTERVAL '30 days' AND t.organization_id = org_id)::BIGINT,
    (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t 
     INNER JOIN residents r ON t.resident_id = r.id 
     WHERE r.house_id = h.id AND t.created_at >= NOW() - INTERVAL '30 days' AND t.organization_id = org_id),
    100.0 -- Placeholder for occupancy rate
  FROM houses h
  WHERE h.organization_id = org_id
  ORDER BY h.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_recent_activity(UUID, INTEGER) IS 'Get recent activity for a specific organization';
COMMENT ON FUNCTION get_house_performance(UUID) IS 'Get house performance metrics for a specific organization';
