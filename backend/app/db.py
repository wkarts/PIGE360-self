from datetime import UTC, datetime
from uuid import uuid4
from sqlalchemy import MetaData, create_engine, event, String, DateTime, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .config import settings

# Convenção de nomes reaproveitada do template, com base operacional própria.
NAMING_CONVENTION = {'ix': 'ix_%(column_0_label)s', 'uq': 'uq_%(table_name)s_%(column_0_name)s',
                    'ck': 'ck_%(table_name)s_%(constraint_name)s', 'fk': 'fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s', 'pk': 'pk_%(table_name)s'}
class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)

def now():
    return datetime.now(UTC)

def uid():
    return str(uuid4())

class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

cfg = settings()
engine = create_engine(cfg.database_url, pool_pre_ping=True, **({'connect_args': {'check_same_thread': False, 'timeout': 30}} if cfg.database_url.startswith('sqlite') else {}))
if engine.dialect.name == 'sqlite':
    @event.listens_for(engine, 'connect')
    def sqlite_foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')

SessionLocal = sessionmaker(engine, expire_on_commit=False)

def get_db():
    with SessionLocal() as session:
        try:
            yield session
            session.commit()
            session.info.pop('new_files', None)
            session.info.pop('new_storage_objects', None)
        except BaseException:
            session.rollback()
            for path in session.info.pop('new_files', []):
                path.unlink(missing_ok=True)
            for backend, bucket, key in session.info.pop('new_storage_objects', []):
                try:
                    from .storage import delete_key
                    delete_key(backend, key, bucket)
                except Exception:
                    pass
            raise
