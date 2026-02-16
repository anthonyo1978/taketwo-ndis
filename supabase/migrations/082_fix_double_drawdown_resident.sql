-- ============================================================================
-- FIX: Double drawdown for resident 753461ba-a9ea-43d4-8982-597e78c612d2
-- 
-- Root cause: The resident has TWO funding contracts with auto_billing_enabled = true.
-- The automation processes EACH contract independently, creating 2 transactions per day.
--
-- This migration:
--   1. Identifies the duplicate contracts
--   2. Keeps automation on the NEWEST active contract only
--   3. Disables automation on all other contracts for this resident
--   4. Deletes the duplicate automation transactions (keeping one per day)
--   5. Recalculates the correct contract balance
-- ============================================================================

DO $$
DECLARE
    _resident_id UUID := '753461ba-a9ea-43d4-8982-597e78c612d2';
    _resident_name TEXT;
    _automation_contract_count INT;
    _keep_contract_id UUID;
    _deleted_txn_count INT := 0;
    _total_refund NUMERIC(12,2) := 0;
    _txn RECORD;
BEGIN
    -- Get resident name for logging
    SELECT first_name || ' ' || last_name INTO _resident_name
    FROM residents WHERE id = _resident_id;
    
    IF _resident_name IS NULL THEN
        RAISE NOTICE 'Resident % not found. Aborting.', _resident_id;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Processing double drawdown fix for: %', _resident_name;
    
    -- Count contracts with automation enabled
    SELECT COUNT(*) INTO _automation_contract_count
    FROM funding_contracts
    WHERE resident_id = _resident_id
      AND auto_billing_enabled = true
      AND contract_status = 'Active';
    
    RAISE NOTICE 'Found % active contracts with automation enabled', _automation_contract_count;
    
    IF _automation_contract_count <= 1 THEN
        RAISE NOTICE 'Only 0 or 1 contract has automation enabled. No duplicate issue found.';
        RAISE NOTICE 'Check if the doubling is caused by something else (e.g., cron running twice).';
        -- Still proceed to clean up duplicate transactions if any exist
    END IF;
    
    -- Identify the contract to KEEP (newest active contract with the highest balance)
    SELECT id INTO _keep_contract_id
    FROM funding_contracts
    WHERE resident_id = _resident_id
      AND auto_billing_enabled = true
      AND contract_status = 'Active'
    ORDER BY current_balance DESC, created_at DESC
    LIMIT 1;
    
    RAISE NOTICE 'Keeping automation on contract: %', _keep_contract_id;
    
    -- Disable automation on ALL OTHER contracts for this resident
    UPDATE funding_contracts
    SET auto_billing_enabled = false,
        updated_at = NOW()
    WHERE resident_id = _resident_id
      AND auto_billing_enabled = true
      AND id != _keep_contract_id;
    
    RAISE NOTICE 'Disabled automation on % other contract(s)', 
        (SELECT COUNT(*) FROM funding_contracts 
         WHERE resident_id = _resident_id AND auto_billing_enabled = false AND id != _keep_contract_id);
    
    -- Delete duplicate transactions: for each day that has >1 automation transaction,
    -- keep the first one (by created_at) and delete the rest
    FOR _txn IN
        SELECT id, amount, contract_id, occurred_at::date AS txn_date
        FROM (
            SELECT id, amount, contract_id, occurred_at,
                   ROW_NUMBER() OVER (
                       PARTITION BY occurred_at::date 
                       ORDER BY created_at ASC
                   ) AS rn
            FROM transactions
            WHERE resident_id = _resident_id
              AND created_by = 'automation-system'
        ) ranked
        WHERE rn > 1
    LOOP
        DELETE FROM transactions WHERE id = _txn.id;
        _deleted_txn_count := _deleted_txn_count + 1;
        _total_refund := _total_refund + _txn.amount;
        RAISE NOTICE 'Deleted duplicate txn % (date: %, amount: $%, contract: %)', 
            _txn.id, _txn.txn_date, _txn.amount, _txn.contract_id;
    END LOOP;
    
    RAISE NOTICE 'Deleted % duplicate transactions totaling $%', _deleted_txn_count, _total_refund;
    
    -- Recalculate the kept contract's balance by adding back the deleted amount
    IF _total_refund > 0 AND _keep_contract_id IS NOT NULL THEN
        UPDATE funding_contracts
        SET current_balance = current_balance + _total_refund,
            updated_at = NOW()
        WHERE id = _keep_contract_id;
        
        RAISE NOTICE 'Restored $% to contract % balance', _total_refund, _keep_contract_id;
    END IF;
    
    -- Final summary
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX COMPLETE for %', _resident_name;
    RAISE NOTICE 'Kept automation on contract: %', _keep_contract_id;
    RAISE NOTICE 'Duplicate transactions removed: %', _deleted_txn_count;
    RAISE NOTICE 'Balance restored: $%', _total_refund;
    RAISE NOTICE '========================================';
END $$;

