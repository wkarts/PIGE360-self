"""Consumidor independente: uma leitura por processo, leases e retry limitados."""
from datetime import timedelta
import hashlib
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import sys
import tempfile
import time
from sqlalchemy import or_, select, update, delete
from .assisted_models import OcrJob, IntakeSettings, AssistedQuota, LookupCache
from .config import settings
from .db import SessionLocal, now
from .storage import read_bytes, delete_file
from .security import utc
from .ocr import seal

STATE=Path('/tmp/ocr-worker-health.json')
STOP=False


def heartbeat():
    temporary=STATE.with_suffix('.part')
    temporary.write_text(json.dumps({'pid':os.getpid(),'time':time.time()}))
    temporary.chmod(0o600);temporary.replace(STATE)


def healthy():
    try:
        data=json.loads(STATE.read_text());os.kill(int(data['pid']),0)
        return 0<=time.time()-float(data['time'])<settings().ocr_timeout_seconds+60
    except (OSError,ValueError,KeyError):return False


def claim(db):
    cfg=db.get(IntakeSettings,1)
    if cfg and not cfg.ocr_enabled:return None
    eligible=or_((OcrJob.status=='queued')&(OcrJob.available_at<=now()),
        (OcrJob.status=='processing')&(OcrJob.lease_until<now()))
    row=db.scalar(select(OcrJob).where(eligible,OcrJob.expires_at>now()).order_by(OcrJob.created_at).with_for_update(skip_locked=True).limit(1))
    if row is None:return None
    if row.attempts>=3:
        row.status='failed';row.error_code='retry_limit';row.lease_token='';row.lease_until=None;db.commit();return None
    token=secrets.token_hex(24)
    changed=db.execute(update(OcrJob).execution_options(synchronize_session=False).where(OcrJob.id==row.id,eligible).values(status='processing',
        attempts=OcrJob.attempts+1,lease_token=token,lease_until=now()+timedelta(seconds=settings().ocr_timeout_seconds+90))).rowcount
    db.commit()
    if not changed:return None
    return row.id,token


def cleanup(db):
    rows=db.scalars(select(OcrJob).where(OcrJob.expires_at<=now(),
        or_(OcrJob.lease_until.is_(None),OcrJob.lease_until<now())).limit(100)).all()
    for row in rows:
        try:delete_file(row)
        except Exception:continue  # tenta na próxima manutenção; não apaga a referência ainda
        db.delete(row)
    db.execute(delete(AssistedQuota).execution_options(synchronize_session=False).where(AssistedQuota.window_started<now()-timedelta(days=2)))
    db.execute(delete(LookupCache).execution_options(synchronize_session=False).where(LookupCache.expires_at<now()-timedelta(days=90),
        or_(LookupCache.lease_until.is_(None),LookupCache.lease_until<now())))
    db.commit()


def process_one():
    with SessionLocal() as db:
        job=claim(db)
        if job is None:return False
        ident,token=job;row=db.get(OcrJob,ident,populate_existing=True)
        values={'status':'failed','error_code':'processing_failed','encrypted_result':'','lease_token':'','lease_until':None}
        try:
            raw=read_bytes(row)
            if len(raw)!=row.size or hashlib.sha256(raw).hexdigest()!=row.sha256:
                raise ValueError('integrity_failed')
            with tempfile.TemporaryDirectory(prefix='school-ocr-') as tmp:
                source=Path(tmp)/'document';source.write_bytes(raw);source.chmod(0o600)
                proc=subprocess.Popen([sys.executable,'-m','app.ocr_engine',str(source),row.mime_type,row.purpose,tmp],
                    stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,start_new_session=True,
                    env={**os.environ,'OMP_THREAD_LIMIT':'1','OPENBLAS_NUM_THREADS':'1'})
                try:
                    stdout,_=proc.communicate(timeout=settings().ocr_timeout_seconds)
                except subprocess.TimeoutExpired:
                    os.killpg(proc.pid,signal.SIGKILL);proc.communicate();raise ValueError('processing_timeout')
                if len(stdout)>4_000_000:raise ValueError('result_too_large')
                result=json.loads(stdout)
                if proc.returncode:
                    known={'pdf_page_limit','image_too_large','image_too_small','active_pdf','FileNotFoundError','TimeoutExpired'}
                    code=result.get('error_code','processing_failed')
                    raise ValueError(code if code in known else 'invalid_or_unreadable_document')
                values.update(status='succeeded',error_code='',encrypted_result=seal(result))
        except (ValueError, json.JSONDecodeError) as exc:
            safe={'integrity_failed','processing_timeout','result_too_large','pdf_page_limit','image_too_large',
                'image_too_small','active_pdf','FileNotFoundError','TimeoutExpired','invalid_or_unreadable_document'}
            values['error_code']=str(exc) if str(exc) in safe else 'processing_failed'
        except Exception:
            values.update(status='queued',error_code='storage_unavailable',available_at=now()+timedelta(seconds=30))
        # Uma tentativa expirada/cancelada não pode sobrescrever outra execução.
        db.execute(update(OcrJob).execution_options(synchronize_session=False).where(OcrJob.id==ident,OcrJob.status=='processing',
            OcrJob.lease_token==token,OcrJob.expires_at>now()).values(**values));db.commit()
        return True


def stop(*_):
    global STOP
    STOP=True


def main():
    if '--health' in sys.argv:raise SystemExit(0 if healthy() else 1)
    signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
    # Falha explícita se a imagem não contém o motor; não anuncia worker saudável.
    import shutil
    if not all(shutil.which(c) for c in ('tesseract','pdftoppm')):raise SystemExit('OCR tools unavailable')
    languages=subprocess.check_output(['tesseract','--list-langs'],text=True)
    if 'por' not in languages:raise SystemExit('Portuguese OCR model unavailable')
    ticks=0
    try:
        while not STOP:
            heartbeat()
            if ticks%30==0:
                with SessionLocal() as db:cleanup(db)
            worked=process_one();ticks+=1;heartbeat()
            if not worked:time.sleep(2)
    finally:STATE.unlink(missing_ok=True)


if __name__=='__main__':main()
