def test_support_hub_is_company_scoped_and_token_is_not_echoed(client, admin, school):
    company_id = school['company_id']
    base = '/api/v1/companies/' + company_id + '/support-hub'
    initial = client.get(base, headers=admin)
    assert initial.status_code == 200, initial.text
    assert initial.json()['enabled'] is False
    assert 'encrypted_token' not in initial.json()
    assert initial.json()['token_configured'] is False

    payload = {
        'enabled': True,
        'base_url': 'https://hub.example.com',
        'token': 'website-token-for-test-123456',
        'position': 'left',
        'widget_type': 'expanded_bubble',
        'launcher_title': 'Suporte',
    }
    saved = client.put(base, headers=admin, json=payload)
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body['enabled'] is True
    assert body['token_configured'] is True
    assert 'token' not in body
    assert 'website_token' not in body

    public = client.get('/api/v1/schools/' + school['id'] + '/support-widget')
    assert public.status_code == 200, public.text
    assert public.json() == {
        'enabled': True,
        'base_url': 'https://hub.example.com',
        'website_token': 'website-token-for-test-123456',
        'position': 'left',
        'type': 'expanded_bubble',
        'launcherTitle': 'Suporte',
    }

    assert client.get('/api/v1/support-widget').json()['website_token'] == 'website-token-for-test-123456'


def test_support_hub_reuses_token_and_validates_url(client, admin, school):
    base = '/api/v1/companies/' + school['company_id'] + '/support-hub'
    payload = {
        'enabled': True,
        'base_url': 'http://hub.example.com',
        'token': 'website-token-for-test-123456',
        'position': 'right',
        'widget_type': 'expanded_bubble',
        'launcher_title': 'Ajuda',
    }
    saved = client.put(base, headers=admin, json=payload)
    assert saved.status_code == 200, saved.text
    version = saved.json()['version']
    updated = client.put(base, headers=admin, json={
        'version': version,
        'enabled': True,
        'base_url': 'https://hub.example.com',
        'token': '',
        'position': 'right',
        'widget_type': 'expanded_bubble',
        'launcher_title': 'Ajuda',
    })
    assert updated.status_code == 200, updated.text
    assert updated.json()['token_configured'] is True
    assert client.get('/api/v1/support-widget').json()['website_token'] == 'website-token-for-test-123456'
