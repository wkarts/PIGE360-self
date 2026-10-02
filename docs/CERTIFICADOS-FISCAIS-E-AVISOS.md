# Certificados A1, avisos e reserva da estrutura fiscal

O A1 é cadastrado em **Configurações → Certificados A1**. A tela mantém exclusivamente cadastro, validade, substituição, desativação e preferências de avisos. A assinatura dos documentos escolares fica em **Documentação → Assinaturas pendentes**; os PDFs devolvidos pelas famílias ficam em **Conferência de assinaturas**. O arquivo PFX/P12 e a senha continuam criptografados pela chave de integração da instalação. Nenhuma chave privada é entregue ao navegador ou registrada nos logs.

## Assinatura fiscal

A interface fiscal foi retirada, conforme a decisão de aguardar a especificação completa da emissão. O backend e seus registros foram preservados para evolução futura. Os contratos técnicos abaixo descrevem essa estrutura existente; não representam um menu disponível nem emissão/autorização de nota fiscal.

| Perfil | Elemento assinado | Versão aceita | Restrição |
| --- | --- | --- | --- |
| NF-e | `infNFe` | 4.00, modelo 55 | CNPJ numérico idêntico ao da mantenedora e do A1 |
| NFC-e | `infNFe` | 4.00, modelo 65 | CNPJ numérico idêntico ao da mantenedora e do A1 |
| NFS-e por DPS nacional | `infDPS` | 1.01 e 1.00 legado | CNPJ numérico do prestador; XML DPS unitário |

O recurso assina XMLDSig, com assinatura enveloped, canonicalização C14N 1.0 inclusiva sem comentários, RSA-SHA1/digest SHA1 em NF-e, NFC-e e DPS 1.00. O perfil DPS 1.01 usa RSA-SHA256/digest SHA256, compatíveis com o schema XMLDSig W3C distribuído no pacote oficial. A estrutura da assinatura de cada versão de DPS é validada contra o respectivo XSD oficial versionado. SHA-256 continua usado para integridade dos arquivos e identificação do certificado. O cliente não escolhe algoritmos nem URIs de referência. A referência é fixada ao único `Id` fiscal verificado.

Há validação da identidade, namespace, versão, modelo, chave de acesso da NF-e, unicidade do identificador e estrutura da assinatura. O XML não passa por validação fiscal completa de XSD, tributos ou regras de negócio. A resposta informa `schema_validation=signing_profile_only`, `authorization_status=not_submitted` e `revocation_checked=false`.

**Não há transmissão, autorização, emissão de DANFE, cancelamento fiscal ou numeração automática nesta função.** Um XML assinado não equivale a uma nota autorizada. A DPS é o documento enviado ao ambiente nacional para que ele gere a NFS-e; a aplicação não fabrica uma NFS-e autorizada. CNPJ alfanumérico, RPS/ABRASF e outros leiautes municipais não são aceitos por estes perfis. Novos perfis exigem especificação oficial e teste de homologação próprio. Nenhum teste foi feito com credenciais reais da escola ou nos ambientes fiscais de produção.

O A1 precisa estar válido, conter chave RSA de pelo menos 2048 bits, extensão de uso com assinatura digital e cadeia verificável pelas âncoras de confiança instaladas. A cadeia é validada offline antes de cada assinatura. Certificados de autoridade certificadora são recusados. A decisão final do serviço fiscal também exige validação de revogação; a validação local não promete essa consulta. XMLs com DTD, entidades, instruções de processamento, IDs repetidos, envelopes e assinaturas existentes são recusados. O parser não busca recursos externos e limita entrada a 2 MB.

O endpoint genérico de download restringe arquivos `fiscal_xml` a direção e administração, além do isolamento por escola. A verificação SHA-256 do armazenamento permanece aplicada. XMLs originais e assinados ficam no histórico; desativar ou rotacionar o A1 não modifica esses arquivos.

## Avisos de vencimento

O aviso discreto na aplicação aparece para direção/administração a partir de 30 dias do vencimento. A data exata do vencimento é retornada, e a assinatura expirada permanece bloqueada. Cada usuário elegível pode ativar seus próprios avisos por e-mail e WhatsApp; ambos começam desativados. O e-mail vem da conta do usuário. O WhatsApp vem de **Meu perfil**, com DDI 55 e DDD, e exige aceite explícito nas preferências. Não é possível configurar destinatários arbitrários nesse formulário.

O worker usa a fila persistente existente. Os marcos são 30, 15, 7 e 1 dia, além de vencido. Ao iniciar com um certificado próximo do vencimento, ele agenda somente o marco atual, sem enviar todos os anteriores. A chave de deduplicação inclui preferência, impressão digital, marco e canal; rodar o worker novamente não cria outro envio do mesmo marco. Antes de enviar, ele confere novamente a existência e validade do acesso, o consentimento, a instituição ativa e se o certificado continua sendo o mesmo. Rotação ou desativação cancela o envio antigo por precondição. Mensagens de marcos já ultrapassados também são canceladas.

SMTP e WhatsApp usam as configurações, clientes TLS e regras de incerteza já existentes. Uma falha de configuração ou entrega fica registrada no job, sem expor credenciais. Um resultado remoto incerto não é reenviado automaticamente. O administrador deve investigar a fila antes de uma tentativa manual; SMTP não fornece garantia de entrega exatamente uma vez.

## Contratos de integração e manutenção

- `GET /api/v1/schools/{school_id}/signing-certificate/alerts`: avisos internos sem efeitos externos.
- `GET|PUT /api/v1/schools/{school_id}/signing-certificate/alert-preferences`: preferências do usuário autenticado, com verificação de perfil e escola.
- `GET|POST /api/v1/schools/{school_id}/fiscal-signatures`: perfis/histórico paginado e assinatura multipart (`file`, `profile`, `consent`).
- `schedule_certificate_alerts(db)`: execução periódica transacional no worker.
- `execute_certificate_alert(db, job, payload, send_email)`: entrega com precondições verificadas novamente.
- Migração `0028_fiscal_certificate_alerts`: somente novas tabelas de assinaturas e preferências; sem alteração destrutiva dos certificados existentes.

## Fontes oficiais consultadas

- [MOC 7.0 NF-e/NFC-e, seções 4.2.4 e 4.2.5](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf).
- [Manual integrado do Sistema Nacional NFS-e 1.00.02, seção 6.1.4](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/manualintegradosnnfse_v1-00-02-producao.pdf).
- [Guia de APIs do contribuinte, outubro/2025](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf): separação DPS, validação e geração da NFS-e.
- [Esquemas oficiais DPS 1.00/1.01 de 09/02/2026](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/nfse-esquemas_xsd-v1-01-20260209.zip): os arquivos de assinatura foram extraídos preservando a estrutura XML, com normalização de finais de linha e espaços ao fim de linha. Procedência e hashes em `backend/app/fiscal_schemas/provenance.json`. O esquema 1.00 fixa RSA-SHA1; o 1.01 distribui XMLDSig W3C sem algoritmo fixo. Essa compatibilidade de esquema não afirma homologação no serviço externo.
- [Documentação atual nacional](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual): versões atuais devem ser tratadas por perfil próprio; não presumir compatibilidade com 1.00.
- [lxml 6.1.0](https://lxml.de/6.1/changes-6.1.0.html) e [API de parsing/canonicalização](https://lxml.de/apidoc/lxml.etree.html).

Os testes usam exclusivamente uma cadeia sintética (AC autoassinada e certificado A1 de usuário final) e XMLs sintéticos, sem valor fiscal. Cobrem assinatura e adulteração, chave/uso/validade, isolamento, permissões de download, idempotência, recusa de entidades externas e avisos com transporte simulado.
