"""PIGE ↔ CRM v1 wire contract. No I/O, credentials persisted, or financial mutations."""
import hashlib
import hmac
import json
import re
from datetime import date
from uuid import UUID

REQUEST_PATH = '/pige_bridge/api/v1/requests'
MAX_BODY = 16 * 1024
MAX_AMOUNT = 999999999999
SAFE_ID = re.compile(r'[A-Za-z0-9_.:-]{1,128}\Z')


class ContractError(ValueError):
    pass


def canonical_uuid(value):
    if not isinstance(value, str):
        raise ContractError('INVALID_UUID')
    try:
        if str(UUID(value)) != value or not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}', value):
            raise ValueError()
    except ValueError:
        raise ContractError('INVALID_UUID') from None
    return value


def exact(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise ContractError('INVALID_FIELDS')


def safe_id(value):
    if not isinstance(value, str) or not SAFE_ID.fullmatch(value):
        raise ContractError('INVALID_IDENTIFIER')
    return value


def validate_scope(scope):
    exact(scope, ('school_id', 'issuer_id', 'account_id', 'environment'))
    canonical_uuid(scope['school_id'])
    if not isinstance(scope['issuer_id'], str) or not re.fullmatch(r'[1-9][0-9]{0,18}', scope['issuer_id']):
        raise ContractError('INVALID_ISSUER')
    safe_id(scope['account_id'])
    if scope['environment'] not in ('sandbox', 'production'):
        raise ContractError('INVALID_ENVIRONMENT')


def decode(raw):
    if not isinstance(raw, bytes) or len(raw) > MAX_BODY:
        raise ContractError('BODY_TOO_LARGE')
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ContractError('DUPLICATE_JSON_KEY')
            result[key] = value
        return result
    try:
        return json.loads(raw.decode('utf-8'), object_pairs_hook=unique,
                          parse_constant=lambda _: (_ for _ in ()).throw(ContractError('INVALID_JSON')))
    except (ValueError, UnicodeDecodeError, RecursionError):
        raise ContractError('INVALID_JSON') from None


def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')


def validate_envelope(value, event_type):
    exact(value, ('schema_version', 'event_id', 'event_type', 'scope', 'data'))
    if type(value['schema_version']) is not int or value['schema_version'] != 1 or value['event_type'] != event_type:
        raise ContractError('INVALID_VERSION_OR_EVENT')
    canonical_uuid(value['event_id'])
    validate_scope(value['scope'])
    data = value['data']
    fields = ('charge_id', 'amount_cents', 'currency', 'due_date', 'description') if event_type == 'charge.requested' else ('charge_id', 'request_id', 'status', 'amount_cents', 'currency')
    exact(data, fields)
    canonical_uuid(data['charge_id'])
    if type(data['amount_cents']) is not int or not 1 <= data['amount_cents'] <= MAX_AMOUNT or data['currency'] != 'BRL':
        raise ContractError('INVALID_AMOUNT_OR_CURRENCY')
    if event_type == 'charge.requested':
        try:
            if not isinstance(data['due_date'], str) or date.fromisoformat(data['due_date']).isoformat() != data['due_date']:
                raise ValueError()
        except ValueError:
            raise ContractError('INVALID_DATE') from None
        if not isinstance(data['description'], str) or not 1 <= len(data['description']) <= 500 or not data['description'].strip() or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', data['description']):
            raise ContractError('INVALID_DESCRIPTION')
    else:
        safe_id(data['request_id'])
        if data['status'] not in ('blocked', 'pending', 'confirmed', 'received', 'cancelled'):
            raise ContractError('INVALID_STATUS')
    return value


def signature(secret, timestamp, event_id, path, raw):
    prefix = f'{timestamp}\n{event_id}\nPOST\n{path}\n'.encode('ascii')
    return 'sha256=' + hmac.new(secret.encode('utf-8'), prefix + raw, hashlib.sha256).hexdigest()


def verify_signature(secret, timestamp, event_id, path, raw, current_time):
    canonical_uuid(event_id)
    if not isinstance(timestamp, str) or not re.fullmatch(r'[1-9][0-9]{0,10}', timestamp) or abs(current_time - int(timestamp)) > 300:
        raise ContractError('STALE_TIMESTAMP')
    return signature(secret, timestamp, event_id, path, raw)


def validate_receipt(value, event_id):
    exact(value, ('schema_version', 'event_id', 'request_id', 'status', 'reason', 'capabilities'))
    if type(value['schema_version']) is not int or value['schema_version'] != 1 or value['event_id'] != event_id:
        raise ContractError('RECEIPT_EVENT_MISMATCH')
    safe_id(value['request_id'])
    if value['status'] != 'blocked' or value['reason'] != 'issuer_finance_not_isolated' or not isinstance(value['capabilities'], dict) or set(value['capabilities']) != {'issue_charge'} or value['capabilities'].get('issue_charge') is not False:
        raise ContractError('UNSUPPORTED_RECEIPT_CAPABILITY')
    return value
