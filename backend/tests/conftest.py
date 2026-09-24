"""Banco descartável real. PostgreSQL pode ser fornecido por PIGE_TEST_DATABASE_URL."""
import os
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_ROOT = Path(tempfile.mkdtemp(prefix='pige360-tests-'))
os.environ.update({
    'CONNECT_API_BASE_URL':'https://connect.example.test', 'CONNECT_API_KEY':'test-only-connect-key',
    'INTEGRATION_ENCRYPTION_KEY':'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=', 'CONNECT_ALLOWED_HOSTS':'connect.example.test', 'APP_ENV':'test', 'APP_SECRET_KEY':'test-only-secret-key-not-a-production-credential-001',
    'SETUP_TOKEN':'test-only-setup-token-0123456789', 'ALLOW_SQLITE':'true',
    'DATABASE_URL':os.getenv('PIGE_TEST_DATABASE_URL', 'sqlite:///' + str(TEST_ROOT/'test.db')),
    'STORAGE_PATH':str(TEST_ROOT/'documents'), 'FRONTEND_PATH':str(ROOT.parent/'frontend/dist'),
    'APP_URL':'http://testserver', 'ALLOWED_HOSTS':'testserver,localhost,127.0.0.1', 'COOKIE_SECURE':'false'
})
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

PASSWORD='Test-Only-Password-2026!'

@pytest.fixture(scope='session')
def client():
    cfg = Config(str(ROOT/'alembic.ini')); cfg.set_main_option('script_location',str(ROOT/'migrations'))
    command.upgrade(cfg,'head')
    from app.main import app
    with TestClient(app,raise_server_exceptions=True) as c:
        r=c.post('/api/v1/setup',headers={'X-Setup-Token':os.environ['SETUP_TOKEN']},json={
            'admin_name':'Administrador de Teste','admin_email':'admin@example.com','admin_password':PASSWORD,
            'company_name':'Mantenedora de Teste','school_name':'Escola de Teste','academic_year':2026})
        assert r.status_code==201,r.text
        yield c

@pytest.fixture
def admin(client):
    r=client.post('/api/v1/auth/login',json={'email':'admin@example.com','password':PASSWORD}); assert r.status_code==200,r.text
    return {'Authorization':'Bearer '+r.json()['access_token']}

@pytest.fixture
def school(client,admin):
    import uuid
    companies=client.get('/api/v1/companies',headers=admin).json()
    if isinstance(companies,dict): companies=companies['items']
    r=client.post('/api/v1/schools',headers=admin,json={'company_id':companies[0]['id'],'name':'Escola '+uuid.uuid4().hex[:8]})
    assert r.status_code==201,r.text
    return r.json()

class API:
    def __init__(self,client,headers,school):self.client,self.headers,self.school=client,headers,school;self.base='/api/v1/schools/'+school['id']
    def call(self,method,path,json=None,expect=200,**kw):
        r=self.client.request(method,self.base+path,headers=self.headers,json=json,**kw)
        assert r.status_code==expect,(method,path,r.status_code,r.text[:2000])
        return r.json() if r.headers.get('content-type','').startswith('application/json') else r
    def get(self,path):return self.call('GET',path)
    def post(self,path,data,expect=201):return self.call('POST',path,data,expect)
    def patch(self,path,data,expect=200):return self.call('PATCH',path,data,expect)
    def catalogs(self,capacity=1,year='2026'):
        unit=self.post('/units',{'name':'Unidade Centro'})
        period=self.post('/academic-years',{'name':year,'starts_on':year+'-01-01','ends_on':year+'-12-31'})
        grade=self.post('/grades',{'name':'3º Ano'})
        shift=self.post('/shifts',{'name':'Matutino'})
        group=self.post('/class-groups',{'name':'3º Ano A','unit_id':unit['id'],'academic_year_id':period['id'],'grade_id':grade['id'],'shift_id':shift['id'],'capacity':capacity})
        return {'unit':unit,'year':period,'grade':grade,'shift':shift,'group':group}
    def student(self,name='Aluno de Teste',adult=False):
        return self.post('/students',{'person':{'name':name,'birth_date':'2000-05-15' if adult else '2018-05-15'}})
    def guardian(self,student,name='Responsável de Teste'):
        p=self.post('/persons',{'name':name,'is_guardian':True,'phone':'5575999990000'})
        self.post('/students/'+student['id']+'/guardians',{'person_id':p['id'],'legal':True,'financial':True})
        return p
    def enroll(self,student,group):
        return self.post('/enrollments',{'student_id':student['id'],'class_group_id':group['id'],'enrolled_on':'2026-09-21'})
    def move(self,e,action,expect=200,**kw):return self.post('/enrollments/'+e['id']+'/movements',{'version':e['version'],'action':action,'reason':'Movimentação em teste automatizado',**kw},expect)

@pytest.fixture
def api(client,admin,school):return API(client,admin,school)
