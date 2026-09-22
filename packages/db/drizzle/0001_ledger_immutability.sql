-- Append-only tables (blueprint §8: ledger entries are never changed or deleted;
-- economy config versions are never overwritten; every admin action stays in the audit log).
CREATE OR REPLACE FUNCTION zm_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'table % is append-only (% rejected)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION zm_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_transactions_append_only
  BEFORE UPDATE OR DELETE ON ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION zm_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER economy_config_append_only
  BEFORE UPDATE OR DELETE ON economy_config
  FOR EACH ROW EXECUTE FUNCTION zm_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION zm_reject_mutation();
--> statement-breakpoint
-- Truncate bypasses row triggers; block it too.
CREATE TRIGGER ledger_entries_no_truncate
  BEFORE TRUNCATE ON ledger_entries
  FOR EACH STATEMENT EXECUTE FUNCTION zm_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER ledger_transactions_no_truncate
  BEFORE TRUNCATE ON ledger_transactions
  FOR EACH STATEMENT EXECUTE FUNCTION zm_reject_mutation();
