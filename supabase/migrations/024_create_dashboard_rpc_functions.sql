-- ============================================================================
-- DASHBOARD RPC FUNCTIONS
-- Efficient aggregation functions for dashboard metrics
-- ============================================================================

-- Function: Get portfolio overview metrics
CREATE OR REPLACE FUNCTION get_portfolio_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalHouses', (SELECT COUNT(*) FROM houses WHERE status = 'Active'),
    'totalResidents', (SELECT COUNT(*) FROM residents WHERE status = 'Active'),
    'totalContracts', (SELECT COUNT(*) FROM funding_contracts WHERE contract_status = 'Active'),
    'totalBalance', (SELECT COALESCE(SUM(current_balance), 0) FROM funding_contracts WHERE contract_status = 'Active')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: Get transaction metrics for a time period
CREATE OR REPLACE FUNCTION get_transaction_metrics(days_back INTEGER DEFAULT 30)
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
      'count', (SELECT COUNT(*) FROM transactions WHERE created_at >= start_date),
      'amount', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE created_at >= start_date)
    ),
    'previousPeriod', json_build_object(
      'count', (SELECT COUNT(*) FROM transactions WHERE created_at >= previous_start_date AND created_at < start_date),
      'amount', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE created_at >= previous_start_date AND created_at < start_date)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function: Get monthly transaction trends (last N months)
CREATE OR REPLACE FUNCTION get_monthly_transaction_trends(months_back INTEGER DEFAULT 6)
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
  GROUP BY DATE_TRUNC('month', t.created_at), EXTRACT(YEAR FROM t.created_at)
  ORDER BY DATE_TRUNC('month', t.created_at) ASC;
END;
$$;

-- Function: Get recent activity (last N transactions with details)
CREATE OR REPLACE FUNCTION get_recent_activity(limit_count INTEGER DEFAULT 10)
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
    COALESCE(h.descriptor, h.address1) as house_name,
    t.amount,
    t.status,
    t.created_at
  FROM transactions t
  JOIN residents r ON r.id = t.resident_id
  LEFT JOIN houses h ON h.id = r.house_id
  ORDER BY t.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function: Get house performance metrics
CREATE OR REPLACE FUNCTION get_house_performance()
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
    (SELECT COUNT(*) FROM residents r2 WHERE r2.house_id = h.id AND r2.status = 'Active')::BIGINT,
    (SELECT COUNT(*) FROM funding_contracts fc 
     JOIN residents r3 ON r3.id = fc.resident_id 
     WHERE r3.house_id = h.id AND fc.contract_status = 'Active')::BIGINT,
    (SELECT COALESCE(SUM(fc.current_balance), 0) FROM funding_contracts fc 
     JOIN residents r4 ON r4.id = fc.resident_id 
     WHERE r4.house_id = h.id AND fc.contract_status = 'Active'),
    (SELECT COUNT(*) FROM transactions t 
     JOIN residents r5 ON r5.id = t.resident_id 
     WHERE r5.house_id = h.id AND t.created_at >= NOW() - INTERVAL '30 days')::BIGINT,
    (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t 
     JOIN residents r6 ON r6.id = t.resident_id 
     WHERE r6.house_id = h.id AND t.created_at >= NOW() - INTERVAL '30 days'),
    CASE 
      WHEN h.status = 'Active' THEN 100.0
      WHEN h.status = 'Vacant' THEN 0.0
      ELSE 50.0
    END
  FROM houses h
  WHERE h.status IN ('Active', 'Vacant')
  ORDER BY 8 DESC;
END;
$$;

-- ============================================================================
-- VERIFY FUNCTIONS CREATED
-- ============================================================================

-- List all dashboard functions
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname LIKE 'get_%_metrics' OR proname LIKE 'get_%_activity' OR proname LIKE 'get_%_performance' OR proname LIKE 'get_monthly_%'
ORDER BY proname;

-- ============================================================================
-- TEST THE FUNCTIONS
-- ============================================================================

-- Test portfolio metrics
SELECT get_portfolio_metrics();

-- Test transaction metrics (last 30 days)
SELECT get_transaction_metrics(30);

-- Test monthly trends (last 6 months)
SELECT * FROM get_monthly_transaction_trends(6);

-- Test recent activity (last 10 transactions)
SELECT * FROM get_recent_activity(10);

-- Test house performance
SELECT * FROM get_house_performance();

