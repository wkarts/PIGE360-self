# Relatório de entrega e validação

## Identificação

Produto: PIGE360 Self, versão 0.1.0, Secretaria escolar. Entrega local. Dados usados em testes e screenshots são sintéticos, identificados como teste. Nenhuma base de alunos ou credencial de produção acompanha o pacote. O template original não foi modificado e nenhum repositório remoto foi acessado.

## Resultado por camada

| Verificação | Resultado e evidência |
|---|---|
| Importação da API e geração OpenAPI | Executadas; 67 rotas, 49 caminhos OpenAPI; `docs/openapi.json` |
| Modelos SQLAlchemy | 24 tabelas, metadados carregados |
| Migrations | Upgrade, comparação sem diferenças, downgrade descartável e upgrade; SQLite; `static-validation.json` |
| Testes automatizados | 22 passaram; 1 ignorado; `backend-tests.xml` e `.log` |
| Concorrência PostgreSQL | Teste incluído, não executado; exige driver e servidor PostgreSQL |
| DDL PostgreSQL | Compilação estática de CreateTable; não constitui aplicação de schema em servidor |
| TypeScript | Compilação strict executada e sem erros |
| Templates Vue | Pré-compilação com Vue 3.5.13; runtime não exige compilar templates por eval no navegador |
| Interface | 11 verificações em Chromium usando assets locais + API real por HTTPX; `ui-integration-results.json` |
| PDF | Comprovante e lista de turma gerados; arquivo e renderização visual inspecionados |
| Responsividade | Screenshot desktop e 390px; teste sem overflow horizontal; menu mobile exercitado |
| Navegação HTTP no browser | Bloqueada por política do navegador deste ambiente; não homologada |
| PWA | Manifesto/SW/ícones entregues; instalação, atualização e cache em dispositivo não homologados |
| Docker | Ausente no ambiente; Compose/Dockerfile produzidos, não executados |
| Backup/restore | Scripts entregues e sintaxe validada; restauração real não executada |
| CI remoto | Arquivo manual entregue; não executado nem publicado |

## O que os testes de API verificam

Instalação com chave e impedimento de segunda configuração; autenticação, rotação e revogação; origem e Host; acesso anônimo; validação de CPF; pessoa existente como aluno; nascimento; pesquisa por responsável; duplicidade de vínculo; matrícula de menor sem responsável; duplicidade anual; capacidade e liberação de vaga; versão otimista; movimentação; rematrícula e histórico; ano fechado; checklist bloqueante; upload e validação; integridade por hash; emissão de PDF; extensão/arquivo inválido; dispensa e validade; protocolo; CSV seguro; acesso entre escolas; perfil de consulta; auditoria append-only; rejeição de PDF ativo; repetição de movimentação.

O teste adicional de concorrência é específico de PostgreSQL e espera uma única ativação para a última vaga. Foi ignorado no ambiente SQLite: não há alegação de equivalência dos bloqueios dos dois bancos.

## Limitação do teste de interface

O sistema Chromium está configurado para bloquear navegação em todas as URLs. Nenhuma política foi removida ou alterada. O teste HTTP normal está registrado como bloqueado em `e2e-results.json` e `e2e-run.log`.

Para inspecionar as telas, o harness carrega os arquivos reais do frontend em uma página local em memória e encaminha requisições de API a um servidor FastAPI real, usando HTTPX. Não há endpoints falsos nem respostas geradas artificialmente. O harness também substitui armazenamento local de seleção e captura de downloads para permitir conferência de conteúdo.

Isso valida interações, integração de dados, renderização e geração de arquivos. **Não valida cookies do navegador, CSP durante navegação, download nativo, service worker, instalação PWA, TLS, proxy ou cache.** O produto não inclui o harness em seu runtime. O modo HTTP de `scripts/e2e.py` deve ser executado em homologação.

## Pendências antes de dados reais

Homologar o build Docker e o driver psycopg com PostgreSQL; executar concorrência e migrations em instalação nova/atualização; testar recuperação de senha local; confirmar isolamento dos usuários da escola; executar backup e restauração completa; verificar HTTPS/proxy e instalação PWA em navegadores alvo; definir retenção, backups criptografados, antivírus e controles para documentos sensíveis; revisar privilégios do banco, dependências e vulnerabilidades; aplicar a identidade oficial.

O pacote reduz o escopo para Secretaria e não declara o ERP educacional V8 concluído. Recursos e limites adicionais estão no README, incluindo ausência de 2FA, assinatura digital, financeiro e recuperação por e-mail.
