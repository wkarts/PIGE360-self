"""Abstração de armazenamento privado local ou compatível com S3/MinIO.

Arquivos nunca são expostos por URL pública. A API valida a escola, a sessão e
o SHA-256 antes de entregar o conteúdo.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from .config import settings


def backend_name() -> str:
    return settings().storage_backend.lower()


def _local_path(key: str) -> Path:
    root = settings().storage_path.resolve()
    path = (root / key).resolve()
    if not path.is_relative_to(root):
        raise ValueError('Caminho de armazenamento inválido.')
    return path


def _s3_client():
    import boto3
    from botocore.config import Config

    cfg = settings()
    client_config = Config(
        signature_version='s3v4',
        s3={'addressing_style': 'path'} if cfg.storage_force_path_style else {},
    )
    return boto3.client(
        's3',
        endpoint_url=cfg.storage_endpoint_url or None,
        region_name=cfg.storage_region,
        aws_access_key_id=cfg.storage_access_key or None,
        aws_secret_access_key=cfg.storage_secret_key or None,
        use_ssl=cfg.storage_use_ssl,
        config=client_config,
    )


def ensure_storage() -> None:
    cfg = settings()
    if backend_name() == 'local':
        cfg.storage_path.mkdir(parents=True, exist_ok=True)
        return

    client = _s3_client()
    try:
        client.head_bucket(Bucket=cfg.storage_bucket)
    except Exception as exc:
        response = getattr(exc, 'response', {}) or {}
        code = str(response.get('Error', {}).get('Code', ''))
        missing = code in {'404', 'NoSuchBucket', 'NotFound', 'NoSuchKey'}
        if not missing or not cfg.storage_auto_create_bucket:
            raise
        client.create_bucket(Bucket=cfg.storage_bucket)


def put_bytes(key: str, data: bytes, mime_type: str) -> None:
    cfg = settings()
    if backend_name() == 'local':
        path = _local_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix('.part')
        try:
            with open(temporary, 'xb') as handle:
                handle.write(data)
                handle.flush()
                import os
                os.fsync(handle.fileno())
            temporary.chmod(0o600)
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
        return

    _s3_client().put_object(
        Bucket=cfg.storage_bucket,
        Key=key,
        Body=data,
        ContentType=mime_type,
        Metadata={'pige360-managed': 'true'},
    )


def read_bytes(file_record: Any) -> bytes:
    backend = (getattr(file_record, 'storage_backend', '') or 'local').lower()
    key = file_record.storage_key
    if backend == 'local':
        return _local_path(key).read_bytes()

    bucket = getattr(file_record, 'bucket_name', '') or settings().storage_bucket
    response = _s3_client().get_object(Bucket=bucket, Key=key)
    return response['Body'].read()


def delete_key(backend: str, key: str, bucket: str = '') -> None:
    if (backend or 'local').lower() == 'local':
        _local_path(key).unlink(missing_ok=True)
        return
    _s3_client().delete_object(Bucket=bucket or settings().storage_bucket, Key=key)


def delete_file(file_record: Any) -> None:
    delete_key(
        getattr(file_record, 'storage_backend', '') or 'local',
        file_record.storage_key,
        getattr(file_record, 'bucket_name', '') or '',
    )
