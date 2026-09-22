# PIGE360 Self — Secretaria Escolar

**Entrega local 0.1.0 · FastAPI + Vue 3 · Web/PWA · sem aplicações nativas.**

Esta entrega contém código de aplicação, banco modelado, migration, interface ligada à API, frontend compilado, Docker Compose, testes e evidências. Não é apenas um prompt nem a plataforma educacional integral do documento V8.

O template enviado foi usado como referência técnica/visual. Sua cópia original está preservada em `reference/template-original.zip`. A operação financeira/SaaS/Control Plane não participa da aplicação escolar. Não houve acesso ou alteração a repositório remoto.

## Instalação com Docker

Requisitos: Docker Engine com Compose v2 e Python 3 para gerar a configuração. A primeira construção precisa de rede para as imagens base e dependências Python. **Node.js não é necessário para instalar: o frontend compilado está incluído.**

Na pasta extraída:

```bash
python3 scripts/configure.py
# No Windows: py -3 scripts/configure.py

docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Abra `http://localhost:58080`. Na primeira tela, informe o valor `SETUP_TOKEN` do arquivo `.env`. Cadastre mantenedora, escola, unidade, ano letivo e seu usuário administrador. A senha é escolhida por você: **não existe usuário/senha padrão nem carga automática de alunos**.

O Compose possui somente `app` e `db`. O serviço `app` serve a API e a PWA na mesma porta. PostgreSQL e arquivos usam volumes persistentes. Não execute `docker compose down -v` em uma instalação com dados.

### VPS com CloudPanel/proxy externo

Antes de gerar `.env`, escolha o endereço definitivo:

```bash
python3 scripts/configure.py --url https://escola.seudominio.com.br

docker compose up -d --build
```

No proxy existente, direcione o domínio para `http://127.0.0.1:58080`, preserve o cabeçalho `Host` original e configure HTTPS. A aplicação **não inclui Nginx nem Traefik**, não gerencia DNS e não emite certificados. Ajuste o limite do proxy para comportar os arquivos de até 10 MB mais o envelope multipart. Configurações HTTPS geradas ativam o cookie seguro.

O padrão `APP_BIND=127.0.0.1` impede acesso direto pela rede à porta do app. Para uma rede local, a exposição `0.0.0.0` deve ser deliberada, protegida por firewall e HTTPS. Cada instalação deve ter diretório, nome de projeto Compose e volumes próprios; o nome fixo `pige360-self` deve ser ajustado antes de subir uma segunda instalação na mesma máquina.

**Não gere outro `.env` sobre uma instalação existente.** O gerador se recusa a sobrescrever o arquivo. Mudança de senha do banco exige procedimento próprio; não basta editar o valor no Compose quando o volume já existe.

## O que está implementado

| Área | Funcionamento nesta entrega |
|---|---|
| Instalação e acesso | Assistente protegido por chave; administrador inicial; login; refresh rotativo; logout; alteração de senha; recuperação local por CLI |
| Organização | Empresas/mantenedoras, escolas e unidades da instalação; vínculo de usuários às escolas; administrador global da própria instalação |
| Pessoas | Cadastro de pessoa por escola; CPF opcional com validação e unicidade quando informado; dados de contato; aproveitamento de pessoa existente via API |
| Alunos | Cadastro, consulta, pesquisa por aluno/responsável/CPF/telefone/código/matrícula, edição cadastral, ficha e arquivamento controlado |
| Responsáveis | Múltiplos vínculos; legal, financeiro, retirada e contato principal; uma pessoa pode ser vinculada a vários alunos da escola |
| Estrutura acadêmica | Ano letivo, série/etapa, turno, unidade e turma com capacidade |
| Matrícula | Rascunho, ativação, verificação de vaga/documentos/responsável, bloqueio de duplicidade, suspensão, reativação, mudança de turma/turno, transferência externa, cancelamento e conclusão |
| Rematrícula | Novo vínculo em período posterior, referenciando a matrícula anterior sem sobrescrevê-la |
| Documentos | Tipos globais ou por série; PDF/PNG/JPEG; recebimento, validação, rejeição, validade, dispensa administrativa, checklist e pendências |
| Arquivos | Storage privado local; metadados SQL; SHA-256; nomes internos aleatórios; download autorizado com conferência de integridade |
| Emissão | Ficha cadastral, comprovante e declaração de matrícula em PDF; cópia dos dados usados na emissão; versão de template |
| Secretaria | Protocolos com prazo/situação; dashboard com dados persistidos; relatório de turma em PDF; cadastro de alunos em CSV |
| Auditoria | Ações, ator, data, registro, referência da requisição e detalhes nas operações implementadas; proteção de UPDATE/DELETE da tabela por trigger |
| Cliente | Interface clara e responsiva; manifesto e service worker de PWA; nenhum APK/IPA/Tauri |

A disponibilidade de vagas considera matrículas **ativas e suspensas**. Rascunho não reserva vaga física; impede duplicação de vínculo do mesmo aluno no mesmo ano. A confirmação ocorre na ativação. Conclusão mantém o histórico e a unicidade do vínculo anual; cancelamento/transferência liberam a chave do vínculo.

As permissões são verificadas no backend, não somente pela presença de um botão. Os perfis administrativos são `admin`, `secretary` e `viewer`, com conjunto de permissões definido em `backend/app/security.py`. Não há editor arbitrário de papéis nesta entrega.

## Como começar a Secretaria

1. Configure a escola e entre com o administrador.
2. Em **Estrutura acadêmica**, confira ano/unidade e cadastre série, turno e turma.
3. Cadastre um responsável e o aluno; na ficha do aluno, vincule o responsável legal/financeiro.
4. Configure tipos de documento, receba os arquivos e valide-os.
5. Em **Matrículas**, crie o rascunho, abra os detalhes e ative a matrícula.
6. Emita o comprovante, confira o aluno na turma e consulte o histórico.

`docs/MANUAL-SECRETARIA.md` detalha os fluxos e regras.

## Validação executada nesta entrega

- **22 testes automatizados passaram; 1 foi ignorado por exigir PostgreSQL real.** Relatório: `evidence/backend-tests.log` e XML JUnit.
- Alembic: upgrade em banco vazio, verificação de diferenças, downgrade em banco descartável e novo upgrade — executados com SQLite.
- 24 tabelas, 67 rotas registradas e 49 caminhos no OpenAPI. O total de rotas inclui infraestrutura; não representa 67 módulos.
- TypeScript strict e compilação dos templates Vue executados.
- **11 verificações de interface passaram em Chromium**, com arquivos locais e API real acessada por um transporte HTTPX de teste. Houve cadastro, vínculo, upload, matrícula, PDF e conferência mobile. Não foram respostas simuladas.
- PDFs de teste foram abertos, extraídos e inspecionados visualmente; screenshots estão em `evidence/`.

### O que não foi validado aqui

O ambiente não disponibilizou Docker, PostgreSQL/driver PostgreSQL nem acesso de rede para instalar dependências. O Chromium tem política que impede abrir URLs, inclusive localhost. Por isso:

**não houve execução de containers, teste de concorrência em PostgreSQL, restauração real por Docker, navegação HTTP completa, validação de cookies nativos no navegador, instalação PWA em dispositivo ou publicação de imagens.**

O teste de interface usa `scripts/ui_bridge.py`, exclusivamente como harness de teste. Ele não é usado pelo produto, não altera a API e não deve ser descrito como homologação de navegação/PWA. O script `scripts/e2e.py` também contém o percurso HTTP normal para execução no seu ambiente. Veja `docs/RELATORIO-ENTREGA.md` antes de usar com dados reais.

## Decisões técnicas desta versão

**Backend:** Python 3.13, FastAPI, SQLAlchemy 2 **síncrono**, Alembic e PostgreSQL para o deploy. Endpoints de persistência são funções `def`; a versão assíncrona do template não foi mantida nesta aplicação operacional. SQLite existe apenas para testes locais e é bloqueado sem `ALLOW_SQLITE=true`.

**Frontend:** Vue 3.5.13, TypeScript strict, CSS local e templates pré-compilados. O runtime Vue acompanha o pacote com sua licença. Esta entrega usa um build local simples (`node frontend/build.mjs`) e **não utiliza Vite, Pinia, Vue Router ou Tailwind na aplicação ativa**. A navegação é por hash. Os arquivos originais dessas ferramentas permanecem dentro do ZIP de referência, não misturados ao produto. Não foi inventado lockfile de dependências que não puderam ser resolvidas aqui.

**Multiempresa/multiescola:** um banco por instalação, com escopo de escola autorizado no servidor. Não existe provisionamento SaaS, banco por tenant, Control Plane remoto ou RLS nesta versão. Cada cliente independente instala sua própria instância. Pessoas não são compartilhadas silenciosamente entre escolas.

**PWA:** cache somente da interface e ativos estáticos. API, dados de alunos e documentos não são armazenados pelo service worker. Não há matrícula offline, fila offline, sincronização de dados acadêmicos nem push. Operações exigem conexão e confirmação do servidor.

**Identidade:** os monogramas `PS` são ativos técnicos provisórios, não uma identidade visual oficial aprovada. Não há fontes incorporadas, logos inventadas de escolas nem fotos de alunos.

## Desenvolvimento e testes

```bash
python3.13 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements-dev.txt

# Somente para recompilar o frontend:
npm install --prefix frontend --ignore-scripts --no-audit --no-fund
node frontend/build.mjs

(cd backend && PYTHONPATH=. python -m pytest -q)
python scripts/validate_local.py

# Em ambiente com Chromium/Playwright e navegação local permitida:
python -m playwright install chromium
python scripts/e2e.py
```

Dependências diretas estão fixadas em `requirements*.txt` e `frontend/package.json`. O frontend já compilado dispensa a etapa npm na instalação. Ainda é necessário resolver dependências transitivas e fixar digests de imagens após homologação; isto não é um bundle OCI totalmente offline.

Para repetir exatamente o teste de UI utilizado neste ambiente:

```bash
PIGE_UI_BRIDGE=1 python scripts/e2e.py
```

Este comando usa uma API e um banco descartáveis, sem acessar sua instalação. As senhas em fixtures são apenas dados sintéticos de teste.

O workflow `.github/workflows/ci.yml` é manual (`workflow_dispatch`), não foi executado remotamente e não publica imagens. Ele prevê teste em PostgreSQL, compilação, E2E e construção Docker no ambiente de CI.

## Recuperação, backup e atualização

```bash
# Redefinir senha pelo operador local autorizado:
docker compose exec app python -m app.cli reset-password usuario@escola.com.br

# Backup consistente: interrompe temporariamente o app.
sh scripts/backup.sh

# Conferir hashes e entradas do arquivo de documentos:
python3 scripts/verify_backup.py backups/SEU_BACKUP

# Restauração DESTRUTIVA, manual, após backup e confirmação:
sh scripts/restore.sh backups/SEU_BACKUP --confirm-restore
```

Backup contém dados pessoais e não é criptografado automaticamente. Guarde-o com permissão restrita e criptografia no destino; proteja `.env` separadamente. Os scripts foram validados sintaticamente, **não executados com Docker nesta entrega**. Em falha de restauração, o app permanece parado para investigação.

Para atualizar: faça backup, preserve `.env` e volumes, substitua o código, execute `docker compose up -d --build`, confira os logs de migration e o fluxo escolar. Não existe atualizador remoto automático.

## Limites funcionais e de segurança

Não estão implementados: financeiro/cobrança, emissão fiscal, notas/frequência/boletim, portal família/aluno/professor, cantina, RH, assinatura digital, WhatsApp, SMTP, recuperação de senha por e-mail, importação em lote, editor de templates PDF, QR de validação, tema escuro, branding por escola e 2FA.

Não há antivírus/ClamAV, armazenamento S3, criptografia de arquivos em repouso gerenciada pela aplicação, teste de carga, auditoria de segurança independente ou certificação de conformidade. As validações de PDF/imagem **não substituem antivírus**. Campos de observação são administrativos, não um prontuário de saúde com políticas próprias. A conta do banco criada pelo Compose é a conta de instalação; sua segregação de privilégios deve ser endurecida na homologação.

Múltiplas grades paralelas por aluno/ano, créditos acadêmicos e transferências entre escolas não fazem parte do fluxo desta versão. Os relatórios de pendência consideram até 5.000 alunos ativos e precisam de otimização/paginação para volumes maiores. Datas e números acadêmicos são validados operacionalmente; não há motor de legislação educacional.

A entrega é uma **versão inicial funcional para homologação da Secretaria**, não um ERP escolar completo nem uma declaração de prontidão para produção.
