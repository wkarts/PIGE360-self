"""Administração local: python -m app.cli reset-password usuario@escola.com.br."""
import argparse
import getpass
from sqlalchemy import select, update
from .db import SessionLocal
from .models import User, AuthSession, AuditEvent
from .security import hash_password

def main():
    parser=argparse.ArgumentParser(description='Administração local do PIGE360 Self')
    parser.add_argument('command',choices=['reset-password'])
    parser.add_argument('email')
    args=parser.parse_args()
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

if __name__=='__main__':main()
