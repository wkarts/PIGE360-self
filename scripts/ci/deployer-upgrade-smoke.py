"""Real Compose upgrade of a disposable custom installation, never production."""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import urllib.request

ROOT=Path(__file__).resolve().parents[2]


def main(image):
    if not re.fullmatch(r'ghcr\.io/wkarts/pige360-self-base-python(?::[A-Za-z0-9_.-]+|@sha256:[a-f0-9]{64})',image):
        raise ValueError('Use only the PIGE360 Python base image for the disposable fixture.')
    project='pige360-ci-upgrade-'+secrets.token_hex(8)
    unexpected='pige360-ci-unexpected-'+secrets.token_hex(8)
    root=Path(tempfile.mkdtemp(prefix='pige360-upgrade-smoke-'))
    marker=root/'.pige360-upgrade-owned';marker.write_text(project)
    deployment=root/'deploy/docker';deployment.mkdir(parents=True)
    (root/'scripts').mkdir()
    for name in ('configure.py','prepare-upgrade.py'):shutil.copy2(ROOT/'scripts'/name,root/'scripts'/name)
    shutil.copy2(ROOT/'VERSION',root/'VERSION')
    template=ROOT/'deploy/docker/.env.production.example'
    shutil.copy2(template,deployment/template.name)
    # Host-level Compose overrides must not point this fixture at another stack.
    for key in [*(line.split('=',1)[0] for line in template.read_text().splitlines() if '=' in line and not line.startswith('#')),
                'COMPOSE_FILE','COMPOSE_PROJECT_NAME','COMPOSE_PROFILES']:
        os.environ.pop(key,None)
    with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    values={'APP_IMAGE':image,'APP_URL':f'http://127.0.0.1:{port}','APP_BIND':'127.0.0.1','APP_PORT':str(port),
            'SMTP_HOST':'smtp.synthetic.invalid','SMTP_PASSWORD':secrets.token_urlsafe(32),
            'CONNECT_API_BASE_URL':'https://connect.synthetic.invalid','CONNECT_API_KEY':secrets.token_urlsafe(32),
            'TZ':'America/Bahia','INTEGRATION_ENCRYPTION_KEY':base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()}
    original=''.join(f'{key}={value}\n' for key,value in values.items())
    server="""import hashlib,json,os
from pathlib import Path
from http.server import HTTPServer,BaseHTTPRequestHandler
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        result={'marker':Path('/data/marker.txt').read_text(),'url':os.environ['APP_URL'],'timezone':os.environ['TZ'],
                'credentials':hashlib.sha256((os.environ['SMTP_PASSWORD']+'|'+os.environ['CONNECT_API_KEY']).encode()).hexdigest(),
                'added':os.environ.get('ADDED_SETTING','')}
        data=json.dumps(result).encode();self.send_response(200);self.end_headers();self.wfile.write(data)
    def log_message(self,*args):pass
HTTPServer(('0.0.0.0',8000),Handler).serve_forever()
"""
    environment={key:'${'+key+'}' for key in ('APP_URL','SMTP_HOST','SMTP_PASSWORD','CONNECT_API_BASE_URL','CONNECT_API_KEY','TZ')}
    current={'name':'${COMPOSE_PROJECT_NAME:-'+project+'}','services':{
        'app':{'image':'${APP_IMAGE}','command':['python','-u','-c',server],
               'environment':environment,'ports':['${APP_BIND}:${APP_PORT}:8000'],'volumes':['./custom-documents:/data:ro'],
               'healthcheck':{'test':['CMD','python','-c',"import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/',timeout=2)"],
                              'interval':'1s','timeout':'3s','retries':30}},
        'custom-sidecar':{'image':image,'command':['python','-c','import time;time.sleep(3600)']}}}
    # Keep the installed Compose separate from the new canonical template.
    instance=root/'deploy/instances/synthetic';instance.mkdir(parents=True)
    installed=instance/'compose.yaml';installed.write_text(json.dumps(current))
    (instance/'custom-documents').mkdir();(instance/'custom-documents/marker.txt').write_text('existing synthetic school document')
    env=instance/'.env.production';env.write_text(original);env.chmod(0o600)
    baseline={'name':'${COMPOSE_PROJECT_NAME:-'+unexpected+'}','services':{
        'app':{'image':image,'environment':{'SMTP_PASSWORD':'new-default-must-not-win','ADDED_SETTING':'enabled'},
               'ports':['127.0.0.1:65530:8000'],'volumes':['./new-default-documents:/data']},
        'website':{'image':image,'profiles':['website'],'command':['python','-c','import time;time.sleep(3600)']}}}
    (deployment/'compose.yaml').write_text(json.dumps(baseline))
    command=['docker','compose','--env-file',str(env),'-f',str(installed)]
    def execute(*args):return subprocess.check_output([*command,*args],text=True,stderr=subprocess.PIPE,timeout=180)
    def probe():
        opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(values['APP_URL'],timeout=10) as response:return json.load(response)
    try:
        assert json.loads(execute('config','--format','json'))['name']==project
        project_query=['docker','ps','-a','--format','{{.Label "com.docker.compose.project"}}']
        projects_before=set(subprocess.check_output(project_query,text=True).splitlines())
        execute('up','-d','--wait','--wait-timeout','90')
        before=probe();sidecar=execute('ps','-q','custom-sidecar').strip()
        spec=importlib.util.spec_from_file_location('deployer_upgrade_smoke',ROOT/'scripts/deployer.py')
        deployer=importlib.util.module_from_spec(spec);spec.loader.exec_module(deployer)
        deployer.deploy(root,'deploy/instances/synthetic/.env.production',refresh=True)
        after=probe();resolved=json.loads(execute('config','--format','json'))
        helper_project=deployer.compose_project(root,'deploy/instances/synthetic/.env.production')
        assert resolved['name']==project and helper_project==project, {
            'expected_project':project,'resolved_project':resolved['name'],'compose_project':helper_project}
        assert 'COMPOSE_PROJECT_NAME=' not in env.read_text()
        assert all(line in env.read_text().splitlines() for line in original.splitlines())
        assert {key:value for key,value in after.items() if key!='added'}=={key:value for key,value in before.items() if key!='added'}
        assert after['added']=='enabled' and after['marker']=='existing synthetic school document'
        expected=hashlib.sha256((values['SMTP_PASSWORD']+'|'+values['CONNECT_API_KEY']).encode()).hexdigest()
        assert after['credentials']==expected and after['url']==values['APP_URL'] and after['timezone']=='America/Bahia'
        assert execute('ps','-q','custom-sidecar').strip()==sidecar
        assert len(execute('ps','-q').splitlines())==2
        assert set(subprocess.check_output(project_query,text=True).splitlines())<=projects_before|{project}
        assert list(instance.glob('compose.backup-*')) and list(instance.glob('.env.backup-*'))
        evidence=ROOT/'ci-evidence/deployer-upgrade.json';evidence.parent.mkdir(parents=True,exist_ok=True)
        evidence.write_text(json.dumps({'custom_existing_installation':True,'same_project':True,'same_custom_service':True,
            'smtp_connect_preserved':True,'domain_bind_port_preserved':True,'document_volume_preserved':True,
            'compose_new_option_applied':True,'implicit_project_preserved':True,'isolated_fixture':True},indent=2)+'\n')
        print('PASS: atualização Compose real preservou projeto implícito, SMTP/Connect, domínio, porta, volume e serviço personalizado.')
    finally:
        # Cleanup is bound to the generated project and marker, even if upgrade
        # breaks project-name resolution. Never use an installation's volumes.
        if project.startswith('pige360-ci-upgrade-') and marker.is_file() and marker.read_text()==project:
            result=subprocess.run([*command,'-p',project,'down','--remove-orphans'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=60)
            if result.returncode==0:shutil.rmtree(root)
            else:raise RuntimeError('Disposable upgrade fixture cleanup failed; inspect project '+project)


if __name__=='__main__':main(sys.argv[1])
