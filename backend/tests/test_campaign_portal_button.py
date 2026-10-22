"""Publication-scoped visibility; no changes to student access permissions."""
from conftest import API
from app.config import settings
from test_campaign_period import campaign


def test_visibility_roundtrip_and_old_clients_preserve_choice(api, monkeypatch):
    cat=api.catalogs()
    payload={**campaign(cat['group']), 'active':True}
    row=api.post('/admission-campaigns',payload)
    assert row['show_student_portal_button'] is True
    assert row['student_portal_url']=='/family.html'
    row=api.patch('/admission-campaigns/'+row['id'],{**payload,'version':row['version'],'show_student_portal_button':False})
    assert row['show_student_portal_button'] is False
    assert api.get('/admission-campaigns')[0]['show_student_portal_button'] is False
    public=api.client.get('/api/v1/portal/campaigns/'+row['slug'])
    assert public.status_code==200
    assert public.json()['show_student_portal_button'] is False
    # A pre-upgrade client sends a full edit without the new property.
    row=api.patch('/admission-campaigns/'+row['id'],{**payload,'version':row['version']})
    assert row['show_student_portal_button'] is False
    monkeypatch.setattr(settings(),'portal_public_url','https://portal.example.test/')
    public=api.client.get('/api/v1/portal/campaigns/'+row['slug']).json()
    assert public['student_portal_url']=='https://portal.example.test/family.html'
    row=api.patch('/admission-campaigns/'+row['id'],{**payload,'version':row['version'],'show_student_portal_button':True})
    assert row['show_student_portal_button'] is True


def test_campaign_and_school_isolation(api):
    group=api.catalogs()['group']
    first=api.post('/admission-campaigns',{**campaign(group),'show_student_portal_button':False})
    second=api.post('/admission-campaigns',campaign(group))
    assert second['show_student_portal_button'] is True
    other_school=api.client.post('/api/v1/schools',headers=api.headers,json={'company_id':api.school['company_id'],'name':'Outra escola'}).json()
    other=API(api.client,api.headers,other_school)
    other_group=other.catalogs()['group']
    other_row=other.post('/admission-campaigns',campaign(other_group))
    assert other_row['show_student_portal_button'] is True
    other.patch('/admission-campaigns/'+first['id'],{**campaign(other_group),'version':first['version'],'show_student_portal_button':True},404)
    assert next(x for x in api.get('/admission-campaigns') if x['id']==first['id'])['show_student_portal_button'] is False


def test_migration_preserves_existing_publications():
    import importlib.util
    from pathlib import Path
    import sqlalchemy as sa
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    path=Path(__file__).parents[1]/'migrations/versions/0053_campaign_student_portal_button.py'
    spec=importlib.util.spec_from_file_location('campaign_button_migration',path)
    migration=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    with sa.create_engine('sqlite://').begin() as connection:
        connection.execute(sa.text('CREATE TABLE admission_campaigns (id TEXT PRIMARY KEY)'))
        connection.execute(sa.text("INSERT INTO admission_campaigns VALUES ('existing')"))
        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            assert connection.execute(sa.text('SELECT show_student_portal_button FROM admission_campaigns')).scalar_one()==1
            migration.downgrade()
        assert connection.execute(sa.text('SELECT id FROM admission_campaigns')).scalar_one()=='existing'
