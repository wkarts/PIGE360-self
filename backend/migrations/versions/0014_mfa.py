"""2FA opcional por conta e obrigatório por instalação; sem ativação automática."""
from alembic import op
import sqlalchemy as sa
revision = '0014_mfa'
down_revision = '0013_embedding_security'
branch_labels = None
depends_on = None


def record_columns():
    return [sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False)]


def upgrade():
    for table in ['auth_sessions', 'portal_sessions']:
        op.add_column(table, sa.Column('mfa_verified', sa.Boolean(), nullable=False, server_default=sa.false()))
    table = op.create_table('installation_mfa', sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('required', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    op.bulk_insert(table, [{'id':1, 'required':False, 'version':1}])
    op.create_table('mfa_credentials', sa.Column('subject',sa.String(80),primary_key=True),
        sa.Column('enabled',sa.Boolean(),nullable=False,server_default=sa.false()),
        sa.Column('encrypted_secret',sa.Text(),nullable=False),sa.Column('last_counter',sa.Integer(),nullable=False,server_default='-1'))
    op.create_table('mfa_challenges', *record_columns(),
        sa.Column('subject',sa.String(80),nullable=False),sa.Column('token_hash',sa.String(64),nullable=False,unique=True),
        sa.Column('password_revision',sa.String(64),nullable=False),sa.Column('policy_version',sa.Integer(),nullable=False),
        sa.Column('purpose',sa.String(16),nullable=False),sa.Column('encrypted_secret',sa.Text(),nullable=False),
        sa.Column('expires_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('failures',sa.Integer(),nullable=False,server_default='0'),sa.Column('consumed',sa.Boolean(),nullable=False,server_default=sa.false()))
    op.create_index('ix_mfa_challenges_subject','mfa_challenges',['subject'])
    op.create_index('ix_mfa_challenges_expires_at','mfa_challenges',['expires_at'])
    op.create_table('mfa_recovery_codes', *record_columns(),
        sa.Column('subject',sa.String(80),sa.ForeignKey('mfa_credentials.subject'),nullable=False),
        sa.Column('code_hash',sa.String(64),nullable=False,unique=True))
    op.create_index('ix_mfa_recovery_codes_subject','mfa_recovery_codes',['subject'])


def downgrade():
    op.drop_table('mfa_recovery_codes'); op.drop_table('mfa_challenges'); op.drop_table('mfa_credentials'); op.drop_table('installation_mfa')
    for table in ['auth_sessions','portal_sessions']:
        op.drop_column(table,'mfa_verified')
