"""Prepara o volume uma vez e monitora seu acesso como o usuário da aplicação.

O nome Compose storage-init é preservado para upgrades. O processo permanece
ativo por exercer monitoramento real, não por um sleep/tail de aparência.
Não importa banco, credenciais ou serviços de integração.
"""
import argparse
import json
import logging
import os
from pathlib import Path
import signal
import stat
import tempfile
import threading
import time
import uuid

UID = GID = 10001
ROOT = Path('/data')
STORAGE = ROOT / 'documents'
STATE = Path('/tmp/pige360-storage-health.json')
INTERVAL = 30
MAX_AGE = 95
log = logging.getLogger('pige360.storage')


def prepare_storage(root: Path = ROOT, uid: int = UID, gid: int = GID) -> None:
    """Repara somente proprietários divergentes, sem seguir links simbólicos."""
    root.mkdir(parents=True, exist_ok=True)
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    root_fd = os.open(root, flags)
    try:
        try:
            os.mkdir('documents', mode=0o750, dir_fd=root_fd)
        except FileExistsError:
            pass
        # Recusa um link no caminho obrigatório antes de qualquer chown.
        documents_fd = os.open('documents', flags, dir_fd=root_fd)
        os.close(documents_fd)
        def fail_walk(error: OSError) -> None:
            raise error
        for _, _, files, directory_fd in os.fwalk(
                '.', dir_fd=root_fd, follow_symlinks=False, onerror=fail_walk):
            current = os.fstat(directory_fd)
            if (current.st_uid, current.st_gid) != (uid, gid):
                os.fchown(directory_fd, uid, gid)
            for name in files:
                info = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
                if stat.S_ISREG(info.st_mode) and (info.st_uid, info.st_gid) != (uid, gid):
                    os.chown(name, uid, gid, dir_fd=directory_fd, follow_symlinks=False)
    finally:
        os.close(root_fd)


def drop_privileges(uid: int = UID, gid: int = GID) -> None:
    """Root é utilizado apenas na preparação; monitor e probe usam UID 10001."""
    if os.geteuid() == 0:
        os.setgroups([])
        os.setgid(gid)
        os.setuid(uid)
    if os.geteuid() != uid or os.getegid() != gid:
        raise PermissionError('Monitor de armazenamento exige UID/GID 10001.')


def probe(storage: Path = STORAGE) -> None:
    """Verifica criar, gravar, sincronizar, ler e excluir um arquivo temporário."""
    directory_fd = os.open(storage, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    name = '.pige360-health-' + uuid.uuid4().hex
    created = False
    try:
        fd = os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                     0o600, dir_fd=directory_fd)
        created = True
        try:
            content = os.urandom(32)
            if os.write(fd, content) != len(content):
                raise OSError('Gravação incompleta no armazenamento.')
            os.fsync(fd)
            os.lseek(fd, 0, os.SEEK_SET)
            if os.read(fd, len(content)) != content:
                raise OSError('Leitura divergente no armazenamento.')
        finally:
            os.close(fd)
    finally:
        try:
            if created:
                os.unlink(name, dir_fd=directory_fd)
        finally:
            os.close(directory_fd)


def write_state(healthy: bool, error: str = '', path: Path = STATE) -> None:
    payload = dict(healthy=healthy, error=error, monotonic=time.monotonic(),
                   pid=os.getpid(), uid=os.geteuid(), gid=os.getegid())
    fd, temporary = tempfile.mkstemp(prefix='.pige360-storage-state-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(payload, handle)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def healthy(path: Path = STATE) -> bool:
    """Não aceita heartbeat ausente, falho, antigo, futuro ou processo morto."""
    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
        age = time.monotonic() - float(payload['monotonic'])
        if (payload['healthy'] is not True or not 0 <= age <= MAX_AGE
                or payload['uid'] != UID or payload['gid'] != GID):
            return False
        pid = int(payload['pid'])
        if pid < 1:
            return False
        os.kill(pid, 0)
        return True
    except (OSError, ValueError, KeyError, TypeError, OverflowError):
        return False


def monitor(stop: threading.Event, storage: Path = STORAGE,
            state: Path = STATE, interval: float = INTERVAL) -> None:
    previous = None
    while not stop.is_set():
        error = ''
        try:
            probe(storage)
        except OSError as exc:
            error = f'{type(exc).__name__}: {exc}'
        ok = not error
        write_state(ok, error, state)
        if (ok, error) != previous:
            if ok:
                log.info('Armazenamento acessível; monitor ativo como UID/GID %s:%s.', os.geteuid(), os.getegid())
            else:
                log.error('Armazenamento indisponível: %s', error)
            previous = (ok, error)
        stop.wait(interval)
    write_state(False, 'Monitor encerrado.', state)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--health', action='store_true')
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format='%(levelname)s %(message)s')
    try:
        if args.health:
            drop_privileges()
            return 0 if healthy() else 1
        stop = threading.Event()
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, lambda *_: stop.set())
        # Um restart não pode reutilizar um estado saudável da execução anterior.
        STATE.unlink(missing_ok=True)
        prepare_storage()
        drop_privileges()
        monitor(stop)
        return 0
    except (OSError, ValueError) as exc:
        log.error('Falha na inicialização do armazenamento: %s', exc)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
