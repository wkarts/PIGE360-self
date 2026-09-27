# Portal de matrícula e diagnóstico da instalação

## Entrada no portal

A autenticação de uma conta já existente não depende de existir processo de matrícula
aberto. Login e recuperação usam a unidade da conta; não pesquisam o e-mail em outras
escolas. Uma única escola ativa é selecionada automaticamente. Em instalações com mais
unidades cadastradas como escolas, a escolha continua explícita. O parâmetro legado
`campaign_slug` permanece aceito. 2FA, revogação, cookies, CSRF e isolamento são mantidos.

Não existe abertura automática de processo, aceite automático de termos, criação de
turmas ou alteração de datas. Novas contas e inscrições continuam exigindo uma oferta
publicada, no prazo e com turma ativa em ano letivo ativo. Sem essa configuração, o
portal explica a situação e mantém o acesso das contas existentes, em vez de mostrar
um seletor vazio que impede tudo. Uma falha de API mostra erro/referência e Tentar
novamente: não é interpretada como ausência de inscrições.

Em **Inscrições online**, a área **Matrícula online** informa o diagnóstico de publicação:
ano letivo, turmas, processo ainda não publicado, prazo futuro/encerrado ou oferta sem
turma ativa. As ações levam à Estrutura acadêmica e ao formulário de processo já
existente. **Publicar processo no portal** exige decisão de quem tem a permissão
`admissions.manage`. Contas da Secretaria sem essa permissão podem consultar o estado.
A data operacional usa America/Bahia, evitando mudar o dia da matrícula às 21h locais.

Inscrições históricas podem consultar seu processo pela própria conta, mesmo após
retirada da publicação; não precisam aparecer entre as ofertas atuais. Isso não reabre
prazos ou autoriza novas inscrições. A conta do portal é diferente do usuário administrativo:
credenciais da Secretaria não são convertidas em credenciais de responsável.

## Console de diagnóstico

**Administração → Diagnóstico e logs** é exclusivo de administradores da instalação.
Acesso, consulta de logs e exportação são registrados na auditoria existente. Não é
necessário adicionar serviços, portas, volumes ou migrations. Não usa docker.sock.

O resumo mostra versão/build, banco/migrations, espaço local disponível, atividade
observada dos workers, contagem de filas (integrações, comunicação e OCR) e pendências
de publicação do portal. Não faz chamadas a bancos, SMTP, Connect API ou outras APIs
externas para testar credenciais. Atividade recente NÃO é o healthcheck do Docker;
serviço ausente deve ser conferido no Dockge. O armazenamento S3 não é medido pelo
indicador de disco local.

Os eventos possuem horário UTC, serviço, nível, código técnico, referência da
requisição, rota parametrizada, status, duração e, nas exceções não tratadas, arquivo,
função e linha. Não incluem corpo, query string, cabeçalhos, senha, cookie, JWT, CPF,
e-mail, texto de OCR, SQL ou variáveis locais. Falhas de navegador são classes de
falhas (script/recurso/rejeição), nunca mensagens ou stacks com conteúdo da página.
Jobs dos workers registram seu identificador e resultado, sem payloads/segredos.

Há filtros de serviço, nível, período e referência; paginação de até 100 por página
e recorte de até 10 mil registros. Não há exclusão manual de logs na interface.
O pacote ZIP contém `system.json`, `events.jsonl`, `manifest.json`, `resumo.html`,
`LEIA-ME.txt` e `SHA256SUMS`. É gerado somente para o administrador autenticado, tem
limite de exportações e nunca é incluído em cache público/service worker. Compartilhe
apenas com suporte autorizado, mesmo sanitizado.

## Persistência e retenção

Logs JSONL ficam em `STORAGE_PATH.parent / logs` (padrão `/data/logs`), dentro do volume
já usado pela aplicação. Um arquivo por serviço (`app`, `worker`, `worker-ocr`), com
rotação diária ou por tamanho: 4 MiB e até 4 cópias, máximo aproximado 20 MiB/serviço.
Retenção de até sete dias, sujeita a rotação anterior por volume. Limpeza ocorre na
escrita/atividade dos processos; com os serviços parados, a limpeza física aguarda
retorno. A consulta não expõe registros expirados. Diretório privado, arquivos 0600
e lock entre processos para evitar corrupção na rotação.

A falha em gravar logs não impede cadastro, cobrança ou matrícula; gera aviso técnico
sanitizado no stderr e estado degradado no processo que detectou a falha. A API não
consegue diagnosticar sua própria indisponibilidade total por HTTP. Para acesso local
pelo operador autorizado, ainda é possível exportar sem iniciar a API:

```sh
# Executar no container app, como o usuário existente da aplicação:
python -m app.diagnostics --output /tmp/diagnostico-escola.zip
```

O arquivo é criado com 0600 e não sobrescreve arquivo existente. Depois de copiar para
análise, remova apenas essa cópia temporária. A exportação não contém dados de alunos
nem substitui backup. Sem banco, o resumo marca banco indisponível e exporta os logs
retidos. Não restaura logs anteriores à instalação desta melhoria.

Os logs nativos do Docker, PostgreSQL, proxy, kernel e host não são importados. Não
seria seguro expor esses arquivos indiscriminadamente pelo navegador. Esta entrega
consolida os eventos instrumentados da aplicação e dos seus workers; a auditoria de
negócio permanece separada e intacta. O Uvicorn da imagem deixa de escrever query
strings no access log: o evento técnico parametrizado substitui essa saída.

## Validação

Testes cobrem ausência de processo, login com processo despublicado/futuro/encerrado,
isolamento de escola, diagnóstico de configuração, autorização do console, filtros,
rotação, falha do armazenamento de logs e ZIP sem informações sensíveis. Os testes
anteriores de 2FA, iframe, matrícula, OCR e integrações permanecem ativos.

O CI inclui `scripts/e2e-diagnostics.py` em Chromium HTTP nativo. O navegador local
pode não autorizar navegação HTTP; nesse caso somente o CI confirma o teste completo.
Não há afirmação de homologação da VPS, credenciais reais ou APIs externas.

Referências de projeto: OWASP Logging Cheat Sheet (campos sensíveis não devem ser
registrados); Starlette Middleware (middleware ASGI sem captura de corpos/stream).
