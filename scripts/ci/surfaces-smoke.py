"""Prova Docker de conteúdo e restore pela UI do deployer, só em stack CI descartável."""
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import time
import httpx
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[2]
address,stack,envfile,project=sys.argv[1:]
stack=Path(stack).resolve()
if not project.startswith('pige360-ci-') or not (stack/'.pige360-smoke-owned').is_file():raise SystemExit('Exige stack descartável pertencente ao CI.')
command=['docker','compose','--env-file',envfile,'-p',project,'-f',str(stack/'compose.yaml')]
def surface_url(service):
    address=subprocess.check_output([*command,'port',service,'8080'],text=True).strip()
    if not re.fullmatch(r'127\.0\.0\.1:[1-9][0-9]*',address):raise AssertionError(f'Publicação loopback inválida para {service}: {address}')
    return 'http://'+address
website_url,portal_url=surface_url('website'),surface_url('portal')
portal_headers={'Host':'localhost'}
url='http://'+address;password='Synthetic-Backup-2026!'
client=httpx.Client(base_url=url,trust_env=False,timeout=30)
setup=client.get('/api/v1/setup/status');assert setup.is_success and setup.json()['configured'],setup.text
login=client.post('/api/v1/auth/login',json={'email':'backup@example.com','password':password});assert login.is_success,login.text
headers={'Authorization':'Bearer '+login.json()['access_token']}
school=client.get('/api/v1/schools',headers=headers).json()[0];base='/api/v1/schools/'+school['id']
response=client.put(base+'/website',headers=headers,json={'enabled':True,'theme':'campus','headline':'Site integrado no Docker','introduction':'Somente conteúdo público sintético.','public_url':'https://school.example.test','portal_url':'https://portal.example.test'})
assert response.is_success,response.text
response=client.post(base+'/community-posts',headers=headers,json={'title':'Publicação Docker visível','content':'Conteúdo aprovado via API interna.','audience':'public','status':'published'});assert response.is_success,response.text
response=client.post(base+'/community-posts',headers=headers,json={'title':'Publicação privada nunca visível','content':'Conteúdo privado para os responsáveis autorizados.','audience':'guardians','status':'published'});assert response.is_success,response.text
for path in ('/health/live','/health/ready'):
    response=httpx.get(website_url+path,trust_env=False)
    assert response.status_code==200,(path,response.status_code,response.text)
site=httpx.get(website_url+'/',headers={'Host':'school.example.test'},trust_env=False);assert site.is_success,site.text
assert 'Site integrado no Docker' in site.text and 'Publicação Docker visível' in site.text and 'Publicação privada nunca visível' not in site.text
unknown=httpx.get(website_url+'/',headers={'Host':'unknown.example.test'},trust_env=False)
assert unknown.status_code==404 and 'Site em preparação' in unknown.text and 'Site integrado no Docker' not in unknown.text
assert httpx.get(portal_url+'/',headers=portal_headers,trust_env=False).status_code==200
assert httpx.get(portal_url+'/api/v1/backups',headers=portal_headers,trust_env=False).status_code==404
print('PASS: site e portal em imagens próprias, conteúdo interno autenticado e bloqueio administrativo',flush=True)

# Adota a composição CI existente, com caminhos absolutos e o MESMO nome de projeto.
# Isto demonstra a atualização de uma instalação; não inicia outra stack.
checkout=stack/'restore-checkout';deployment=checkout/'deploy/docker';deployment.mkdir(parents=True)
(checkout/'scripts').mkdir();shutil.copy2(ROOT/'scripts/configure.py',checkout/'scripts/configure.py')
config=json.loads(subprocess.check_output([*command,'--profile','website','--profile','portal','config','--format','json'],text=True))
config['name']=project
(deployment/'compose.yaml').write_text(json.dumps(config))
content=Path(envfile).read_text()+'\nCOMPOSE_PROJECT_NAME='+project+'\nCOMPOSE_PROFILES=website,portal\n'
(deployment/'.env.ci').write_text(content);(deployment/'.env.ci').chmod(0o600)
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
process=subprocess.Popen([sys.executable,str(ROOT/'scripts/deployer.py'),'--root',str(checkout),'--port',str(port)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
out=ROOT/'ci-evidence/browser/restore';out.mkdir(parents=True,exist_ok=True)
try:
    line=process.stdout.readline();secret=re.search(r'Senha temporária:\s*(\S+)',line).group(1)
    deployer='http://127.0.0.1:'+str(port)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1280,'height':1000})
        page.goto(url);expect(page.get_by_role('heading',name='Acesse sua instituição',exact=True)).to_be_visible();page.get_by_label('E-mail',exact=True).fill('backup@example.com');page.get_by_label('Senha',exact=True).fill(password);page.get_by_role('button',name='Entrar na aplicação').click()
        expect(page.locator('.app-root')).to_have_attribute('aria-busy','false');page.get_by_label('Selecionar escola',exact=True).select_option(school['id']);expect(page.locator('.app-root')).to_have_attribute('aria-busy','false')
        page.locator('aside').get_by_role('button',name='Administração do sistema',exact=True).click();page.locator('aside a[href="#/legacy-import"]').click();workspace=page.locator('.import-workspace');expect(workspace).to_be_visible()
        workspace.get_by_role('button',name='Preparar restauração',exact=True).first.click()
        expect(workspace.get_by_text('Confirmação no deployer:',exact=False)).to_be_visible()
        plans=client.get('/api/v1/backups/restore/plans',headers=headers).json();plan=plans[0]
        page.screenshot(path=str(out/'restore-prepared.png'),full_page=True)
        control=browser.new_page();control.goto(deployer);control.get_by_label('Senha local').fill(secret);control.get_by_role('button',name='Entrar',exact=True).click()
        control.get_by_role('button',name='Consultar planos de restauração',exact=True).click()
        control.get_by_label('ID do plano preparado no gestor').fill(plan['id'])
        control.get_by_label('Confirmação exibida no plano').fill('CANCELADO')
        control.get_by_role('button',name='Confirmar restauração destrutiva').click();expect(control.get_by_text('Digite exatamente a confirmação',exact=False)).to_be_visible()
        assert client.get('/health/ready').status_code==200
        # Destroy one object and corrupt another immediately before the UI restore.
        # The safety snapshot must preserve this degraded state, not require a
        # pristine copy prepared before the disaster. Only our owned CI stack.
        damage_code="from app.db import SessionLocal;from app import models as m;from app.storage import delete_file,_s3_client,_local_path;db=SessionLocal();rows=db.query(m.FileRecord).all();assert len(rows)>=2;local=next(f for f in rows if f.storage_backend=='local');remote=next(f for f in rows if f.storage_backend=='s3');delete_file(local);_s3_client().put_object(Bucket=remote.bucket_name,Key=remote.storage_key,Body=b'corrupt synthetic bytes');print('PASS: local missing and MinIO corrupt before UI restore')"
        subprocess.run([*command,'exec','-T','app','python','-c',damage_code],check=True)
        control.get_by_label('ID do plano preparado no gestor').fill(plan['id']);control.get_by_label('Confirmação exibida no plano').fill(plan['confirmation']);control.get_by_role('button',name='Confirmar restauração destrutiva').click()
        expect(control.get_by_text('Restauração iniciada.',exact=False)).to_be_visible()
        for _ in range(180):
            control.get_by_role('button',name='Acompanhar restauração',exact=True).click()
            body=control.locator('body').inner_text()
            if '"status": "completed"' in body:break
            if '"status": "failed"' in body or '"status": "interrupted"' in body:raise AssertionError('Restauração visual falhou: '+body)
            time.sleep(1)
        else:raise AssertionError('Restauração visual não terminou')
        control.screenshot(path=str(out/'restore-completed.png'),full_page=True)
        browser.close()
    assert client.get('/health/ready').status_code==200
    # Sessão anterior foi revogada: reautenticar e provar banco/documentos.
    assert client.get('/api/v1/auth/me',headers=headers).status_code==401
    auth=client.post('/api/v1/auth/login',json={'email':'backup@example.com','password':password}).json();headers={'Authorization':'Bearer '+auth['access_token']}
    verified=client.get('/api/v1/backups/restore/plans',headers=headers).json()[0]
    assert verified['status']=='completed' and verified['previous_backup_id']
    protection_code="from app.backups import bundle_path,verify_bundle;manifest=verify_bundle(bundle_path("+repr(verified['previous_backup_id'])+"),allow_degraded=True);damage=manifest['protection']['damage'];assert {x['state'] for x in damage}=={'missing','corrupt'};print('PASS: degraded pre-restore state preserved with auditable damage manifest')"
    subprocess.run([*command,'exec','-T','app','python','-c',protection_code],check=True)
    subprocess.run([*command,'exec','-T','app','python','-c',"from app.db import SessionLocal;from app import models as m;from app.storage import read_bytes;import hashlib;db=SessionLocal();rows=db.query(m.FileRecord).all();assert len(rows)>=2;assert all(hashlib.sha256(read_bytes(f)).hexdigest()==f.sha256 for f in rows);print('PASS: banco e objetos locais/MinIO íntegros após restore UI')"],check=True)
    (ROOT/'ci-evidence/surfaces-restore.json').write_text(json.dumps({'same_compose_project':project,'site_internal_content':True,'private_content_blocked':True,'portal_image':True,'restore_ui':True,'cancelled_confirmation_no_effect':True,'sessions_revoked':True,'database_and_objects_verified':True,'previous_backup':True},indent=2)+'\n')
    print('PASS: restauração pela UI com confirmação, cópia prévia, serviços, sessões e arquivos verificados',flush=True)
finally:
    process.terminate()
    try:process.wait(timeout=10)
    except subprocess.TimeoutExpired:process.kill()
