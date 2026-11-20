from datetime import date

from app.config import settings


def test_draft_publication_retirement_and_history(api, monkeypatch):
    catalog = api.catalogs()
    payload = {'name': 'Oficina de Leitura'}
    api.post('/diary-catalog/suggestions', payload, 404)
    monkeypatch.setattr(settings(), 'diary_catalog_schools', {api.school['id']})
    component = api.post('/diary-catalog/suggestions', payload)
    root = '/diary-catalog/' + component['id']
    diary_data = {'class_group_id': catalog['group']['id'], 'component_id': component['id']}
    def decision(action, version, expected=200):
        return api.post(root + '/decisions', {'action': action, 'version': version, 'reason': 'Decisão do piloto'}, expected)
    assert api.get(root + '/impact')['discard_allowed']
    api.post('/diaries', diary_data, 409)
    assert component['id'] not in [row['id'] for row in api.get('/curriculum-components')]
    assert api.get('/diary-catalog/suggestions')[0]['id'] == component['id']
    published = decision('publish', 1)['component']
    assert published['active']
    diary = api.post('/diaries', diary_data)
    impact = api.get(root + '/impact')
    assert not impact['discard_allowed'] and impact['references'][0]['count'] == 1
    decision('retire', 1, 409)
    retired = decision('retire', published['version'])
    assert not retired['component']['active']
    effective = date.fromisoformat(retired['effective_on'])
    api.post('/diaries', diary_data, 409)
    entry = '/diaries/' + diary['id']
    assert api.get(entry)['component_name'] == payload['name']
    api.post(entry + '/lessons', {'lesson_date': effective.isoformat(), 'content': 'Fora de vigência'}, 409)
    decision('discard', retired['component']['version'], 409)
    # Pausar a administração do catálogo não reativa componentes arquivados.
    monkeypatch.setattr(settings(), 'diary_catalog_schools', set())
    api.post('/diaries', diary_data, 409)

def test_discard_only_unused_new_draft(api, monkeypatch):
    monkeypatch.setattr(settings(), 'diary_catalog_schools', {api.school['id']})
    old = api.post('/curriculum-components', {'name': 'Inativo anterior ao piloto', 'active': False})
    decision = {'action':'discard', 'version':1, 'reason':'Decisão da coordenação'}
    api.post('/diary-catalog/'+old['id']+'/decisions', decision, 409)
    draft = api.post('/diary-catalog/suggestions', {'name':'Sugestão sem uso'})
    root = '/diary-catalog/'+draft['id']
    assert api.post(root+'/decisions', decision, 200)['component'] is None
    api.call('GET', root+'/impact', expect=404)
