"""Fonte SOGo de caixas validadas com host/login IMAP por instituição."""
import os
import re
from alembic import op

revision = '0037_sogo_user_source'
down_revision = '0036_sogo_webmail_sessions'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return
    bind.exec_driver_sql('''
        CREATE OR REPLACE VIEW sogo_users AS
        SELECT (mb.user_id || '@' || mb.school_id) AS c_uid,
               (mb.user_id || '@' || mb.school_id) AS c_name,
               COALESCE(u.name, '') AS c_cn,
               COALESCE(NULLIF(ec.address_override, ''), mb.address) AS mail,
               COALESCE(NULLIF(ec.address_override, ''), mb.address) AS c_mail,
               ''::text AS c_password,
               COALESCE(NULLIF(es.imap_host, ''), substring(mc.base_url from '^https?://([^/:]+)')) AS c_imap_host,
               COALESCE(NULLIF(ec.address_override, ''), mb.address) AS c_imap_login,
               COALESCE(NULLIF(es.imap_host, ''), substring(mc.base_url from '^https?://([^/:]+)')) AS c_sieve_host,
               split_part(COALESCE(NULLIF(ec.address_override, ''), mb.address), '@', 2) AS c_domain
          FROM school_mailboxes mb
          JOIN schools s ON s.id = mb.school_id AND s.active = TRUE
          JOIN school_access sa ON sa.school_id = mb.school_id AND sa.user_id = mb.user_id AND sa.active = TRUE
          JOIN users u ON u.id = mb.user_id AND u.active = TRUE
          JOIN email_connections ec ON ec.mailbox_id = mb.id AND ec.school_id = mb.school_id AND ec.user_id = mb.user_id
          JOIN mailcow_configs mc ON mc.id = mb.config_id AND mc.school_id = mb.school_id AND mc.enabled = TRUE
          LEFT JOIN email_server_settings es ON es.school_id = mb.school_id
         WHERE mb.provisioned_at IS NOT NULL AND mb.remote_active = TRUE
           AND ec.encrypted_secret <> '' AND ec.validated_at IS NOT NULL AND ec.last_error = ''
    ''')
    password = os.environ.get('SOGO_DB_PASSWORD', '')
    if password:
        if len(password) > 128 or not re.fullmatch(r'[A-Za-z0-9_-]+', password):
            raise RuntimeError('SOGO_DB_PASSWORD deve ser um segredo url-safe de até 128 caracteres.')
        role = 'pige360_sogo'
        existing = bind.exec_driver_sql('SELECT 1 FROM pg_roles WHERE rolname = %s', (role,)).scalar()
        quoted_password = "'" + password + "'"
        if not existing:
            bind.exec_driver_sql(f'CREATE ROLE {role} LOGIN PASSWORD {quoted_password}')
        else:
            bind.exec_driver_sql(f'ALTER ROLE {role} WITH LOGIN PASSWORD {quoted_password}')
        database = bind.dialect.identifier_preparer.quote(bind.engine.url.database)
        bind.exec_driver_sql(f'GRANT CONNECT ON DATABASE {database} TO {role}')
        bind.exec_driver_sql(f'GRANT USAGE, CREATE ON SCHEMA public TO {role}')
        bind.exec_driver_sql(f'GRANT SELECT ON sogo_users TO {role}')


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        bind.exec_driver_sql('DROP VIEW IF EXISTS sogo_users')
        # SOGo owns its groupware tables. Keep the role on downgrade so those
        # mail/calendar/contact records are never deleted as a side effect.
