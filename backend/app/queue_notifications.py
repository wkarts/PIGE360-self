"""Optional wake signals; PostgreSQL remains the sole source of job state.

Signals are sent only after a successful commit. If a broker is unavailable,
the existing database polling continues without losing or repeating jobs.
"""
import logging
import time
from sqlalchemy import event
from sqlalchemy.orm import Session

LOG = logging.getLogger('pige360.queue')
_installed = False


def _publish(kind):
    from .config import settings
    cfg = settings()
    if kind == 'ocr' and cfg.redis_url:
        import redis
        client = redis.Redis.from_url(cfg.redis_url, socket_connect_timeout=0.3, socket_timeout=0.5)
        try:
            with client.pipeline() as pipe:
                pipe.lpush('pige360:ocr-wake', '1')
                pipe.ltrim('pige360:ocr-wake', 0, 9999)
                pipe.expire('pige360:ocr-wake', 120)
                pipe.execute()
        finally:
            client.close()
    if kind == 'integration' and cfg.rabbitmq_url:
        import pika
        params = pika.URLParameters(cfg.rabbitmq_url)
        params.socket_timeout = 0.5
        params.stack_timeout = 0.5
        params.connection_attempts = 1
        params.retry_delay = 0
        params.blocked_connection_timeout = 0.5
        connection = pika.BlockingConnection(params)
        try:
            channel = connection.channel()
            channel.queue_declare(queue='pige360-integration-wake', durable=True,
                                  arguments={'x-message-ttl': 60000, 'x-max-length': 10000})
            channel.basic_publish(exchange='', routing_key='pige360-integration-wake', body=b'1')
        finally:
            connection.close()


def install():
    global _installed
    if _installed:
        return
    _installed = True

    @event.listens_for(Session, 'after_flush')
    def remember_jobs(session, _context):
        from .models import IntegrationJob, ConnectMessageJob
        from .assisted_models import OcrJob
        for item in session.new:
            if isinstance(item, (IntegrationJob, ConnectMessageJob)):
                session.info['wake_integration'] = True
            elif isinstance(item, OcrJob):
                session.info['wake_ocr'] = True

    @event.listens_for(Session, 'after_rollback')
    def discard_jobs(session):
        session.info.pop('wake_integration', None)
        session.info.pop('wake_ocr', None)

    @event.listens_for(Session, 'after_commit')
    def notify_jobs(session):
        for kind in ('integration', 'ocr'):
            if session.info.pop('wake_' + kind, False):
                try:
                    _publish(kind)
                except Exception:
                    LOG.warning('wake signal unavailable: %s', kind)


class WorkAvailable(Exception):
    pass


def wait_for_integration(seconds):
    from .config import settings
    url = settings().rabbitmq_url
    if not url:
        time.sleep(seconds)
        return
    connection = None
    try:
        import pika
        params = pika.URLParameters(url)
        params.socket_timeout = 0.5
        params.stack_timeout = 0.5
        params.connection_attempts = 1
        params.retry_delay = 0
        params.blocked_connection_timeout = 0.5
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        channel.queue_declare(queue='pige360-integration-wake', durable=True,
                              arguments={'x-message-ttl': 60000, 'x-max-length': 10000})
        def wake(*_):
            raise WorkAvailable()
        channel.basic_consume(queue='pige360-integration-wake', auto_ack=True,
                              on_message_callback=wake)
        connection.process_data_events(time_limit=seconds)
    except WorkAvailable:
        pass
    except Exception:
        time.sleep(seconds)
    finally:
        if connection and connection.is_open:
            try:
                connection.close()
            except Exception:
                LOG.warning('wake signal connection close failed')


def wait_for_ocr(seconds=2):
    from .config import settings
    url = settings().redis_url
    if not url:
        time.sleep(seconds)
        return
    try:
        import redis
        client = redis.Redis.from_url(url, socket_connect_timeout=0.3, socket_timeout=seconds + 1)
        try:
            client.brpop('pige360:ocr-wake', timeout=seconds)
        finally:
            client.close()
    except Exception:
        time.sleep(seconds)
