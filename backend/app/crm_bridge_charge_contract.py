"""Provider bridge v3; CRM payment receipts never imply PIGE academic/native settlement."""
import re
from .crm_bridge_contract import ContractError,exact,canonical_uuid,validate_scope
ROOT='/pige_bridge/api/v3/charges'
ACTIONS=('issue','status','sync','instruments','reconcile')
PATHS={a:ROOT+('' if a=='issue' else '/'+a) for a in ACTIONS}
BB_STATES=frozenset(('reserved','api_reserved','api_auth_failed','api_registered','api_query_observed','api_settlement_observed','api_cancel_requested','api_cancelled_confirmed','api_conflict_review','api_unknown','api_registration_rejected'))
BB_FIELDS={'payer_address':60,'payer_district':30,'payer_zip':8,'payer_city':30,'payer_state':2,'species':2,'acceptance':1}


def provider_for(data):
    return 'banco_brasil' if 'bb_title' in data else 'asaas'


def bb_title(value):
    exact(value,tuple(BB_FIELDS))
    for key,limit in BB_FIELDS.items():
        if not isinstance(value[key],str) or not value[key].strip() or len(value[key].encode())>limit or re.search(r'[\x00-\x1f\x7f]',value[key]):raise ContractError('INVALID_BB_TITLE')
    if not re.fullmatch(r'[0-9]{8}',value['payer_zip']) or value['payer_state'] not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') or value['species'] not in ('02','04','12','17','19') or value['acceptance'] not in ('A','N'):raise ContractError('INVALID_BB_TITLE')
    return value



def envelope(scope,event_id,action,data):
    if action not in ACTIONS:raise ContractError('INVALID_CHARGE_ACTION')
    canonical_uuid(event_id);validate_scope(scope)
    if int(scope['issuer_id'])>2147483647:raise ContractError('INVALID_ISSUER')
    fields={'issue':('charge_id','payer_id','billing_type'),'sync':('charge_id','recovery_id'),'reconcile':('charge_id','proof_id')}.get(action,('charge_id',))
    if action=='issue' and 'bb_title' in data:fields+=('bb_title',)
    exact(data,fields)
    if action=='issue' and 'bb_title' in data:
        bb_title(data['bb_title'])
        if data['billing_type']!='BOLETO':raise ContractError('INVALID_BB_BILLING_TYPE')
    canonical_uuid(data['charge_id'])
    for key in ('payer_id','proof_id'):
        if key in data and (type(data[key]) is not int or not 1<=data[key]<=2147483647):raise ContractError('INVALID_NATIVE_ID')
    if action=='issue' and data['billing_type'] not in ('PIX','BOLETO'):raise ContractError('INVALID_BILLING_TYPE')
    if action=='sync' and (not isinstance(data['recovery_id'],str) or not re.fullmatch(r'[A-Za-z0-9_-]{0,64}',data['recovery_id'])):raise ContractError('INVALID_RECOVERY_ID')
    return {'schema_version':3,'event_id':event_id,'event_type':'charge.'+action+'.requested','scope':scope,'data':data}


def validate_receipt(value,event,action):
    exact(value,('schema_version','event_id','charge_id','request_id','scope','provider','status','origin_id','remote_id','proof_id','reconciliation_status','payment_id','instrument','payment_effect_applied','academic_effect_applied'))
    if type(value['schema_version']) is not int or value['schema_version']!=3 or value['event_id']!=event['event_id'] or value['charge_id']!=event['data']['charge_id'] or value['scope']!=event['scope'] or value['provider'] not in ('asaas','banco_brasil'):raise ContractError('CHARGE_SCOPE_MISMATCH')
    if not isinstance(value['request_id'],str) or not re.fullmatch(r'req_[0-9a-f]{32}',value['request_id']):raise ContractError('INVALID_CHARGE_REQUEST_ID')
    if not isinstance(value['status'],str) or not re.fullmatch(r'[a-z_]{1,32}',value['status']):raise ContractError('INVALID_CHARGE_STATUS')
    if value['provider']=='banco_brasil' and value['status'] not in BB_STATES:raise ContractError('INVALID_BB_STATUS')
    if action=='issue' and value['provider']!=provider_for(event['data']):raise ContractError('CHARGE_PROVIDER_MISMATCH')
    for key in ('origin_id','proof_id','payment_id'):
        if value[key] is not None and (type(value[key]) is not int or not 1<=value[key]<=2147483647):raise ContractError('INVALID_NATIVE_ID')
    if value['remote_id'] is not None and (not isinstance(value['remote_id'],str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,64}',value['remote_id'])):raise ContractError('INVALID_REMOTE_ID')
    if value['origin_id'] is None and any(value[k] is not None for k in ('remote_id','proof_id','payment_id')):raise ContractError('INVALID_ORIGIN_RELATION')
    if value['reconciliation_status'] not in ('not_reconciled','reconciled') or (value['reconciliation_status']=='reconciled')!=(value['payment_id'] is not None):raise ContractError('INVALID_RECONCILIATION')
    if type(value['payment_effect_applied']) is not bool or (value['payment_effect_applied'] and (action!='reconcile' or value['payment_id'] is None)) or value['academic_effect_applied'] is not False:raise ContractError('INVALID_CHARGE_EFFECT')
    instrument=value['instrument']
    if instrument is not None:
        if action!='instruments' or not isinstance(instrument,dict):raise ContractError('INVALID_INSTRUMENT')
        if value['provider']=='banco_brasil' and instrument.get('billing_type')!='BOLETO':raise ContractError('INVALID_BB_INSTRUMENT')
        if instrument.get('billing_type')=='PIX':
            exact(instrument,('billing_type','payload','expiration_date'))
            if not isinstance(instrument['payload'],str) or not 20<=len(instrument['payload'].encode())<=2048 or re.search(r'[\x00-\x1f\x7f]',instrument['payload']) or not isinstance(instrument['expiration_date'],str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}',instrument['expiration_date']):raise ContractError('INVALID_INSTRUMENT')
        elif instrument.get('billing_type')=='BOLETO':
            exact(instrument,('billing_type','identification_field','bar_code','nosso_numero'))
            for key,pattern in [('identification_field',r'[0-9]{47}'),('bar_code',r'[0-9]{44}'),('nosso_numero',r'[A-Za-z0-9.-]{1,64}')]:
                if not isinstance(instrument[key],str) or not re.fullmatch(pattern,instrument[key]):raise ContractError('INVALID_INSTRUMENT')
        else:raise ContractError('INVALID_INSTRUMENT')
    return value
