# Assinatura GOV.BR no PIGE360 Self

O fluxo padrão é: a escola emite e assina o PDF com seu certificado A1; o
responsável baixa o PDF, assina no portal oficial GOV.BR e envia de volta o PDF
assinado. A aplicação verifica criptograficamente as duas assinaturas e mantém
revisões com hash, sem marcar a matrícula como concluída antes da conferência.

O módulo `backend/app/govbr_signing.py` implementa o protocolo da API oficial
para uso futuro por uma instalação que tenha credenciais próprias liberadas.
**Ele não expõe botão, rota de autorização nem callback na aplicação.** A
simples existência do módulo não afirma que uma escola privada, um domínio
qualquer ou a instalação self-hosted tenham acesso à API.

## Condições reais para habilitar a integração direta

- O órgão/serviço público deve ter credenciais próprias de homologação e
  produção solicitadas por seu Gestor Público, além de domínio oficial
  habilitado e integração prévia com o Login Único GOV.BR.
- O responsável deve autenticar no Login Único e satisfazer o nível de conta
  exigido (prata/ouro), concedendo o consentimento específico da assinatura.
- A aplicação deve persistir `state`/`nonce` aleatórios e de uso único,
  vinculados ao CPF validado no Login Único, responsável, matrícula, revisão
  exata do PDF e expiração curta; o callback deve comparar `state` em tempo
  constante e consumi-lo atomicamente antes da troca do `code`.
- A revisão assinada precisa ser incorporada como PKCS#7 nos intervalos
  `/ByteRange` do PDF, validada, registrada de forma idempotente e conferida
  quanto à identidade do responsável. O token de `scope=sign` autoriza um hash
  apenas e deve ser descartado após o uso, inclusive nas falhas.
- Uma integração habilitada deve ser homologada com credenciais de teste,
  conta Bronze e Prata/Ouro, além do validador do ITI. Não há homologação
  realizada neste pacote.

## Configuração do adaptador interno

`GOVBR_SIGNATURE_ENABLED`, `GOVBR_PUBLIC_SERVICE_APPROVED` e
`GOVBR_LOGIN_UNICO_READY` ficam ausentes/falsos por padrão. Se uma instituição
elegível obtiver credenciais e desenvolver o callback autenticado, precisará
configurar os três como `true` e ainda informar:

```text
GOVBR_SIGNATURE_CLIENT_ID=
GOVBR_SIGNATURE_CLIENT_SECRET=
GOVBR_SIGNATURE_REDIRECT_URI=https://dominio-oficial/retorno-homologado
GOVBR_SIGNATURE_OAUTH_BASE_URL=https://cas.staging.iti.br/oauth2.0
GOVBR_SIGNATURE_API_BASE_URL=https://assinatura-api.staging.iti.br
```

As URLs acima são **de homologação**; para produção use apenas URLs e
credenciais fornecidas oficialmente à instituição. A configuração, por si só,
não liga o fluxo no portal. Não inserir segredos no repositório ou logs.

## Referência primária

- [Manual oficial de integração da API de Assinatura Eletrônica GOV.BR](https://manual-integracao-assinatura-eletronica.servicos.gov.br/pt-br/latest/iniciarintegracao.html).
- [Solicitação oficial da integração](https://www.gov.br/governodigital/pt-br/estrategias-e-governanca-digital/transformacao-digital/servico-de-integracao-aos-produtos-de-identidade-digital-gov.br).
