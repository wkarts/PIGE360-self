from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    app_name: str = 'PIGE360 Self'
    app_version: str = '0.3.0'
    app_env: str = 'production'
    app_url: str = 'http://localhost:58080'
    app_secret_key: str
    setup_token: str
    database_url: str = 'postgresql+psycopg://pige360:pige360@db:5432/pige360'
    storage_path: Path = Path('/data/documents')
    frontend_path: Path = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
    trusted_proxy_ips: str = ''
    allowed_hosts: str = 'localhost,127.0.0.1'
    cookie_secure: bool = False
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    max_upload_mb: int = 10
    allow_sqlite: bool = False
    integration_encryption_key: str = ''
    integration_timeout_seconds: int = 15
    connect_allowed_hosts: str = ''
    connect_allow_private: bool = False
    portal_session_hours: int = 12
    portal_max_files: int = 20
    portal_max_storage_mb: int = 50
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_username: str = ''
    smtp_password: str = ''
    smtp_from: str = ''
    smtp_security: str = 'starttls'
    worker_poll_seconds: int = 5
    bank_reconcile_interval_seconds: int = 900

    @model_validator(mode='after')
    def validate_runtime(self):
        if self.trusted_proxy_ips:
            import ipaddress
            for item in self.trusted_proxy_ips.split(','):
                network=ipaddress.ip_network(item.strip(),strict=False)
                if network.prefixlen==0:
                    raise ValueError('TRUSTED_PROXY_IPS não aceita confiança irrestrita.')
        if not 300 <= self.bank_reconcile_interval_seconds <= 86400:
            raise ValueError('BANK_RECONCILE_INTERVAL_SECONDS: 300 a 86400 segundos.')
        if not 1 <= self.portal_session_hours <= 48 or not 1 <= self.portal_max_files <= 100 or not 1 <= self.portal_max_storage_mb <= 1000:
            raise ValueError('Limites do portal inválidos.')
        if self.smtp_security not in ('starttls', 'ssl'):
            raise ValueError('SMTP_SECURITY deve ser starttls ou ssl; envio sem TLS não permitido.')
        if not 3 <= self.integration_timeout_seconds <= 30 or not 1 <= self.worker_poll_seconds <= 60:
            raise ValueError('Timeout/intervalo do worker fora do limite permitido.')
        if len(self.app_secret_key) < 32 or len(self.setup_token) < 24:
            raise ValueError('Gere APP_SECRET_KEY e SETUP_TOKEN com scripts/configure.py.')
        if self.database_url.startswith('sqlite') and not self.allow_sqlite:
            raise ValueError('SQLite é permitido somente com ALLOW_SQLITE=true para validação local.')
        if self.app_env == 'production' and self.app_url.startswith('https:') and not self.cookie_secure:
            raise ValueError('HTTPS exige COOKIE_SECURE=true.')
        return self

    @property
    def hosts(self) -> list[str]:
        return list(set([h.strip() for h in self.allowed_hosts.split(',') if h.strip()] + [urlsplit(self.app_url).hostname or 'localhost']))


@lru_cache
def settings() -> Settings:
    return Settings()
