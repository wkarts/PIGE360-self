DO $$ BEGIN
  IF to_regclass('public.asaas_native_operations') IS NOT NULL THEN
    UPDATE asaas_native_operations SET status='uncertain',error_code='RESTORE_REQUIRES_RECONCILIATION',
      updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE status='processing';
  END IF;
  IF to_regclass('public.asaas_card_checkouts') IS NOT NULL THEN
    UPDATE asaas_card_checkouts SET status='uncertain',updated_at=CURRENT_TIMESTAMP,version=version+1
      WHERE status IN ('creating','scheduled','processing');
  END IF;
  IF to_regclass('public.asaas_card_mandates') IS NOT NULL THEN
    UPDATE asaas_card_mandates SET status='revoked',sealed_token='',updated_at=CURRENT_TIMESTAMP,version=version+1
      WHERE status='active';
  END IF;
  IF to_regclass('public.asaas_pix_authorizations') IS NOT NULL THEN
    UPDATE asaas_pix_authorizations SET
      status=CASE WHEN status IN ('PREPARING','CREATED','ACTIVE','CANCELLING') THEN 'RESTORE_REVIEW' ELSE status END,
      encrypted_qr='',scan_offset=0,terminal_scan_at=NULL,updated_at=CURRENT_TIMESTAMP,version=version+1
      WHERE status IN ('PREPARING','CREATED','ACTIVE','CANCELLING') OR encrypted_qr<>'' OR scan_offset<>0 OR terminal_scan_at IS NOT NULL;
  END IF;
  IF to_regclass('public.asaas_pix_cycles') IS NOT NULL THEN
    UPDATE asaas_pix_cycles SET status='UNCERTAIN',updated_at=CURRENT_TIMESTAMP,version=version+1
      WHERE status IN ('QUEUED','PREPARING','CREATING');
  END IF;
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
