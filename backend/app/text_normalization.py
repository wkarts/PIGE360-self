"""Chaves de busca; nunca alteram o nome que fica armazenado no cadastro."""
import unicodedata


def normalized_name(value):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFKD', str(value or ''))
        if not unicodedata.combining(c)).casefold().split())
