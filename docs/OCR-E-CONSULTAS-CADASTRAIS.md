# OCR e preenchimento assistido — aplicação da escola

## Arquitetura e implantação

O código continua no mesmo projeto/imagem, mas o OCR executa em **outro processo e
outro serviço, `worker-ocr`**. A API recebe o arquivo, valida tamanho/formato e
registra uma tarefa privada; o worker usa Tesseract (português/inglês) e Poppler.
Não executar Tesseract dentro de requisições FastAPI nem no worker bancário.

Fila persistente no PostgreSQL já existente, com lease, tomada atômica, tentativas
limitadas e descarte de respostas de executores antigos. Não foi acrescentado
RabbitMQ, Redis, proxy, porta pública ou volume adicional. Uma leitura por processo;
reiniciar a aplicação não perde a tarefa. Tempo e memória do processo filho são
limitados, e erro de leitura não impede o cadastro manual.

Os quatro adaptadores Compose (Docker, Dockge, CloudPanel e Portainer) têm agora:
`db`, `storage-init`, `app`, `worker` e `worker-ocr`. **É necessário atualizar o
Compose, além da imagem**, preservando as variáveis e os caminhos de dados locais.
O quinto serviço reutiliza APP_IMAGE, sem necessidade de build na VPS. A base
Python ganha Tesseract/por/eng/Poppler e muda por fingerprint, não a cada edição
visual. O Dockerfile também atende a transição de uma base antiga nos testes de PR.

Recursos padrão do novo serviço: 1 CPU, memória máxima 1 GiB, 64 processos e
encerramento com até 150 s. Esses limites são proteção inicial, não uma medição de
capacidade da VPS. Ajuste OCR_WORKER_CPUS/OCR_WORKER_MEMORY conforme demanda e
memória disponível; os demais containers também consomem recursos.

Migration aditiva: **0015_assisted_intake**, após 0014_mfa. Acrescenta a fila/cache,
configuração e cotas, dados cadastrais da mantenedora/PJ e detalhes privados do
responsável no portal. Não recria pessoas, não altera IDs, documentos ou vínculos.
Faça backup do banco, documentos, .env e APP_SECRET_KEY antes do upgrade. Não use
`down -v` e não troque as chaves da instalação. Nenhum deploy automático na VPS.

## Uso na Secretaria

A barra **Preencher com ajuda** aparece nas fichas de pessoas (Cadastro Único,
alunos, responsáveis, professores, funcionários, fornecedores, prestadores,
clientes e sócios), também no cadastro de nova pessoa dentro do vínculo familiar.

1. Escolha **Ler documento**. Confira quem está sendo preenchido no título.
2. Selecione identidade, certidão, comprovante de endereço, cartão CNPJ ou outro.
3. Fotografe/escolha um arquivo, ou abra a câmera com guia dentro da página. A
   leitura inicia após a fotografia/envio. Frente e verso são leituras separadas;
   girar a imagem permite repetir a leitura com a orientação corrigida.
4. Confira os campos sugeridos e selecione quais utilizar. Valores já digitados
   ficam desmarcados; substituir exige marcá-los explicitamente. Um campo alterado
   durante a conferência não é sobrescrito por uma resposta atrasada.
5. Confirme o destinatário e aplique os dados **ao rascunho**. O Salvar já existente
   da ficha continua sendo o único passo que grava os dados cadastrais.

Em Documentação do aluno, **Ler dados do aluno** reaproveita um arquivo privado já
armazenado; **Ler para responsável** pede a pessoa de destino antes de abrir a
ficha. Não cria vínculo ou papel familiar automaticamente. A análise documental,
a autorização legal/financeira e a efetivação da matrícula continuam explícitas.

## Portal de matrícula e celular

Há leitura/consulta de CEP nos dados do aluno e nos dados do responsável da conta.
Cada anexo recebido oferece **Ler para aluno** ou **Ler para responsável**; o segundo
não modifica o aluno. Os detalhes do responsável são guardados na própria conta;
somente o envio da inscrição gera o snapshot para análise. A aprovação pela
Secretaria usa os dados conferidos para um novo cadastro. Uma edição posterior do
portal não reescreve pessoas oficiais existentes ou inscrições já enviadas.

A cópia temporária de OCR **não substitui o envio do documento obrigatório** na
etapa Documentação. Reaproveitar um anexo usa uma cópia, sem apagar ou alterar o
original. Contas diferentes não consultam tarefas umas das outras, mesmo na mesma
escola. Não há OCR público sem autenticação no formulário de login/registro.

A câmera exige HTTPS e permissão do navegador. Dentro do HUB, o iframe também
precisa delegar a câmera (`allow="camera"`); a aplicação não pode sobrepor um bloqueio
do navegador ou do HUB. A resposta da escola permite câmera somente para sua
própria origem. Microfone/geolocalização continuam desabilitados. Arquivo/câmera do
aparelho é alternativa quando a captura incorporada não estiver disponível. Trilhas
de câmera são encerradas ao cancelar, concluir a fotografia ou sair do componente.

## Formatos, limites e confiança

PDF (até 5 páginas), PNG, JPEG e WebP; padrão 8 MiB por leitura e imagens de até
30 MP. HEIC não é aceito diretamente: use a captura JPEG ou converta no aparelho.
PDF com texto aproveita o texto existente antes de OCR, evitando trabalho
redundante. PDFs criptografados, inválidos e sinais de conteúdo ativo são recusados.
O conteúdo de PDF é interpretado somente no processo filho limitado do worker.

Extratores de campos conservadores reconhecem rótulos e identificadores legíveis:
nome, CPF, nascimento, RG, órgão emissor, filiação, certidão, naturalidade,
nacionalidade, CEP e campos básicos de comprovante/endereço/cartão CNPJ. CPF/CNPJ
são conferidos pelos dígitos verificadores. Vários candidatos distintos não
selecionam silenciosamente o primeiro. O texto completo fica disponível para
conferência quando não existir um campo mapeável.

**Não há garantia de ler todos os campos de qualquer modelo de documento.** Texto
manuscrito, reflexos, desfoque, perspectiva forte e layouts sem rótulos podem exigir
correção manual. A porcentagem indica qualidade média dos caracteres reconhecidos,
não certeza sobre identidade, parentesco, titularidade ou validade do documento.
Não há reconhecimento facial, perícia documental ou consulta de CPF de terceiros.
Nenhum documento é enviado a serviço externo de OCR. Não foram treinados modelos
específicos com documentos reais do colégio nesta entrega.

## Privacidade, retenção e operação

Fonte temporária no armazenamento privado já configurado (local ou S3 compatível).
Resultado textual/campos criptografados com chave derivada de APP_SECRET_KEY,
separada por finalidade das integrações. Rotas autenticadas, isoladas por
escola/dono; fora do cache público e do service worker. Auditoria registra a
solicitação sem copiar texto de documento para os logs.

Padrão de expiração: 24 h. O worker limpa fonte temporária e resultado expirados;
se ficar parado, a limpeza física aguarda seu retorno (a API já nega leitura
expirada). Cancelamento impede aplicação do resultado e antecipa a expiração. Um
arquivo original de matrícula não é removido pela limpeza do OCR.

Limites: 30 solicitações novas/hora/usuário, 3 em processamento por dono, 50 na fila
por escola; 3 tentativas no máximo. Duplicatas idênticas do mesmo dono/finalidade
reaproveitam uma leitura vigente. O painel não bloqueia o Salvar manual enquanto
aguarda OCR. Mensagens de erro não expõem o documento. `worker-ocr` possui healthcheck
real, conferindo motor/idioma e atividade recente do processo.

Variáveis presentes nos arquivos de exemplo:

```dotenv
OCR_MAX_UPLOAD_MB=8
OCR_RETENTION_HOURS=24
OCR_TIMEOUT_SECONDS=120
OCR_WORKER_CPUS=1.0
OCR_WORKER_MEMORY=1g
```

Em **Instituição → OCR e consultas cadastrais**, a administração ativa/desativa as
leituras e as consultas externas separadamente. Desativar OCR suspende novas
solicitações/tomadas da fila, não interrompe um filho que já está executando. As
cotas e o preenchimento manual permanecem; configuração é versionada e auditada.

## CNPJ e CEP: consulta centralizada

CNPJ: BrasilAPI → CNPJ.ws → ReceitaWS. CEP: ViaCEP → BrasilAPI. Consulta por botão,
sem pedir a mesma informação a todos os serviços simultaneamente e sem consultar a
cada caractere. Endereços são fixos no servidor: não se aceita URL fornecida pelo
navegador, nem se segue redirecionamento. As integrações gratuitas não exigem chave.
APIs comerciais autenticadas não foram contratadas nem incluídas automaticamente.

Cache positivo CNPJ 24 h / CEP 30 dias; requisições concorrentes da mesma chave são
coordenadas por lease. Falha em todos os provedores pode usar cache vencido de até
7 dias (CNPJ) ou 90 dias (CEP), **com aviso**, nunca apresentado como atualização.
Resultado inexistente em todos os provedores disponíveis tem cache negativo de
2 minutos. Indisponibilidade/limites não equivalem a CNPJ inexistente.

Intervalo mínimo de 21 s para cada API pública CNPJ.ws/ReceitaWS e 1 s para os
outros conectores nesta implementação; cotas compartilhadas no banco da instalação,
timeouts, corpo limitado e tratamento de Retry-After. HTTP 429 suspende o provedor
por pelo menos 60 s (até 1 h); não há rotação de IP para contornar limites. Outras
aplicações na mesma saída de rede podem consumir o limite externo e gerar 429.

CPF não é enviado a esses provedores. CNPJ alfanumérico não é convertido em outro
número: nesta entrega, consulta somente o adaptador BrasilAPI compatível; os
adaptadores documentados como numéricos são ignorados. Falha mantém o modo manual.

Campos normalizados: CNPJ, razão social, fantasia, endereço, telefone/e-mail,
situação, abertura, natureza jurídica e atividade principal, quando fornecidos.
Quadro societário e payload bruto não são devolvidos. Campos ausentes não são
inventados. CEP não inventa número ou apartamento e não substitui o endereço sem
conferência. O nome de provedor e a data da consulta aparecem junto ao resultado;
essa data **não significa atualização em tempo real na Receita Federal**.

As consultas estão na ficha PJ (tipos comerciais pertinentes), dados da mantenedora,
endereços das fichas pessoais/escola e no portal. Na configuração inicial, o CNPJ
da mantenedora pode ser consultado apenas após informar a chave de implantação,
antes de a instalação ser concluída. Clientes antigos que atualizem somente nome/
documento não apagam os novos campos. Dados podem continuar sendo preenchidos
manualmente em todos os pontos.

## Referências dos contratos consultados

- Tesseract: https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html
- Qualidade: https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html
- ReceitaWS público (cache/3 por minuto): https://www.receitaws.com.br/api
- CNPJ.ws: https://docs.cnpj.ws/referencia-de-api/api-publica/consultando-cnpj
- Limites CNPJ.ws: https://docs.cnpj.ws/referencia-de-api/api-publica/limitacoes
- ViaCEP: https://viacep.com.br/
- BrasilAPI: https://brasilapi.com.br/docs
- Câmera: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

## Validação e escopo dos testes

Testes de backend cobrem normalização/cache/fallback/limites, isolamento, cancelamento,
expiração, lease/tentativas, dados da mantenedora, snapshots do portal, PDF com texto
sem OCR e Tesseract real sobre imagem sintética. O CI executa PostgreSQL real,
regressões anteriores, navegador via HTTP e Docker com os cinco serviços.
O teste de consultas utiliza cache/HTTP simulado: **não é homologação das APIs
públicas de produção**. O teste de câmera usa o dispositivo sintético do Chromium;
não valida modelos físicos de celulares nem a permissão configurada no HUB real.
Inspeção local em harness não substitui cookies/HTTPS/CSP do navegador real.
Use os checks da revisão publicada como evidência conclusiva; não há deploy,
merge ou release automática nesta PR.
