"""Logs operacionais estruturados, sem corpos, tokens, dados pessoais ou SQL.

Arquivos locais por serviço no volume existente. Não lê stdout de outros containers
nem monta docker.sock. Uma falha no log nunca impede a operação principal.
"""
from __future__ import annotations
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import fcntl
import json
import os
import re
import secrets
import sys
import threading
import time

SERVICES = ('app', 'worker', 'worker-ocr')
MAX_BYTES = 4 * 1024 * 1024
BACKUPS = 4
RETENTION_DAYS = 7
LOCK = threading.Lock()
_LAST_BEAT = {}
LAST_WRITE_ERROR = False


def directory():
    from .config import settings
    return settings().storage_path.parent / 'logs'


def _word(value, limit=80):
    value = str(value)
    return value[:limit] if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_.:-]{0,119}', value) and not re.search(r'\d{5,}', value) else 'redacted'


def safe_event(event):
    """Allowlist também aplicada na leitura/exportação de arquivos."""
    result = {k:event[k] for k in ('timestamp','service','level','event') if k in event}
    if result.get('service') not in SERVICES: result['service'] = 'app'
    if result.get('level') not in ('INFO','WARNING','ERROR'): result['level'] = 'INFO'
    result['event'] = _word(result.get('event','unknown'))
    try: datetime.fromisoformat(str(result['timestamp']))
    except (ValueError, KeyError): result['timestamp'] = datetime.now(timezone.utc).isoformat()
    for key in ('request_id',):
        if re.fullmatch(r'[a-f0-9]{24}', str(event.get(key,''))): result[key] = event[key]
    for key in ('code','error_type','kind','state','method'):
        if event.get(key): result[key] = _word(event[key])
    for key in ('status','duration_ms','attempts'):
        if isinstance(event.get(key),(int,float)): result[key] = max(0,min(999999999,round(event[key],2)))
    # Only templates resolved by the router, never raw paths or query strings.
    route = event.get('route','')
    if isinstance(route,str) and re.fullmatch(r'[A-Za-z0-9_/{\}:.\-]{1,180}',route):
        result['route'] = route
    if re.fullmatch(r'[a-f0-9-]{36}',str(event.get('job_id',''))):result['job_id']=event['job_id']
    frames = []
    for item in event.get('frames',[])[:15]:
        if isinstance(item,dict):
            frames.append({'file':_word(item.get('file','unknown')),
                           'function':_word(item.get('function','unknown')),
                           'line':int(item.get('line',0)) if isinstance(item.get('line'),int) else 0})
    if frames: result['frames'] = frames
    return result


@contextmanager
def file_lock(root, service):
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    flags = os.O_CREAT | os.O_RDWR | getattr(os, 'O_NOFOLLOW', 0)
    fd = os.open(root / (service+'.lock'), flags, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        os.close(fd)


def emit(event, *, service='app', level='INFO', **data):
    global LAST_WRITE_ERROR
    if service not in SERVICES: return
    item = safe_event({'timestamp':datetime.now(timezone.utc).isoformat(),
                      'event':event,'service':service,'level':level,**data})
    raw = (json.dumps(item,ensure_ascii=False,separators=(',',':'))+'\n').encode()
    try:
        root = directory()
        with LOCK, file_lock(root,service):
            path = root / (service+'.jsonl')
            for old in root.glob(service+'.jsonl*'):
                if not old.is_symlink() and old.is_file() and old.stat().st_mtime < time.time()-RETENTION_DAYS*86400:
                    old.unlink()
            daily_rotation = False
            if path.exists() and not path.is_symlink():
                try:
                    with path.open('rb') as first:
                        stamp=json.loads(first.readline(4096)).get('timestamp','')
                    daily_rotation = time.time()-datetime.fromisoformat(stamp).timestamp()>=86400
                except (ValueError,TypeError):daily_rotation=True
            if path.exists() and (path.stat().st_size+len(raw)>MAX_BYTES or daily_rotation):
                for n in range(BACKUPS,0,-1):
                    old = root / (service+'.jsonl'+('' if n==1 else '.'+str(n-1)))
                    target = root / (service+'.jsonl.'+str(n))
                    if old.exists() and not old.is_symlink(): old.replace(target)
            fd = os.open(path, os.O_APPEND|os.O_CREAT|os.O_WRONLY|getattr(os,'O_NOFOLLOW',0),0o600)
            try: os.write(fd,raw)
            finally: os.close(fd)
        LAST_WRITE_ERROR = False
    except Exception:
        LAST_WRITE_ERROR = True
        # O fallback continua sanitizado e não escreve exceção da operação de log.
        print(json.dumps({'event':'diagnostics.log_write_failed','service':service}),file=sys.stderr)
    return item


def heartbeat(service, force=False):
    if service not in SERVICES:return
    if not force and time.monotonic()-_LAST_BEAT.get(service,0)<20:return
    try:
        root=directory()
        with LOCK, file_lock(root,service):
            for old in root.glob(service+'.jsonl*'):
                if not old.is_symlink() and old.is_file() and old.stat().st_mtime < time.time()-RETENTION_DAYS*86400:old.unlink()
            temp=root/(service+'.'+str(os.getpid())+'.part')
            fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_TRUNC|getattr(os,'O_NOFOLLOW',0),0o600)
            with os.fdopen(fd,'w') as f:json.dump({'service':service,'timestamp':datetime.now(timezone.utc).isoformat()},f)
            temp.replace(root/(service+'.state.json'))
        _LAST_BEAT[service]=time.monotonic()
    except Exception:pass


def recent_events(*, service='', level='', request_id='', since=None, until=None, limit=10000):
    rows=[]; scanned=0; damaged=0
    root=directory()
    for name in SERVICES if not service else (service,):
        if name not in SERVICES:continue
        for n in range(BACKUPS+1):
            path=root/(name+'.jsonl'+('.'+str(n) if n else ''))
            try:
                if path.is_symlink() or not path.exists():continue
                with path.open('rb') as f:
                    for raw in f.read(MAX_BYTES+4096).splitlines():
                        try:
                            item=safe_event(json.loads(raw));dt=datetime.fromisoformat(item['timestamp'])
                            if dt.tzinfo is None:dt=dt.replace(tzinfo=timezone.utc)
                        except (ValueError,TypeError,AttributeError):damaged+=1;continue
                        scanned+=1
                        if dt.timestamp()<time.time()-RETENTION_DAYS*86400:continue
                        if level and item['level']!=level:continue
                        if request_id and item.get('request_id')!=request_id:continue
                        if since and dt<since:continue
                        if until and dt>until:continue
                        rows.append(item)
                        # memória limitada mesmo sob alto volume
                        if len(rows)>limit*2:rows=sorted(rows,key=lambda r:r['timestamp'],reverse=True)[:limit+1]
            except OSError:damaged+=1
    rows.sort(key=lambda r:r['timestamp'],reverse=True)
    return {'items':rows[:limit],'truncated':len(rows)>limit,'scanned':scanned,'unreadable_records':damaged}


class RequestTelemetry:
    def __init__(self,app):self.app=app
    async def __call__(self,scope,receive,send):
        if scope['type']!='http':return await self.app(scope,receive,send)
        from starlette.concurrency import run_in_threadpool
        state=scope.setdefault('state',{})
        state['request_id']=secrets.token_hex(12)
        status=500;started=time.monotonic();error=None;frames=[]
        async def capture(message):
            nonlocal status
            if message['type']=='http.response.start':
                status=message['status']
                headers=[(k,v) for k,v in message.get('headers',[]) if k.lower()!=b'x-request-id']
                message['headers']=headers+[(b'x-request-id',state['request_id'].encode())]
            await send(message)
        try:
            await self.app(scope,receive,capture)
        except Exception as exc:
            error=type(exc).__name__;tb=exc.__traceback__
            while tb:
                code=tb.tb_frame.f_code
                frames.append({'file':Path(code.co_filename).name,'function':code.co_name,'line':tb.tb_lineno})
                tb=tb.tb_next
            raise
        finally:
            route=getattr(scope.get('route'),'path','/unmatched')
            if scope['path'].startswith('/api/') or status>=400:
                await run_in_threadpool(emit,'http.response',level='ERROR' if error or status>=500 else 'WARNING' if status>=400 else 'INFO',
                    request_id=state['request_id'],route=route,method=scope['method'],status=status,
                    duration_ms=(time.monotonic()-started)*1000,error_type=error,frames=frames[-15:])
            await run_in_threadpool(heartbeat,'app')
