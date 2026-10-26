# Isolamento das portas do smoke Docker — PR 79

Origem: `620a951f74e96a317d66274dc656ba803ea48cec`.

## Falha observada

O run `40348742043` concluiu o build das imagens, os 853 testes PostgreSQL e as jornadas HTTP/Chromium. O teste isolado do website falhou ao publicar `127.0.0.1:58082`: a porta já estava ocupada. O log não identifica o processo que a ocupava.

## Correção

- O teste isolado solicita uma porta livre ao Docker, limitada ao loopback, e consulta a publicação efetiva antes dos probes.
- O CID é gravado em diretório temporário exclusivo. A limpeza também cobre uma falha de rede após a criação do container, preservando o código original de saída.
- A stack integrada usa portas efêmeras para website e portal. Os probes consultam `docker compose port`; o portal conserva uma origem pública sintética explícita e o Host correspondente.
- Permanecem obrigatórios live=200 e ready=503 sem API, ready=200 com API, conteúdo público e bloqueio de rotas administrativas. Nenhum teste foi desabilitado.
- Os adaptadores e as portas padrão das instalações permanecem inalterados. A mudança se limita aos scripts de testes compartilhados pelo CI e pelo publisher.

## Validação local

- `python -m unittest discover -s tests/ci -v`: 259 testes, resultado OK, um ignorado por ausência de Docker Compose.
- 14 testes de smoke focados aprovados, incluindo porta descoberta, publicação inválida e limpeza após falha de inicialização.
- `bash -n scripts/ci/website-isolated-smoke.sh scripts/ci/smoke.sh`, compilação Python, `python scripts/ci/validate.py` e `git diff --check`: aprovados.
- Docker não está disponível neste ambiente. A execução de imagens reais e PostgreSQL no novo SHA fica registrada nos checks da PR; os resultados do run anterior não são atribuídos ao novo SHA.

## Recuperação

Reverter este complemento restaura os scripts anteriores, incluindo as portas fixas que causaram a colisão. Não há migration, alteração em dados ou atualização da instalação.

## SHA256 dos arquivos alterados

- `scripts/ci/website-isolated-smoke.sh`: `2c51d869958fa44d96cb3409f36c620b3d22b4f6cf446fbcd70acfc8ef7b2539`
- `scripts/ci/smoke.sh`: `3778a508b012d76624c0e89cbfc421ab880e70b1112771c6d33e09924949f157`
- `scripts/ci/surfaces-smoke.py`: `34783c0bd82677d2abacef1a6aee624bf5971fb129e647753fb6352541a14862`
- `tests/ci/test_website_isolated_smoke.py`: `acbbbab2f98f8099ba38a48001d88b55106ee2afe71ac18fd387b5f01cc71b74`
- `tests/ci/test_smoke_isolation.py`: `6b8cf724305443c06d1658db6ffae4bed56e6b44a6aec681309c00982e56bd30`
