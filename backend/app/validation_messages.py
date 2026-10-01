"""Mensagens estáveis em português para as validações de entrada da API."""

def message(error: dict) -> str:
    kind = error.get('type', '')
    ctx = error.get('ctx') or {}
    known = {
        'missing': 'Campo obrigatório.',
        'string_type': 'Informe um texto válido.',
        'int_parsing': 'Informe um número inteiro.',
        'int_type': 'Informe um número inteiro.',
        'float_parsing': 'Informe um número válido.',
        'decimal_parsing': 'Informe um valor numérico válido.',
        'bool_parsing': 'Selecione uma opção válida.',
        'date_from_datetime_parsing': 'Informe uma data válida.',
        'date_parsing': 'Informe uma data válida.',
        'datetime_from_date_parsing': 'Informe uma data e um horário válidos.',
        'date_future': 'Informe uma data futura.',
        'date_past': 'Informe uma data anterior a hoje.',
        'extra_forbidden': 'Este campo não pode ser alterado nesta operação.',
        'uuid_parsing': 'Selecione um registro válido.',
        'json_invalid': 'Não foi possível ler os dados enviados. Recarregue a página e tente novamente.',
        'literal_error': 'Selecione uma das opções disponíveis.',
        'enum': 'Selecione uma das opções disponíveis.',
    }
    if kind in known:
        return known[kind]
    if kind == 'string_too_short':
        return f"Informe pelo menos {ctx.get('min_length', 1)} caractere(s)."
    if kind == 'string_too_long':
        return f"Informe no máximo {ctx.get('max_length', '')} caractere(s)."
    if kind in ('greater_than_equal', 'greater_than', 'less_than_equal', 'less_than'):
        key, prefix = {
            'greater_than_equal': ('ge', 'Informe um valor maior ou igual a'),
            'greater_than': ('gt', 'Informe um valor maior que'),
            'less_than_equal': ('le', 'Informe um valor menor ou igual a'),
            'less_than': ('lt', 'Informe um valor menor que'),
        }[kind]
        return f'{prefix} {ctx.get(key)}.'
    raw = str(error.get('msg', ''))
    if 'email address' in raw.lower():
        return 'Informe um e-mail válido.'
    # Validações de negócio já trazem mensagens próprias em português.
    if kind == 'value_error' and raw.startswith('Value error, '):
        return raw.removeprefix('Value error, ')
    return 'Revise o valor informado.'
