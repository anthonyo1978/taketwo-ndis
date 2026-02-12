-- Migration: Create atomic transaction ID generation function
-- This eliminates the race condition where two concurrent requests
-- could read the same "latest ID" and generate duplicates.

CREATE OR REPLACE FUNCTION public.generate_next_txn_id(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_prefix TEXT;
  v_latest_id TEXT;
  v_letter CHAR(1);
  v_number INT;
  v_next_id TEXT;
BEGIN
  -- Generate org-specific prefix (first 6 chars of org ID in uppercase)
  v_org_prefix := UPPER(LEFT(p_organization_id::TEXT, 6));
  
  -- Use advisory lock keyed on the org to serialize ID generation per org
  -- This prevents two concurrent calls for the same org from racing
  PERFORM pg_advisory_xact_lock(hashtext('txn_id_gen_' || p_organization_id::TEXT));
  
  -- Find the highest existing sequential ID for this org
  SELECT id INTO v_latest_id
  FROM public.transactions
  WHERE organization_id = p_organization_id
    AND id LIKE 'TXN-' || v_org_prefix || '-%'
  ORDER BY id DESC
  LIMIT 1;
  
  IF v_latest_id IS NULL THEN
    -- First transaction for this org
    RETURN 'TXN-' || v_org_prefix || '-A000001';
  END IF;
  
  -- Extract letter and number from the ID
  -- Format: TXN-{ORG_PREFIX}-{LETTER}{6_DIGITS} e.g. TXN-D9430C-A000042
  -- Also handle legacy suffix format: TXN-{ORG_PREFIX}-{LETTER}{6_DIGITS}-{SUFFIX}
  v_letter := SUBSTRING(v_latest_id FROM 'TXN-[A-Z0-9]+-([A-Z])');
  v_number := CAST(SUBSTRING(v_latest_id FROM 'TXN-[A-Z0-9]+-[A-Z](\d{6})') AS INT);
  
  IF v_letter IS NULL OR v_number IS NULL THEN
    -- Couldn't parse, start fresh
    RETURN 'TXN-' || v_org_prefix || '-A000001';
  END IF;
  
  -- Increment
  IF v_number >= 999999 THEN
    v_letter := CHR(ASCII(v_letter) + 1);
    v_number := 1;
  ELSE
    v_number := v_number + 1;
  END IF;
  
  v_next_id := 'TXN-' || v_org_prefix || '-' || v_letter || LPAD(v_number::TEXT, 6, '0');
  
  RETURN v_next_id;
END;
$$;

-- Grant execute to authenticated users (RLS on transactions table still applies)
GRANT EXECUTE ON FUNCTION public.generate_next_txn_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_next_txn_id(UUID) TO service_role;

