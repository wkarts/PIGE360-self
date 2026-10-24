"""Version 2 local-invoice contract; no provider or academic settlement semantics."""
import re
from .crm_bridge_contract import ContractError, exact, validate_envelope, validate_scope, canonical_uuid

INVOICE_PATH = '/pige_bridge/api/v2/invoices'
INVOICE_STATUS_PATH = '/pige_bridge/api/v2/invoices/status'


def validate_invoice(event, *, status=False):
    exact(event, ('schema_version', 'event_id', 'event_type', 'scope', 'data'))
    if type(event['schema_version']) is not int or event['schema_version'] != 2 or event['event_type'] != ('invoice.status.requested' if status else 'invoice.requested'):
        raise ContractError('INVALID_INVOICE_VERSION')
    canonical_uuid(event['event_id']); validate_scope(event['scope'])
    if int(event['scope']['issuer_id']) > 2147483647: raise ContractError('INVALID_ISSUER')
    data = event['data']
    exact(data, ('charge_id',) if status else ('charge_id', 'client_id', 'amount_cents', 'currency', 'due_date', 'description'))
    canonical_uuid(data['charge_id'])
    if not status:
        if type(data['client_id']) is not int or not 1 <= data['client_id'] <= 2147483647:
            raise ContractError('INVALID_INVOICE_CLIENT')
        probe = dict(event, schema_version=1, event_type='charge.requested', data={k:v for k,v in data.items() if k != 'client_id'})
        validate_envelope(probe, 'charge.requested')
    return event


def validate_invoice_receipt(receipt, event):
    exact(receipt, ('schema_version','event_id','charge_id','request_id','scope','status','invoice_id','capabilities','payment_effect_applied','academic_effect_applied'))
    if type(receipt['schema_version']) is not int or receipt['schema_version'] != 2 or receipt['event_id'] != event['event_id'] or receipt['charge_id'] != event['data']['charge_id'] or receipt['scope'] != event['scope']:
        raise ContractError('INVOICE_RECEIPT_SCOPE_MISMATCH')
    if not isinstance(receipt['request_id'], str) or not re.fullmatch(r'req_[0-9a-f]{32}', receipt['request_id']):
        raise ContractError('INVALID_INVOICE_REQUEST_ID')
    if receipt['status'] == 'pending':
        if receipt['invoice_id'] is not None: raise ContractError('INVALID_INVOICE_RECEIPT')
    elif receipt['status'] == 'invoice_created':
        if type(receipt['invoice_id']) is not int or not 1 <= receipt['invoice_id'] <= 2147483647: raise ContractError('INVALID_INVOICE_RECEIPT')
    else: raise ContractError('INVALID_INVOICE_RECEIPT')
    exact(receipt['capabilities'], ('issue_charge',))
    if receipt['capabilities']['issue_charge'] is not False or receipt['payment_effect_applied'] is not False or receipt['academic_effect_applied'] is not False:
        raise ContractError('UNSUPPORTED_INVOICE_EFFECT')
    return receipt
