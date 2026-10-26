#!/usr/bin/env python3
"""Real HTTP/browser regression; synthetic accounts only, no external delivery."""
import base64, io, json, os, socket, subprocess, sys, tempfile, time
from pathlib import Path
from datetime import timedelta
ROOT=Path(__file__).resolve().parents[1]
TEMP=Path(tempfile.mkdtemp(prefix='pige-online-verification-'))
OUT=Path(os.environ.get('PIGE_E2E_EVIDENCE_DIR',str(TEMP/'evidence')));OUT.mkdir(parents=True,exist_ok=True)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
URL=f'http://127.0.0.1:{port}'
os.environ.update({'DATABASE_URL':'sqlite:///'+str(TEMP/'db.sqlite'),'ALLOW_SQLITE':'true','APP_ENV':'test','APP_URL':URL,'ALLOWED_HOSTS':'127.0.0.1,localhost','APP_SECRET_KEY':'synthetic-online-verification-secret-0123456789','SETUP_TOKEN':'synthetic-setup-token-0123456789','STORAGE_PATH':str(TEMP/'files'),'FRONTEND_PATH':str(ROOT/'frontend/dist'),'COOKIE_SECURE':'false','INTEGRATION_ENCRYPTION_KEY':base64.urlsafe_b64encode(b'0'*32).decode(),'CONNECT_API_BASE_URL':'https://connect.example.test','CONNECT_API_KEY':'synthetic-connect-key','CONNECT_ALLOWED_HOSTS':'connect.example.test'})
sys.path.insert(0,str(ROOT/'backend'))
from app.config import settings
from app.db import SessionLocal,now
from app import models as m
from app.integration_core import unseal
from sqlalchemy import select
from app.portal_access import today
import httpx
from PIL import Image
from playwright.sync_api import sync_playwright,expect
password='Synthetic-Only-Password-2026!'
env={**os.environ,'PYTHONPATH':str(ROOT/'backend')}
subprocess.run([sys.executable,'-m','alembic','upgrade','head'],cwd=ROOT/'backend',env=env,check=True,stdout=subprocess.DEVNULL)
log=(OUT/'server.log').open('w');proc=subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(port)],cwd=ROOT/'backend',env=env,stdout=log,stderr=log)
try:
 client=httpx.Client(base_url=URL,timeout=30,trust_env=False)
 for _ in range(100):
  try:
   if client.get('/health/ready').status_code==200:break
  except httpx.HTTPError:pass
  time.sleep(.1)
 r=client.post('/api/v1/setup',headers={'X-Setup-Token':env['SETUP_TOKEN']},json={'admin_name':'Secretaria Teste','admin_email':'secretaria@example.com','admin_password':password,'company_name':'Mantenedora Exemplo','school_name':'Escola Exemplo','academic_year':2027});assert r.status_code==201,r.text
 token=client.post('/api/v1/auth/login',json={'email':'secretaria@example.com','password':password}).json()['access_token'];headers={'Authorization':'Bearer '+token}
 school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
 def post(path,data):
  r=client.post(base+path,headers=headers,json=data);assert r.is_success,(path,r.text);return r.json()
 unit=post('/units',{'name':'Unidade Centro'})
 year=post('/academic-years',{'name':'2028','starts_on':'2028-01-01','ends_on':'2028-12-31'})
 grade=post('/grades',{'name':'Etapa Exemplo'});shift=post('/shifts',{'name':'Matutino'})
 group=post('/class-groups',{'name':'Turma Exemplo','unit_id':unit['id'],'academic_year_id':year['id'],'grade_id':grade['id'],'shift_id':shift['id'],'capacity':10})
 campaign=post('/admission-campaigns',{'slug':'matriculas-e2e','title':'Matrículas Exemplo','academic_year_id':year['id'],'class_group_ids':[group['id']],'opens_on':str(today()-timedelta(days=1)),'closes_on':str(today()+timedelta(days=30)),'active':True,'require_verified_contact':True,'privacy_notice':'Dados sintéticos usados somente para verificar o processo de matrícula da escola.'})
 r=client.post('/api/v1/portal/register',headers={'X-CSRF-Protection':'1'},json={'campaign_slug':campaign['slug'],'name':'Responsável Exemplo','email':'responsavel@example.com','password':password,'phone':'75999990000','accept_privacy':True,'terms_version':'1'});assert r.status_code==201,r.text
 with SessionLocal() as db:
  instance=m.ConnectInstance(company_id=school['company_id'],school_id=school['id'],name='shared-existing-hub',source='adopted',status='open',primary=True)
  db.add(instance);db.flush();db.add(m.ConnectSchoolBinding(school_id=school['id'],instance_id=instance.id,updated_at=now()));db.commit()
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(URL+'/online.html?campaign='+campaign['slug']);page.get_by_label('E-mail',exact=True).fill('responsavel@example.com');page.get_by_label('Senha',exact=True).fill(password);page.get_by_role('button',name='Entrar no portal',exact=True).click()
  expect(page.get_by_role('button',name='Enviar código por WhatsApp',exact=True)).to_be_enabled()
  page.get_by_role('button',name='Nova pré-matrícula',exact=True).click()
  page.get_by_label('Nome completo do aluno *',exact=True).fill('Aluno Exemplo');page.get_by_label('Data de nascimento *',exact=True).fill('2017-03-10');page.get_by_role('button',name='Continuar',exact=True).click()
  page.get_by_label('Turma pretendida *').select_option(group['id']);page.get_by_role('button',name='Continuar',exact=True).click();page.get_by_role('button',name='Salvar e enviar documentos',exact=True).click()
  expect(page.get_by_role('button',name='Enviar documento manualmente',exact=True)).to_be_visible()
  image=io.BytesIO();Image.new('RGB',(30,30)).save(image,'PNG')
  for name in ('certidao.png','comprovante.png'):
   page.get_by_label('Arquivo',exact=True).set_input_files({'name':name,'mimeType':'image/png','buffer':image.getvalue()})
   page.get_by_role('button',name='Enviar documento manualmente',exact=True).click();expect(page.get_by_text(name,exact=True)).to_be_visible()
  page.get_by_role('button',name='Enviar código por WhatsApp',exact=True).click();expect(page.get_by_text('Código solicitado por WhatsApp. O código vale por 10 minutos.',exact=True)).to_be_visible()
  with SessionLocal() as db:
   job=db.scalar(select(m.ConnectMessageJob));payload=unseal(job.encrypted_payload)
   import re
   code=re.search(r'\b\d{6}\b',payload['text'])[0]
  page.get_by_label('Código recebido',exact=True).fill(code);page.get_by_role('button',name='Confirmar contato',exact=True).click()
  expect(page.get_by_role('button',name='Enviar documento manualmente',exact=True)).to_be_visible()
  for label in page.get_by_role('checkbox').all():
   if label.is_visible():label.check()
  page.get_by_role('button',name='Enviar pré-matrícula',exact=True).click()
  expect(page.get_by_text('Inscrição enviada. Acompanhe a análise nesta página.',exact=True)).to_be_visible()
  responsive={}
  for width in (320,390,768,1440):
   page.set_viewport_size({'width':width,'height':900});page.screenshot(path=str(OUT/f'online-{width}.png'),full_page=True)
   responsive[str(width)]=page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert responsive[str(width)]
  assert not errors,errors
  data=client.get('/api/v1/portal/admissions').json()['items'][0];assert data['status']=='submitted' and len(data['attachments'])==2
  first=post('/document-templates',{'name':'Contrato inicial da matrícula','kind':'educational_contract','body':'Contrato inicial de {{aluno.nome}} com {{escola.nome}}.','require_signature':True})
  other=post('/document-templates',{'name':'Contrato alternativo da matrícula','kind':'educational_contract','body':'Contrato alternativo de {{aluno.nome}} com {{escola.nome}}.','require_signature':True})
  admin=browser.new_page(viewport={'width':1440,'height':1000});admin.on('pageerror',lambda error:errors.append(str(error)))
  admin.goto(URL+'/');admin.get_by_label('E-mail',exact=True).fill('secretaria@example.com');admin.get_by_label('Senha',exact=True).fill(password);admin.get_by_role('button',name='Entrar na aplicação').click()
  expect(admin.get_by_role('heading',name='Visão geral',exact=True)).to_be_visible();admin.goto(URL+'/#/online')
  admin.locator('.x-record',has_text='Aluno Exemplo').click()
  admin.get_by_label('Justificativa / parecer para a próxima ação',exact=True).fill('Identidade e documentação sintéticas conferidas pela Direção.')
  admin.get_by_label('Conferi a identidade, os documentos e a legitimidade',exact=False).check();admin.get_by_role('button',name='Aprovar e criar matrícula em preparação',exact=True).click()
  choice=admin.get_by_role('form',name='Alterar contrato vinculado')
  expect(choice).to_be_visible()
  def choose_contract(ident,reason):
   choice.get_by_label('Contrato a vincular').select_option(ident)
   choice.get_by_label('Justificativa da alteração do contrato',exact=True).fill(reason)
   choice.get_by_role('button',name='Confirmar alteração do contrato',exact=True).click()
   expect(admin.get_by_text('Nova revisão vinculada.',exact=False)).to_be_visible()
  def issue_contract():
   admin.get_by_role('button',name='Preparar contrato',exact=True).click()
   admin.get_by_role('button',name='Emitir contrato da revisão aprovada',exact=True).click()
   expect(admin.get_by_text('Contrato emitido da revisão aprovada.',exact=False)).to_be_visible()
  choose_contract(first['id'],'Vincular contrato conferido para esta matrícula sintética.')
  issue_contract()
  a=client.get(base+'/admissions/'+data['id'],headers=headers).json();old_id=a['contract']['issued_document_id']
  old_pdf=client.get('/api/v1/portal/admissions/'+data['id']+'/issued/'+old_id).content
  response=client.patch(base+'/document-templates/'+first['id'],headers=headers,json={'version':first['version'],'body':'Contrato inicial atualizado de {{aluno.nome}} com {{escola.nome}}.'});assert response.is_success,response.text
  admin.get_by_role('button',name='Atualizar modelos disponíveis',exact=True).click()
  expect(admin.get_by_text('Modelos e revisões atualizados.',exact=False)).to_be_visible()
  choose_contract(first['id'],'Atualizar o vínculo para a revisão mais recente do modelo.')
  a=client.get(base+'/admissions/'+data['id'],headers=headers).json();assert a['contract_template_version']==2 and not a['contract']['issued_document_id']
  issue_contract()
  choose_contract(other['id'],'Trocar explicitamente o modelo do contrato desta matrícula.')
  a=client.get(base+'/admissions/'+data['id'],headers=headers).json();assert a['contract_template_id']==other['id'] and a['contract_template_version']==1
  issue_contract()
  a=client.get(base+'/admissions/'+data['id'],headers=headers).json();assert len([d for d in a['issued_documents'] if d['kind']=='template'])==3
  assert client.get('/api/v1/portal/admissions/'+data['id']+'/issued/'+old_id).content==old_pdf
  assert client.get(base+'/admission-campaigns',headers=headers).json()[0]['contract_template_id'] is None
  admin.get_by_text('Histórico de contratos emitidos',exact=True).click()
  expect(admin.get_by_text('Histórico preservado',exact=False).first).to_be_visible()
  for width in (390,1440):
   admin.set_viewport_size({'width':width,'height':1000});assert admin.evaluate('document.documentElement.scrollWidth<=innerWidth')
   admin.screenshot(path=str(OUT/f'contract-choice-{width}.png'),full_page=True)
  assert not errors,errors
  result={'status':'passed','checks':['Instância preexistente compartilhada selecionada sem integração legada','Botão WhatsApp disponível no fluxo da matrícula','Dois documentos anexados manualmente sem catálogo','Confirmação de código mantém inscrição aberta','Inscrição concluída pela interface com contato confirmado','Contrato vinculado na análise sem alterar campanha','Revisão atualizada pela interface após recarregar modelos','Troca para outro modelo v1 preserva três vias e downloads históricos'],'responsive':responsive,'javascript_errors':errors,'browser':browser.version,'external_delivery':'Não executada; código sintético da fila usado na confirmação','database':'SQLite temporário'}
  (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));browser.close()
finally:
 proc.terminate();proc.wait(timeout=10);log.close()
