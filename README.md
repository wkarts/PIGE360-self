<picture>
  <source media="(prefers-color-scheme: dark)" srcset="frontend/public/branding/pige360/symbol.png" width="84" height="84">
  <img src="frontend/public/branding/pige360/logo-horizontal.png" alt="PIGE360 — School Platform" width="320" height="96">
</picture>

# PIGE360 Self

O PIGE360 Self é uma aplicação web de gestão escolar instalada na infraestrutura da instituição. A secretaria acompanha o aluno da inscrição à matrícula, o professor registra o trabalho da turma no Diário e a família consulta os resultados publicados. A escola também administra seus documentos, canais de comunicação e site institucional.

**[Instalar ou atualizar o PIGE360 Self](instalacao.md)** · [Última versão estável e notas da release](https://github.com/wkarts/PIGE360-self/releases/latest) · [Manual da Secretaria](docs/MANUAL-SECRETARIA.md)

## Por onde começar

| Quero… | Onde começar |
| --- | --- |
| Preparar a escola para o ano letivo | Cadastre a instituição e as unidades. Em Estrutura acadêmica, confira ano, séries, turnos e turmas. [Operações escolares](docs/operacoes-escolares-recuperacao.md) |
| Organizar as pessoas da comunidade escolar | Use o Cadastro único para atribuir vários tipos à mesma pessoa. Gerencie o login e as permissões em Usuários e acessos. [Cadastros](docs/CADASTROS-E-MODAIS.md) · [Perfis e acesso](docs/ACESSO-CADASTRO-2FA.md) |
| Abrir inscrições | Em Inscrições online, publique um processo com período e ofertas. Use o link gerado pelo gestor. A secretaria confere documentos, vínculos e disponibilidade antes de efetivar a matrícula. [Matrícula online](docs/MATRICULA-ONLINE.md) |
| Preparar contratos para assinatura | Configure o modelo, confira a via vigente e acompanhe as assinaturas exigidas pela escola. [Contratos e assinaturas](docs/ASSINATURAS-CONTRATOS.md) · [Certificados](docs/CERTIFICADOS-FISCAIS-E-AVISOS.md) |
| Registrar aulas e consultar o boletim | No Diário, o professor registra aulas, frequência e avaliações das suas turmas. A família consulta no portal os resultados publicados para os alunos vinculados. [Diário Escolar](docs/DIARIO-ESCOLAR-DIGITAL-BAHIA.md) · [Portal da família](docs/portal-familia-layout.md) |
| Publicar o site ou divulgar uma notícia | Em Publicidade, configure a identidade, escolha o modelo, revise o rascunho na prévia e publique. Em Notícias e eventos, confira o público e o período de exibição. [Site da escola](docs/guias-e-site-escolar.md) |
| Trazer cadastros de um sistema anterior | A importação seletiva permite revisar a prévia e escolher o que aplicar. [Portabilidade de dados](docs/PORTABILIDADE-DE-DADOS.md) |

## Mensagens, cobranças e declarações

O sistema oferece e-mail institucional, notificações e conexão com WhatsApp. Para a pré-matrícula que exige verificação de contato, teste o recebimento do código pelo canal configurado antes de divulgar o processo. [E-mail integrado](docs/EMAIL-INTEGRADO.md) · [Mailcow](docs/MAILCOW.md) · [Instâncias Connect API](docs/CONNECT-API-INSTANCIAS.md)

O financeiro distingue cobranças manuais das cobranças Asaas por Pix e boleto. Uma solicitação encaminhada à ponte de integração tem acompanhamento próprio. Para confirmar pagamento ou efetivar matrícula, valem os estados e as regras do financeiro. [Integrações](docs/INTEGRACOES.md) · [Capacidades da ponte financeira](docs/INTEGRACAO-CRM.md)

O Educacenso trabalha com arquivos. A exportação oficial depende de leiaute do Inep validado para o ano e a etapa. Enquanto faltar essa validação, use os recursos de treinamento. Antes de uma declaração, confira o efeito de substituição sobre os dados já declarados. [Implementação dos leiautes](backend/app/educacenso_codec.py)

## Como a aplicação está organizada

A interface Vue 3 com TypeScript atende ao navegador e à PWA. A API FastAPI usa PostgreSQL. O armazenamento de fotos e anexos pode ser local ou privado em S3/MinIO. Os workers processam documentos e integrações em segundo plano. O gestor, o site público e os portais têm públicos distintos. O guia de instalação mostra quais serviços e domínios configurar para a release escolhida. A especificação da API em execução fica em `/api/v1/openapi.json`. [Arquitetura](docs/ARQUITETURA-MODULAR-UNIFICADA.md) · [Referência de API do repositório](docs/openapi.json) · [Instalação](instalacao.md)

## Guias de consulta

- **Secretaria e direção.** Para conferir documentos, emitir relatórios e preparar o próximo ano, consulte o [manual de operação](docs/MANUAL-SECRETARIA.md) e o [guia de leitura assistida de documentos](docs/OCR-E-CONSULTAS-CADASTRAIS.md).
- **Administração.** Para configurar ferramentas administrativas, identidade institucional e acesso em duas etapas, consulte [Administração do sistema](docs/ADMINISTRACAO-DO-SISTEMA.md), [identidade visual](docs/IFRAME-WHITELABEL-PERFIL.md) e [contas e 2FA](docs/ACESSO-CADASTRO-2FA.md).
- **Atendimento.** Se o site ou um portal não abrir, comece pelo domínio afetado, registre o código de atendimento exibido e siga o [roteiro de diagnóstico](docs/site-portal-incident.md).

## Qual versão estou consultando?

A [última release estável](https://github.com/wkarts/PIGE360-self/releases/latest) identifica a versão publicada. Na instalação, a rota `/health/live` do gestor informa a versão em execução. Para consultar o manual correspondente, selecione essa tag no GitHub. A documentação de `develop` acompanha o código em validação e pode descrever recursos que ainda aguardam release. [Histórico de releases](https://github.com/wkarts/PIGE360-self/releases) · [Fluxo GitHub e GHCR](docs/ci-cd/FLUXO-GITHUB-GHCR.md)

## Primeiro dia de homologação

Uma sugestão de aceite é percorrer a escola com três contas fictícias. A secretaria prepara uma turma e efetiva uma matrícula. O professor registra e publica um resultado. O responsável entra no portal e confere se vê o aluno vinculado e o mesmo período publicado. Esse percurso verifica configuração, permissões e publicação antes de convidar as famílias. [Roteiro de treinamento](docs/TREINAMENTO-NAVEGANTES.md)

Para quem desenvolve ou mantém a instalação, os testes da API ficam em [backend/tests](backend/tests), as regressões da interface em [frontend/tests](frontend/tests) e a sequência executada nas PRs em [validação contínua](.github/workflows/ci.yml).
