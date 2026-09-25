"""Administração local: python -m app.cli reset-password usuario@escola.com.br."""
import argparse
import getpass
from sqlalchemy import select, update
from .db import SessionLocal
from .models import User, AuthSession, AuditEvent
from .security import hash_password

def main():
    parser=argparse.ArgumentParser(description='Administração local do PIGE360 Self')
    parser.add_argument('command',choices=['reset-password','reset-mfa'])
    parser.add_argument('email')
    parser.add_argument('--subject',choices=['user','portal'],default='user')
    parser.add_argument('--school-id',help='Obrigatório para identificar uma conta do portal.')
    parser.add_argument('--reason',help='Justificativa para recuperação local de 2FA.')
    args=parser.parse_args()
    if args.command=='reset-mfa':
        reset_mfa(parser,args)
        return
    password=getpass.getpass('Nova senha (mínimo 12 caracteres): ')
    if password!=getpass.getpass('Confirme a nova senha: '):parser.error('As senhas não coincidem.')
    if len(password)<12 or len(password)>128:parser.error('Use entre 12 e 128 caracteres.')
    with SessionLocal.begin() as db:
        user=db.scalar(select(User).where(User.email==args.email.strip().lower()))
        if not user:parser.error('Usuário não encontrado.')
        user.password_hash=hash_password(password)
        db.execute(update(AuthSession).where(AuthSession.user_id==user.id).values(revoked=True))
        db.add(AuditEvent(actor_id=None,action='auth.local_password_recovery',entity_type='User',entity_id=user.id,request_id='local-cli',details={'origin':'local_operator','affected_user_id':user.id}))
    print('Senha alterada. Todas as sessões anteriores foram revogadas.')

def reset_mfa(parser,args):
    from .models import PortalAccount
    from .mfa import reset_factor
    if not args.reason or not 12 <= len(args.reason.strip()) <= 500:
        parser.error('Informe --reason com justificativa de 12 a 500 caracteres.')
    if args.subject=='portal' and not args.school_id:
        parser.error('Informe --school-id para recuperação de uma conta do portal.')
    email=args.email.strip().lower()
    if input('Recuperação presencial após confirmar a identidade. Digite o e-mail para continuar: ').strip().lower()!=email:
        parser.error('Confirmação não corresponde à conta.')
    with SessionLocal.begin() as db:
        model=User if args.subject=='user' else PortalAccount
        query=select(model).where(model.email==email)
        if args.subject=='portal':query=query.where(model.school_id==args.school_id)
        account=db.scalar(query.with_for_update())
        if not account:parser.error('Conta não encontrada.')
        reset_factor(db,args.subject,account)
        db.add(AuditEvent(actor_id=None,action='mfa.local_recovery',entity_type=model.__name__,
            entity_id=account.id,request_id='local-cli',details={'origin':'local_operator','reason':args.reason.strip()}))
    print('Segundo fator recuperado. Sessões e códigos antigos revogados; a política da instituição foi preservada.')

if __name__=='__main__':main()
