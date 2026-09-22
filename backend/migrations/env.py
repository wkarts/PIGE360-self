from alembic import context
from sqlalchemy import create_engine, pool
from app.config import settings
from app.models import Base

config = context.config
url = settings().database_url
if context.is_offline_mode():
    context.configure(url=url, target_metadata=Base.metadata, literal_binds=True, dialect_opts={'paramstyle':'named'})
    with context.begin_transaction(): context.run_migrations()
else:
    connectable = create_engine(url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
        with context.begin_transaction(): context.run_migrations()
    connectable.dispose()
