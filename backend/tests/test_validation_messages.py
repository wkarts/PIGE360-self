from app.validation_messages import message


def test_validation_errors_are_actionable_in_portuguese():
    assert message({'type':'missing'}) == 'Campo obrigatório.'
    assert message({'type':'string_too_short','ctx':{'min_length':8}}) == 'Informe pelo menos 8 caractere(s).'
    assert message({'type':'greater_than_equal','ctx':{'ge':1}}) == 'Informe um valor maior ou igual a 1.'
    assert message({'type':'value_error','msg':'value is not a valid email address'}) == 'Informe um e-mail válido.'
    assert message({'type':'value_error','msg':'Value error, CPF inválido.'}) == 'CPF inválido.'


def test_http_error_preserves_machine_field_path_without_echoing_input(client):
    response = client.post('/api/v1/auth/login', json={'email':'invalido','password':'x'})
    assert response.status_code == 422
    body = response.json()
    assert body['detail'] == 'Revise os campos informados.'
    assert any(item['field'] == 'body.email' and item['message'] == 'Informe um e-mail válido.' for item in body['errors'])
    assert all(set(item) == {'field','message'} for item in body['errors'])
