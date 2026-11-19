# Portal e identidade institucional

O portal usa a identidade canônica da instalação em `/api/v1/institution/identity`:
nome, logo, cores, fonte, favicon e manifest. O site usa a mesma identidade nos
três modelos existentes. Dados cadastrais e vínculos continuam por escola; esta
alteração não cria branding diferente para cada unidade. Os ativos públicos são
endereçados por SHA-256 e extensão, inclusive fontes TTF/WOFF2.

## IP do cliente

`PORTAL_INTERNAL_TOKEN` é um segredo dedicado, compartilhado apenas pelo núcleo
e pelo portal. O configurador o gera e o upgrade preserva o valor existente.
Não reutilize chave administrativa, não publique o valor nem o registre em logs.
O portal assina IP, método, alvo e horário; o núcleo só usa assinaturas válidas
por 30 segundos nas rotas desta superfície. Headers internos enviados pelo
navegador são descartados. A assinatura não concede autenticação de usuário.

Sem proxy externo, o endereço da conexão é usado diretamente. Com proxy reverso,
configure `PORTAL_TRUSTED_PROXY_IPS` com os IPs/CIDRs exatos dos proxies vistos
pelo serviço (a passagem pela rede Docker pode mudar o endereço observado).
O proxy deve sobrescrever ou acrescentar corretamente `X-Forwarded-For`.
A cadeia é percorrida da direita para a esquerda, removendo apenas saltos
confiáveis. Valores vazios não confiam em nenhum header de cliente; `*`,
`0.0.0.0/0` e `::/0` são recusados. Nunca libere toda a rede por conveniência.
Sem a configuração correta, o IP do proxy continua sendo usado, conservadoramente,
e seus clientes ainda podem compartilhar o limite. Valide com dois clientes no
proxy HTTPS real antes da homologação. O segredo não substitui essa configuração.

## Primeiro acesso

A inspeção do link mantém o token num cookie host-only, HttpOnly, SameSite=Strict,
restrito a `/api/v1/invitations`, Secure em produção e com a validade original.
Só então o fragmento secreto sai da URL. Um identificador público de convite
permite retomar após refresh e isola convites abertos em abas distintas. O token
não vai para localStorage/sessionStorage. Uso, expiração ou revogação invalidam
o convite; o cookie é limpo no consumo ou na próxima consulta inválida.

DNS, TLS, configuração do proxy e entrega efetiva do e-mail precisam de
homologação na instalação. Testes locais/CI usam apenas dados e SMTP sintéticos.

## Portal do Professor

O mesmo serviço Compose `portal` atende a família na raiz e o professor em `/professor`. O professor usa seu usuário escolar e a autenticação de dois fatores quando exigida. Quem entra pela página inicial com uma conta docente segue para a área do professor. Na instância que serve diretamente os arquivos do gestor, a entrada é `/professor.html`.

A Secretaria confere o acesso do professor à instituição e o vínculo com o cadastro da pessoa. A Coordenação atribui turma, ano e disciplina, cadastra o período letivo e vincula a atribuição ao diário do componente. Uma turma pode ter diários de componentes diferentes. Sem atribuição ou sem diário, a programação indica o encaminhamento.

1. Em **Minha programação**, confira turma, turno e disciplina. Use **Abrir diário** para entrar diretamente no componente.
2. Em **Planejamento**, informe os objetivos do período. Em **Diários**, registre o conteúdo e a data da aula, abra a chamada e salve as presenças e faltas.
3. Em **Avaliações**, cadastre a atividade e lance os resultados dos alunos. Em **Pareceres**, registre o acompanhamento individual. Volte à programação e selecione a semana para consultar as aulas registradas e avaliações datadas.
4. Envie o diário à revisão conforme o calendário da escola. A Coordenação ou Direção conduz o fechamento e a reabertura conforme as permissões da instituição.

A agenda consulta as datas do Diário e das avaliações. Os horários fixos de uma grade semanal não são cadastrados nesta tela. Atualize juntos o aplicativo e o serviço de portal com imagens da mesma revisão. A revisão com materiais e justificativas requer a migração 0059_class_materials_absences.

### Portal docente em domínio dedicado

O modo padrão mantém a família na raiz e o docente em `/professor`. Para usar um domínio próprio, inclua o serviço de `deploy/compose.teacher.yaml` na mesma stack do gestor. No Dockge, copie a entrada `teacher-portal` para o mapa `services` da stack. Na CLI, a partir de `deploy/dockge`, use o segundo arquivo Compose. O serviço reaproveita a imagem de portal da mesma revisão do backend.

1. Antes da atualização, faça backup consistente do PostgreSQL e dos arquivos de documentos ou bucket. Registre os digests atuais do gestor e portal. Configure `PORTAL_IMAGE` e a imagem do gestor com as versões candidatas correspondentes quando estiverem publicadas.
2. Configure `TEACHER_PORTAL_PUBLIC_URL=https://professor.escola.example`, a origem do portal familiar em `PORTAL_PUBLIC_URL` e o segredo compartilhado já usado pela stack em `PORTAL_INTERNAL_TOKEN`. Use HTTPS e `COOKIE_SECURE=true`. O exemplo escuta apenas em `127.0.0.1:58084`. Aponte o proxy TLS do domínio docente para essa porta.
3. Valide a configuração com `docker compose --env-file .env -f compose.yaml -f ../compose.teacher.yaml --profile portal config --quiet`. Atualize a stack com os mesmos argumentos e `up -d`. Preserve os perfis adicionais da instalação. O gestor aplica as migrações na inicialização. Confira a revisão com `docker compose exec app alembic current`.
4. Confira `/health/ready` nos dois portais. A raiz docente abre o login do Professor. O link do professor no portal familiar segue para esse domínio. Uma sessão iniciada em um domínio separado exige autenticação própria.
5. Para voltar ao modo compartilhado mantendo a mesma versão, remova o serviço opcional da stack, esvazie `TEACHER_PORTAL_PUBLIC_URL` e recrie gestor e portal. Para rollback da versão com registros novos, arquive os lançamentos do intervalo, interrompa as gravações e restaure o banco **e os arquivos** do mesmo ponto de backup em cópia isolada. Verifique o vínculo entre protocolos e comprovantes antes de retomar com as imagens anteriores.

### Rotina da equipe

- **Professor** — abra Visão geral, escolha o diário e registre a chamada. Em Avaliações, crie a avaliação e selecione Lançar notas. Em Atividades e trabalhos, escolha a turma, o tipo, o destinatário e publique. O material fica disponível para impressão. Se faltar o diário, encaminhe à Coordenação para conferir a atribuição.
- **Aluno e responsável** — em Atividades, confirme o nome do aluno, abra o material e use Baixar para imprimir. Materiais individuais exigem a matrícula destinatária ativa. Em Justificativas de ausência, o responsável informa a data, o motivo e, se desejar, anexa PDF, PNG ou JPEG. Acompanhe pelo número do protocolo. O documento original verificável é recomendado quando disponível.
- **Secretaria** — no Diário Escolar, selecione o diário, abra Materiais da turma e baixe o PDF. Para uma justificativa online, abra o número recebido em Protocolos, confira o anexo e registre o atendimento ou a conclusão. Para entrega em papel, abra o protocolo diretamente no balcão com o aluno e a data. A atualização de frequência segue a rotina autorizada do Diário.
