# Assinaturas digitais

O menu **Assinaturas** reúne o certificado da escola, os documentos emitidos que aguardam assinatura e a conferência dos contratos recebidos. O certificado A1 da mantenedora é configurado em PFX/P12; chave e senha ficam criptografadas no servidor com `INTEGRATION_ENCRYPTION_KEY`, sem retorno pela API. A configuração exige certificado vigente, CNPJ correspondente e cadeia de confiança instalada em `SIGNATURE_TRUST_ROOTS_DIR`.

## Documentos da escola

Direção e administração podem conferir e assinar os PDFs emitidos com o A1 configurado. A operação preserva os bytes originais e cria uma revisão incremental verificável. Repetir a mesma operação retorna o documento já assinado. A troca ou desativação do certificado não altera documentos anteriores.

## Contrato do responsável

O portal apresenta três métodos:

- **A1:** o responsável seleciona o PFX/P12, informa a senha e autoriza a assinatura. O servidor confere vigência e CPF do certificado contra o responsável financeiro. O arquivo e a senha são usados somente na requisição; não são salvos no banco nem como arquivo. O PDF assinado volta diretamente para a escola.
- **GOV.BR com integração habilitada:** uma janela oficial autentica e solicita consentimento; o documento assinado retorna automaticamente ao portal.
- **GOV.BR sem integração / A3:** baixar o PDF, assinar no serviço oficial ou no assinador que acessa o token A3, enviar o PDF assinado. O navegador não controla um token/cartão A3 diretamente. Não é criado ou exigido um aplicativo nativo do PIGE360.

O recebimento do PDF não efetiva a matrícula. Permanecem as verificações de integridade, identidade e relatório do VALIDAR/ITI previstas pelo fluxo da escola.

## Habilitação oficial GOV.BR

A API de assinatura exige credenciais próprias aprovadas para o serviço público, integração prévia com Login Único e domínio elegível. Uma escola privada sem essa aprovação pode utilizar o assinador público, mas não recebe automaticamente acesso à API. Não há incorporação por iframe, captura de senha GOV.BR ou supressão da tela de consentimento.

Configure os valores fornecidos na homologação:

```dotenv
GOVBR_SIGNATURE_ENABLED=true
GOVBR_PUBLIC_SERVICE_APPROVED=true
GOVBR_LOGIN_UNICO_READY=true
GOVBR_LOGIN_CLIENT_ID=
GOVBR_LOGIN_CLIENT_SECRET=
GOVBR_LOGIN_BASE_URL=https://sso.staging.acesso.gov.br
GOVBR_SIGNATURE_CLIENT_ID=
GOVBR_SIGNATURE_CLIENT_SECRET=
GOVBR_SIGNATURE_REDIRECT_URI=https://DOMINIO-DA-ESCOLA/api/v1/portal/signing/govbr/callback
GOVBR_SIGNATURE_OAUTH_BASE_URL=https://cas.staging.iti.br/oauth2.0
GOVBR_SIGNATURE_API_BASE_URL=https://assinatura-api.staging.iti.br
```

Registre o callback acima em ambos os serviços. Registre também a URL de logout `https://DOMINIO-DA-ESCOLA/online.html`. Em produção, utilize somente os endpoints e credenciais oficiais liberados para esse ambiente. `APP_URL` deve coincidir com o domínio HTTPS cadastrado. O resultado da assinatura oferece saída da conta GOV.BR; sair do portal após usar essa integração também encerra a sessão no provedor.

O fluxo verifica PKCE/S256, assinatura RS256 do ID token com a JWK oficial, emissor, audiência, prazo, nonce, CPF e nível prata/ouro. O cookie principal do portal permanece SameSite=Strict; o retorno oficial utiliza um cookie HttpOnly/Lax de dez minutos, limitado ao caminho de assinatura e vinculado à sessão do portal ativa. O estado é consumido uma vez, vinculado à sessão autenticada do portal, matrícula, responsável e hash do PDF, com validade de dez minutos. O token de assinatura é usado uma única vez e não é persistido. Autorizações expiradas ou repetidas não assinam. O retorno remove `code` e `state` da URL antes de exibir o resultado.

Na infraestrutura HTTP, não registre query strings do callback nem corpos das requisições de certificados ou de tokens. O inicializador padrão da aplicação desativa o access log do Uvicorn; o proxy da implantação deve manter o mesmo cuidado.

## Validação e limites

Testes locais usam certificados sintéticos, chaves efêmeras e respostas oficiais simuladas para verificar integridade, identidade, PKCE e consumo único. Isso não equivale à homologação de credenciais GOV.BR nem à validação de um dispositivo A3 real. O suporte A3 nesta entrega é o recebimento e a verificação do PDF assinado externamente.

Referências oficiais consultadas em 01/10/2026:

- [Roteiro de integração da assinatura GOV.BR](https://manual-integracao-assinatura-eletronica.servicos.gov.br/pt-br/latest/iniciarintegracao.html)
- [Roteiro de integração do Login Único](https://acesso.gov.br/roteiro-tecnico/iniciarintegracao.html)
- [Serviço público de assinatura eletrônica](https://www.gov.br/pt-br/servicos/assinatura-eletronica)
