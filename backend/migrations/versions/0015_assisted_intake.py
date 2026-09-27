"""OCR privado, consultas públicas e dados cadastrais da mantenedora."""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone
revision='0015_assisted_intake'
down_revision='0014_mfa'
branch_labels=None
depends_on=None

ADDRESS={'trade_name':180,'address':400,'phone':32,'email':254,'postal_code':16,'street':180,
    'address_number':24,'address_complement':120,'district':120,'city':120,'state':2,'country':80,
    'registration_status':60,'opened_on':30,'legal_nature':180,'main_activity':180}


def upgrade():
    op.add_column('portal_accounts',sa.Column('personal_details',sa.JSON(),nullable=False,server_default='{}'))
    for key,size in ADDRESS.items():
        op.add_column('companies',sa.Column(key,sa.String(size),nullable=False,server_default='Brasil' if key=='country' else ''))
    for key in ['registration_status','opened_on','legal_nature','main_activity']:
        op.add_column('persons',sa.Column(key,sa.String(ADDRESS[key]),nullable=False,server_default=''))
    op.create_table('ocr_jobs',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),
        sa.Column('school_id',sa.String(36),sa.ForeignKey('schools.id'),nullable=False),
        sa.Column('owner_kind',sa.String(12),nullable=False),sa.Column('owner_id',sa.String(36),nullable=False),
        sa.Column('purpose',sa.String(20),nullable=False),sa.Column('sha256',sa.String(64),nullable=False),
        sa.Column('storage_key',sa.String(240),nullable=False),sa.Column('storage_backend',sa.String(12),nullable=False),
        sa.Column('bucket_name',sa.String(120),nullable=False),sa.Column('mime_type',sa.String(40),nullable=False),
        sa.Column('size',sa.Integer(),nullable=False),sa.Column('status',sa.String(20),nullable=False),
        sa.Column('attempts',sa.Integer(),nullable=False),sa.Column('available_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('lease_until',sa.DateTime(timezone=True)),sa.Column('lease_token',sa.String(64),nullable=False),
        sa.Column('expires_at',sa.DateTime(timezone=True),nullable=False),sa.Column('encrypted_result',sa.Text(),nullable=False),
        sa.Column('error_code',sa.String(60),nullable=False))
    op.create_index('ix_ocr_jobs_school_id','ocr_jobs',['school_id'])
    op.create_index('ix_ocr_jobs_expires_at','ocr_jobs',['expires_at'])
    op.create_index('ix_ocr_owner','ocr_jobs',['school_id','owner_kind','owner_id'])
    op.create_index('ix_ocr_queue','ocr_jobs',['status','available_at'])
    op.create_table('lookup_cache',sa.Column('key',sa.String(80),primary_key=True),sa.Column('data',sa.JSON(),nullable=False),
        sa.Column('provider',sa.String(24),nullable=False),sa.Column('fetched_at',sa.DateTime(timezone=True)),
        sa.Column('expires_at',sa.DateTime(timezone=True)),sa.Column('lease_until',sa.DateTime(timezone=True)),
        sa.Column('lease_token',sa.String(64),nullable=False))
    providers=op.create_table('lookup_providers',sa.Column('id',sa.String(24),primary_key=True),
        sa.Column('available_at',sa.DateTime(timezone=True),nullable=False))
    op.bulk_insert(providers,[{'id':p,'available_at':datetime(2000,1,1,tzinfo=timezone.utc)}
        for p in ['brasilapi_cnpj','cnpjws','receitaws','viacep','brasilapi_cep']])
    op.create_table('assisted_quotas',sa.Column('key',sa.String(100),primary_key=True),
        sa.Column('count',sa.Integer(),nullable=False),sa.Column('window_started',sa.DateTime(timezone=True),nullable=False))
    settings=op.create_table('installation_intake',sa.Column('id',sa.Integer(),primary_key=True),
        sa.Column('version',sa.Integer(),nullable=False),sa.Column('ocr_enabled',sa.Boolean(),nullable=False),
        sa.Column('lookups_enabled',sa.Boolean(),nullable=False))
    op.bulk_insert(settings,[{'id':1,'version':1,'ocr_enabled':True,'lookups_enabled':True}])


def downgrade():
    op.drop_column('portal_accounts','personal_details')
    for table in ['ocr_jobs','lookup_cache','lookup_providers','assisted_quotas','installation_intake']:
        op.drop_table(table)
    for key in ['registration_status','opened_on','legal_nature','main_activity']:op.drop_column('persons',key)
    for key in reversed(ADDRESS):op.drop_column('companies',key)
