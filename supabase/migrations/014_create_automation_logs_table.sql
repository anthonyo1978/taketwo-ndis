-- Create automation_logs table for storing batch job execution details
-- This table tracks all automated billing runs for monitoring and debugging

CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  contracts_processed INTEGER DEFAULT 0,
  contracts_skipped INTEGER DEFAULT 0,
  contracts_failed INTEGER DEFAULT 0,
  execution_time_ms INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by date
CREATE INDEX idx_automation_logs_run_date ON automation_logs(run_date DESC);

-- Create index for status filtering
CREATE INDEX idx_automation_logs_status ON automation_logs(status);

-- Add comment to explain the table purpose
COMMENT ON TABLE automation_logs IS 'Logs of automated billing batch job executions';
COMMENT ON COLUMN automation_logs.run_date IS 'Date and time when the batch job was executed';
COMMENT ON COLUMN automation_logs.status IS 'Overall status of the batch run: success, partial, or failed';
COMMENT ON COLUMN automation_logs.contracts_processed IS 'Number of contracts successfully processed';
COMMENT ON COLUMN automation_logs.contracts_skipped IS 'Number of contracts skipped (e.g., insufficient balance)';
COMMENT ON COLUMN automation_logs.contracts_failed IS 'Number of contracts that failed processing';
COMMENT ON COLUMN automation_logs.execution_time_ms IS 'Total execution time in milliseconds';
COMMENT ON COLUMN automation_logs.errors IS 'JSON array of detailed error information';
COMMENT ON COLUMN automation_logs.summary IS 'Human-readable summary of the batch run';
