DO $$ BEGIN
  IF to_regclass('public.integration_jobs') IS NOT NULL THEN
    UPDATE integration_jobs SET status='uncertain',error_code='RESTORE_REQUIRES_RECONCILIATION',lease_until=NULL
      WHERE status IN ('pending','retry','processing');
  END IF;
  IF to_regclass('public.bank_charges') IS NOT NULL THEN
    UPDATE bank_charges SET status='uncertain' WHERE status='queued';
  END IF;
  IF to_regclass('public.crm_bridge_requests') IS NOT NULL THEN
    UPDATE crm_bridge_requests SET status='failed',error_code='RESTORE_REQUIRES_RECONCILIATION'
      WHERE status IN ('queued','retry');
  END IF;
  IF to_regclass('public.crm_bridge_external_requests') IS NOT NULL THEN
    UPDATE crm_bridge_external_requests SET status='uncertain',error_code='RESTORE_REQUIRES_RECONCILIATION'
      WHERE status IN ('queued','sending');
  END IF;
  IF to_regclass('public.connect_message_jobs') IS NOT NULL THEN
    UPDATE connect_message_jobs SET status='uncertain',error_code='RESTORE_REQUIRES_RECONCILIATION',lease_until=NULL
      WHERE status IN ('pending','retry','processing');
  END IF;
  IF to_regclass('public.backup_runs') IS NOT NULL THEN
    UPDATE backup_runs SET status='failed',stage='failed',error_code='RESTORE_INTERRUPTED'
      WHERE status IN ('queued','processing');
    UPDATE backup_runs SET remote_status='uncertain' WHERE remote_status IN ('queued','sending');
  END IF;
  IF to_regclass('public.ocr_jobs') IS NOT NULL THEN
    UPDATE ocr_jobs SET status='failed',error_code='RESTORE_REQUIRES_RESCAN',lease_until=NULL,lease_token=''
      WHERE status IN ('queued','processing');
  END IF;
  IF to_regclass('public.user_invitations') IS NOT NULL THEN
    UPDATE user_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE used_at IS NULL AND revoked_at IS NULL;
  END IF;
  IF to_regclass('public.auth_sessions') IS NOT NULL THEN
    UPDATE auth_sessions SET revoked=true WHERE NOT revoked;
  END IF;
  IF to_regclass('public.portal_sessions') IS NOT NULL THEN
    UPDATE portal_sessions SET revoked=true WHERE NOT revoked;
  END IF;
END $$;
