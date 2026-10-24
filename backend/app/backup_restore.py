"""Restauração offline de pacote v2 com proteção prévia do estado atual.

Executar somente com app/workers parados. Não é chamado por endpoint HTTP.
O pacote pode conter documentos e credenciais criptografadas; as chaves da
instalação precisam ser preservadas separadamente.
"""
import argparse
import hashlib
import shutil
import subprocess
import tempfile
from pathlib import Path
import zipfile
from sqlalchemy import text
from .backups import create_bundle, pg_environment, verify_bundle
from .config import settings
from .db import engine, uid
from .storage import _local_path, _s3_client


def restore(path,*,progress=lambda *args:None,previous_id=None):
    manifest=verify_bundle(path)
    if engine.dialect.name!='postgresql':raise ValueError('Restauração completa exige PostgreSQL.')
    # Falha antes de tocar no destino se o bucket do pacote não corresponde ao
    # bucket configurado. Instalações isoladas podem usar o mesmo nome em outro endpoint.
    for item in manifest['objects']:
        if item['backend']=='s3' and item['bucket']!=settings().storage_bucket:
            raise ValueError('Configure o mesmo nome de bucket do backup antes de restaurar.')
    progress('protecting_current_state')
    if previous_id is None:
        previous_id=uid();create_bundle(previous_id,protect_current=True)
        from .backups import bundle_path
        verify_bundle(bundle_path(previous_id),allow_degraded=True)
    else:
        from .backups import bundle_path
        verify_bundle(bundle_path(previous_id))
    progress('restoring_objects',previous_id)
    from .backups import bundle_path
    print('Estado anterior preservado em',bundle_path(previous_id).name,flush=True)
    with tempfile.TemporaryDirectory(prefix='pige-restore-') as temp,zipfile.ZipFile(path) as archive:
        dump=Path(temp)/'database.dump'
        with archive.open('database.dump') as source,dump.open('xb') as destination:shutil.copyfileobj(source,destination)
        # Arquivos são repostos antes do commit do banco. Não apaga objetos
        # alheios ou órfãos; o banco restaurado define o acervo visível.
        for item in manifest['objects']:
            data=archive.read(item['path'])
            if hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Integridade divergente durante restauração.')
            if item['backend']=='local':
                destination=_local_path(item['key']);destination.parent.mkdir(parents=True,exist_ok=True)
                temporary=destination.with_suffix('.restore-part');temporary.write_bytes(data);temporary.chmod(0o600);temporary.replace(destination)
            else:_s3_client().put_object(Bucket=item['bucket'],Key=item['key'],Body=data,ContentType=item.get('mime_type','application/octet-stream'),Metadata={'pige360-managed':'true'})
        roots=settings().signature_trust_roots_dir
        if manifest['trust_roots'] and roots is None:raise ValueError('Configure o diretório das raízes de confiança.')
        if roots:
            roots.mkdir(parents=True,exist_ok=True)
            if roots.is_symlink():raise ValueError('Diretório de confiança não pode ser link.')
            for old in roots.iterdir():
                if old.is_file() and old.suffix.lower() in {'.pem','.crt','.cer','.der'}:old.unlink()
            for item in manifest['trust_roots']:
                destination=roots/Path(item['path']).name
                destination.write_bytes(archive.read(item['path']));destination.chmod(0o600)
        progress('restoring_database',previous_id)
        subprocess.run(['pg_restore','--clean','--if-exists','--no-owner','--single-transaction',
            '--dbname='+pg_environment()['PGDATABASE'],str(dump)],env=pg_environment(),
            check=True,timeout=600,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    progress('revoking_sessions_and_reconciling_jobs',previous_id)
    with engine.begin() as connection:
        connection.execute(text("UPDATE integration_jobs SET status='uncertain',error_code='RESTORE_REQUIRES_RECONCILIATION',lease_until=NULL WHERE status IN ('pending','retry','processing')"))
        connection.execute(text("UPDATE connect_message_jobs SET status='uncertain',error_code='RESTORE_REQUIRES_RECONCILIATION',lease_until=NULL WHERE status IN ('pending','retry','processing')"))
        from sqlalchemy import inspect
        if inspect(connection).has_table('crm_bridge_external_requests'):
            connection.execute(text("UPDATE crm_bridge_external_requests SET status='uncertain',error_code='RESTORE_REQUIRES_RECONCILIATION' WHERE status IN ('queued','sending')"))
        connection.execute(text("UPDATE crm_bridge_requests SET status='failed',error_code='RESTORE_REQUIRES_RECONCILIATION' WHERE status IN ('queued','retry')"))
        connection.execute(text("UPDATE bank_charges SET status='uncertain' WHERE status='queued'"))
        connection.execute(text("UPDATE backup_runs SET status='failed',stage='failed',error_code='RESTORE_INTERRUPTED' WHERE status IN ('queued','processing')"))
        connection.execute(text("UPDATE ocr_jobs SET status='failed',error_code='RESTORE_REQUIRES_RESCAN',lease_until=NULL,lease_token='' WHERE status IN ('queued','processing')"))
        from sqlalchemy import inspect
        if inspect(connection).has_table('user_invitations'):
            connection.execute(text('UPDATE user_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE used_at IS NULL AND revoked_at IS NULL'))
        connection.execute(text("UPDATE backup_runs SET remote_status='uncertain' WHERE remote_status IN ('queued','sending')"))
        connection.execute(text('UPDATE auth_sessions SET revoked=true'))
        connection.execute(text('UPDATE portal_sessions SET revoked=true'))
    print('Banco e arquivos restaurados. Valide saúde, autenticação e documentos antes de liberar a instalação.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package',type=Path)
    parser.add_argument('--confirm-offline-restore',action='store_true')
    args=parser.parse_args()
    if not args.confirm_offline_restore:parser.error('Pare app/workers e informe --confirm-offline-restore. O banco será substituído após backup prévio.')
    restore(args.package)
