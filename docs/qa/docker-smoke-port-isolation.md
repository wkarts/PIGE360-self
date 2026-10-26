# Isolamento das portas do smoke Docker — PR 79

Origem: `620a951f74e96a317d66274dc656ba803ea48cec`.

## Falha observada

O run `40348742043` concluiu o build das imagens, os 853 testes PostgreSQL e as jornadas HTTP/Chromium. O teste isolado do website falhou ao publicar `127.0.0.1:58082`: a porta já estava ocupada. O log não identifica o processo que a ocupava.

## Correção

- O teste isolado solicita uma porta livre ao Docker, limitada ao loopback, e consulta a publicação efetiva antes dos probes.
- O CID é gravado em diretório temporário exclusivo. A limpeza também cobre uma falha de rede após a criação do container, preservando o código original de saída.
- A stack integrada usa portas efêmeras para website e portal. A origem HTTP do portal usa `localhost`, aceita pelas validações existentes de produção, com Host correspondente. Os probes consultam `docker compose port`; o portal conserva uma origem pública sintética explícita e o Host correspondente.
- Permanecem obrigatórios live=200 e ready=503 sem API, ready=200 com API, conteúdo público e bloqueio de rotas administrativas. Nenhum teste foi desabilitado.
- Os adaptadores e as portas padrão das instalações permanecem inalterados. A mudança se limita aos scripts de testes compartilhados pelo CI e pelo publisher.

## Validação local

- `python -m unittest discover -s tests/ci -v`: 259 testes, resultado OK, um ignorado por ausência de Docker Compose.
- 14 testes de smoke focados aprovados, incluindo porta descoberta, publicação inválida e limpeza após falha de inicialização.
- `bash -n scripts/ci/website-isolated-smoke.sh scripts/ci/smoke.sh`, compilação Python, `python scripts/ci/validate.py` e `git diff --check`: aprovados.
- Docker não está disponível neste ambiente. A execução de imagens reais e PostgreSQL no novo SHA fica registrada nos checks da PR; os resultados do run anterior não são atribuídos ao novo SHA.

## Complemento de configuração de produção

Revisão a partir de `96835e5ebe46c28e32bd2ec49a6d793e00ee5bf2`: o domínio sintético HTTP inicial foi substituído por `localhost`, mantendo as exigências de HTTPS/cookie seguro para domínios públicos. O teste `backend/tests/test_smoke_runtime_config.py` executa o gerador real do smoke e valida seus valores com `Settings` em modo production. Teste focado aprovado.

## Recuperação

Reverter este complemento restaura os scripts anteriores, incluindo as portas fixas que causaram a colisão. Não há migration, alteração em dados ou atualização da instalação.

## SHA256 dos arquivos alterados

- `scripts/ci/website-isolated-smoke.sh`: `2c51d869958fa44d96cb3409f36c620b3d22b4f6cf446fbcd70acfc8ef7b2539`
- `scripts/ci/smoke.sh`: `6fbd368a8880b3b9b7187d96eec27cc5eb04beb32ecf5bd32b9ccee6ece9b4d6`
- `scripts/ci/surfaces-smoke.py`: `d05e6b17875e2ba0defa38b022b22f16fcd689f31172d8c15da171b8f92fc5d8`
- `tests/ci/test_website_isolated_smoke.py`: `acbbbab2f98f8099ba38a48001d88b55106ee2afe71ac18fd387b5f01cc71b74`
- `tests/ci/test_smoke_isolation.py`: `9dda19fc184be1af147b9a25d355ce8de6f1b47a32a4606f97e903c3352a5d76`
- `backend/tests/test_smoke_runtime_config.py`: `6cb0dcef38ef5a9aa40f7dad022e5711c82571e6d913e4aabef8b5a0b9b069ac`
