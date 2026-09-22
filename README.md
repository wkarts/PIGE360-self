> **Fluxo GitHub/GHCR:** veja [desenvolvimento, releases, limpeza e implantação self-hosted](docs/ci-cd/FLUXO-GITHUB-GHCR.md). O fluxo main/develop agora é versionado neste repositório. Os comandos abaixo de build local permanecem válidos; para imagens publicadas use `deploy/compose.yaml`. Nenhum deploy externo é executado automaticamente.

# PIGE360 Self 0.3.0
## Gestão educacional modular, Secretaria e matrícula online

Aplicação self-hosted em **FastAPI + Vue 3**, exclusivamente Web/PWA. O pacote contém a aplicação, o frontend compilado, migrations, testes, documentação e evidências. **Não contém mais o template original nem um ZIP de template de referência.** O branding oficial da entrega anterior foi preservado.

Esta versão acrescenta um portal separado de responsáveis e o fluxo integrado de inscrição → análise → matrícula. A Secretaria existente continua disponível. A integração bancária implementada é ASAAS (Pix convencional e boleto); a Connect API possui adaptador HTTP configurável, ainda dependente da conferência do contrato da instalação real.

## Instalação nova

Pré-requisitos: Docker com Compose, Python 3 para gerar a configuração, armazenamento persistente e acesso aos registries/pacotes na construção da imagem. Não é um instalador air-gapped. Node.js não é necessário no host: o Docker compila a PWA no estágio Node da imagem. O checkpoint também inclui `frontend/dist` para inspeção local.

```bash
cd pige360-self
python3 scripts/configure.py
# Revise .env e configure o domínio HTTPS antes da exposição pública.
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app worker
```

No Windows, o configurador pode ser executado com `py -3 scripts/configure.py`.

Acesso local: `http://localhost:58080`. No primeiro acesso use `SETUP_TOKEN`, gerado em `.env`, para cadastrar o administrador e a instituição. Não há senha padrão. Banco de produção: PostgreSQL. SQLite é exclusivamente uma opção de testes explícita.

Em domínio próprio:

```bash
python3 scripts/configure.py --url https://escola.seudominio.com.br
```

Esse comando é somente para instalação nova. Preserve `.env` existente nas atualizações.

## Atualização da versão 0.1/0.2

Leia `docs/ATUALIZACAO-0.3.0.md`. Faça backup do banco, dos documentos e da configuração antes de substituir o código. Mantenha o diretório de implantação, o projeto Compose e os volumes existentes.

```bash
python3 scripts/prepare-upgrade.py
docker compose up -d --build
docker compose logs --tail=100 app worker
```

O preparador preserva as credenciais anteriores, cria cópia protegida de `.env`, acrescenta opções ausentes e gera a chave de criptografia das integrações somente quando ela não existe. Imagens de registry personalizado exigem revisão manual da tag. Nunca use `docker compose down -v` para atualizar.

## Serviços

| Serviço | Função | Porta pública |
|---|---|---|
| app | FastAPI + frontend compilado | `APP_BIND:APP_PORT`, padrão `127.0.0.1:58080` |
| db | PostgreSQL persistente | Nenhuma |
| worker | Fila persistente de mensagens, códigos e cobranças; conciliação | Nenhuma |

Não há Nginx, Traefik, Redis ou RabbitMQ internos. O worker compartilha a imagem da aplicação e usa fila persistente no PostgreSQL. O proxy HTTPS externo deve encaminhar para a porta da aplicação e preservar o hostname. `TRUSTED_PROXY_IPS` permite confiar somente em IP/CIDR conhecido do proxy, quando necessário. Não aceite qualquer remetente como proxy confiável.

## Primeiro fluxo operacional

Configure escola/unidade, ano letivo ativo, série, turno, turma e tipos de documento. Em **Inscrições online → Processos e link público**, crie e publique um processo com período de inscrição, ofertas e aviso de privacidade revisado pela instituição.

O link é `/online.html?campaign=SLUG`. O responsável cria uma conta própria, cadastra um ou mais alunos, anexa documentos, aceita os termos e envia. A Secretaria recebe a inscrição, analisa, solicita correções, aprova e efetiva a matrícula. O comprovante passa a estar disponível na conta do responsável.

**A pré-matrícula não garante nem reserva vaga.** A efetivação exige conferência de identidade/vínculo, disponibilidade e documentação segundo as políticas configuradas. Cobrança obrigatória, quando definida, precisa estar recebida; `CONFIRMED` não basta.

A verificação de contato vem habilitada por padrão no processo. Configure SMTP ou Connect API antes de publicar um processo que a exija. Não desative a verificação apenas para contornar uma integração mal configurada em produção.

## Perfis e módulos

A instalação continua sendo um único PIGE360 Self. O acesso é separado por permissões e perfis (\`Administrador\`, \`Direção\`, \`Coordenação\`, \`Secretaria\`, \`Professor\`, \`Aluno\`, \`Responsável\` e \`Consulta\`). Professor, Aluno e Responsável recebem somente o contexto vinculado ao próprio usuário; os endpoints administrativos não ficam disponíveis para esses perfis.

A arquitetura e o estado dos módulos estão em [docs/ARQUITETURA-MODULAR-UNIFICADA.md](docs/ARQUITETURA-MODULAR-UNIFICADA.md). Os comandos completos dos ambientes estão em [deploy/README.md](deploy/README.md), com modelos \`.env.develop.example\` e \`.env.production.example\`.

## Documentação

- `docs/MATRICULA-ONLINE.md`: operação do portal e atendimento.
- `docs/INTEGRACOES.md`: ASAAS, Connect API, SMTP, webhooks e recuperação.
- `docs/ATUALIZACAO-0.3.0.md`: instalação existente, backup e atualização.
- `docs/ESCOPO-0.3.0.md`: recursos entregues e limites.
- `docs/RELATORIO-ENTREGA.md`: evidências e pendências de homologação.
- `docs/MANUAL-SECRETARIA.md`: cadastros e operação interna preexistente.
- `docs/openapi.json`: contrato da API desta versão; também em `/api/v1/openapi.json`.

## Desenvolvimento e testes

Foi preservado o backend SQLAlchemy síncrono e o frontend Vue/TypeScript com templates pré-compilados da entrega anterior. Não houve migração para Vite, Pinia ou Vue Router.

```bash
python3 -m pip install -r backend/requirements-dev.txt
npm ci --prefix frontend --ignore-scripts --no-audit --no-fund
node frontend/build.mjs
cd backend
python3 -m pytest -q
cd ..
python3 scripts/validate_local.py
python3 -m playwright install chromium
python3 scripts/e2e.py
python3 scripts/e2e-online.py
```

Os dois últimos comandos tentam navegação HTTP real. `PIGE_UI_BRIDGE=1` ativa explicitamente um mecanismo de testes em ambientes que bloqueiam navegação; ele encaminha para a API real com HTTPX, mas não valida cookies nativos, CSP de navegação ou instalação PWA. Não o use para declarar esses itens homologados.

## Segurança e operação

Os usuários do portal não recebem token administrativo. Anexos exigem acesso à inscrição correta. Senhas têm hash; credenciais de integrações e conteúdo de jobs usam criptografia autenticada com chave fora do banco. Dados privados não entram no cache offline da PWA. HTTPS é obrigatório para publicação do portal; armazenamento de dados de alunos não é oferecido offline.

A instituição deve definir aviso de privacidade, retenção, pessoas autorizadas e procedimentos de conferência. Os controles técnicos entregues não são certificação jurídica de conformidade. Backups contêm dados pessoais e devem ser protegidos, cifrados e testados no destino.

**ASAAS e Connect API não foram homologados com credenciais reais nesta entrega. Docker/PostgreSQL e instalação PWA precisam ser conferidos na infraestrutura de destino.**
