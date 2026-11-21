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

O professor entra pelo domínio do serviço docente e usa seu usuário escolar e autenticação de dois fatores quando exigida. A matrícula online continua indicando o portal familiar.

A Secretaria confere o acesso do professor à instituição e o vínculo com o cadastro da pessoa. A Coordenação atribui turma, ano e disciplina, cadastra o período letivo e vincula a atribuição ao diário do componente. Uma turma pode ter diários de componentes diferentes. Sem atribuição ou sem diário, a programação indica o encaminhamento.

1. Em **Minha programação**, confira turma, turno e disciplina. Use **Abrir diário** para entrar diretamente no componente.
2. Em **Planejamento**, informe os objetivos do período. Em **Diários**, registre o conteúdo e a data da aula, abra a chamada e salve as presenças e faltas.
3. Em **Avaliações**, cadastre a atividade e lance os resultados dos alunos. Em **Pareceres**, registre o acompanhamento individual. Volte à programação e selecione a semana para consultar as aulas registradas e avaliações datadas.
4. Envie o diário à revisão conforme o calendário da escola. A Coordenação ou Direção conduz o fechamento e a reabertura conforme as permissões da instituição.

A agenda consulta as datas do Diário e das avaliações. Os horários fixos de uma grade semanal não são cadastrados nesta tela. Atualize juntos o aplicativo e o serviço de portal com imagens da mesma revisão. A revisão com materiais e justificativas requer a migração 0059_class_materials_absences.

### Portal docente em domínio dedicado

A família acessa o serviço `portal`. O professor acessa a raiz de `teacher-portal`, com imagem dedicada `ghcr.io/wkarts/pige360-self-teacher-portal`. Cada domínio serve seu próprio login e rejeita as páginas e APIs exclusivas do outro. A matrícula mantém o acesso ao Portal do Aluno.

No deployer, abra **Configurar site e portais independentes**, marque **Habilitar Portal do Professor**, informe a URL e a porta e salve.

Nos quatro adaptadores Compose, acrescente `teacher` aos perfis já ativos, configure a origem HTTPS em `TEACHER_PORTAL_PUBLIC_URL` e use a mesma versão de imagem do gestor. Por exemplo, aponte o DNS e o proxy TLS de `portalprofessor.sua-escola.example` para a porta local 58084. A porta do portal familiar continua 58083. Antes de divulgar o endereço docente, confira a raiz, o login e `/health/ready` nos dois domínios. Em instalações que usam o complemento histórico `deploy/compose.teacher.yaml`, consolide a configuração no Compose principal ao atualizar.

### Rotina da equipe

- **Professor** — abra Visão geral, escolha o diário e registre a chamada. Em Avaliações, crie a avaliação e selecione Lançar notas. Em Atividades e trabalhos, escolha a turma, o tipo, o destinatário e publique. O material fica disponível para impressão. Se faltar o diário, encaminhe à Coordenação para conferir a atribuição.
- **Aluno e responsável** — em Atividades, confirme o nome do aluno, abra o material e use Baixar para imprimir. Materiais individuais exigem a matrícula destinatária ativa. Em Justificativas de ausência, o responsável informa a data, o motivo e, se desejar, anexa PDF, PNG ou JPEG. Acompanhe pelo número do protocolo. O documento original verificável é recomendado quando disponível.
- **Secretaria** — no Diário Escolar, selecione o diário, abra Materiais da turma e baixe o PDF. Para uma justificativa online, abra o número recebido em Protocolos, confira o anexo e registre o atendimento ou a conclusão. Para entrega em papel, abra o protocolo diretamente no balcão com o aluno e a data. A atualização de frequência segue a rotina autorizada do Diário.
